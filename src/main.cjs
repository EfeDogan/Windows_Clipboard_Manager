const { app, BrowserWindow, Tray, Menu, nativeImage, screen, clipboard, ClipboardItem, ipcMain, globalShortcut, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { parseFileList, normalizeFileList } = require('./file-references.cjs');
const { History, fingerprint, MAX_ITEM_BYTES } = require('./history.cjs');
const smoke = process.argv.includes('--smoke-test');
if (smoke) app.setPath('userData', path.join(require('node:os').tmpdir(), `pano-smoke-${process.pid}`));

let panel, tray, history, timer, lastHash = '', activeId = null, busy = false;
let status = '', shortcutReady = false, quitting = false, clipboardEpoch = 0;
const icon = path.join(__dirname, '../assets/tray.png');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => panel && showPanel());
  app.whenReady().then(start).catch(error => { console.error(error); app.exit(1); });
}

function state() {
  return {
    entries: history.entries.map(({ content, hash, ...e }) => ({ ...e, text: e.kind === 'text' ? content : undefined, paths: e.kind === 'files' ? parseFileList(content).map(file => file.path) : undefined })),
    settings: history.settings, activeId, status: status || (!shortcutReady ? 'Ctrl+Shift+V başka bir uygulama tarafından kullanılıyor. Paneli tray simgesinden açabilirsiniz.' : ''), shortcutReady,
    windows: process.platform === 'win32'
  };
}
function broadcast() { if (panel && !panel.isDestroyed()) panel.webContents.send('changed', state()); }
function updateTray() {
  tray.setToolTip(`Clipboard Manager${history.settings.paused ? ' · Gizli kip' : ''}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Panoyu aç', click: showPanel },
    { label: 'Gizli kip', type: 'checkbox', checked: history.settings.paused, click: () => { action('pause').catch(error => { status = error.message; broadcast(); }); } },
    { type: 'separator' },
    { label: 'Çıkış', click: () => { quitting = true; app.quit(); } }
  ]));
}
function showPanel() {
  const bounds = tray.getBounds();
  const anchor = bounds.width ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 } : screen.getCursorScreenPoint();
  const area = screen.getDisplayNearestPoint({ x: Math.round(anchor.x), y: Math.round(anchor.y) }).workArea;
  const width = Math.min(434, area.width - 16), height = Math.min(670, area.height - 16);
  const x = Math.round(Math.max(area.x + 8, Math.min(anchor.x - width / 2, area.x + area.width - width - 8)));
  const y = Math.round(anchor.y < area.y + area.height / 2 ? area.y + 8 : area.y + area.height - height - 8);
  panel.setBounds({ x, y, width, height });
  panel.show(); panel.focus(); panel.webContents.send('opened');
}
async function readClipboard() {
  const items = await clipboard.read();
  // File-manager copies may also provide text or a bitmap. Preserve file-copy
  // semantics by checking references before those alternate representations.
  for (const item of items) {
    if (!item.types.includes('text/uri-list')) continue;
    const blob = await item.getType('text/uri-list');
    if (blob.size > MAX_ITEM_BYTES) throw new Error('Dosya listesi çok büyük.');
    const content = normalizeFileList(await blob.text());
    if (content) return { kind: 'files', content };
  }
  // Screenshots often also carry text/HTML. Prefer their full image payload.
  for (const item of items) {
    const mime = item.types.find(t => ['image/png', 'image/jpeg', 'image/bmp', 'image/webp'].includes(t));
    if (mime) {
      const blob = await item.getType(mime);
      if (blob.size > MAX_ITEM_BYTES * 0.74) throw new Error('10 MB üzerindeki görsel geçmişe alınmadı.');
      const image = nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()));
      if (!image.isEmpty()) {
        const png = image.toPNG();
        const content = png.toString('base64');
        if (Buffer.byteLength(content) > MAX_ITEM_BYTES) throw new Error('10 MB üzerindeki görsel geçmişe alınmadı.');
        const dimensions = image.getSize();
        const scale = Math.min(160 / dimensions.width, 100 / dimensions.height, 1);
        return { kind: 'image', content, thumbnail: image.resize({ width: Math.max(1, Math.round(dimensions.width * scale)), height: Math.max(1, Math.round(dimensions.height * scale)), quality: 'good' }).toDataURL() };
      }
    }
  }
  const content = await clipboard.readText();
  if (Buffer.byteLength(content) > MAX_ITEM_BYTES) throw new Error('10 MB üzerindeki metin geçmişe alınmadı.');
  return content.trim() ? { kind: 'text', content } : null;
}
async function fileThumbnail(filePath, width = 160) {
  try {
    const info = await fs.stat(filePath);
    if (!info.isFile()) return undefined;
    let image;
    if (process.platform === 'win32' || process.platform === 'darwin') {
      let timeout;
      try {
        image = await Promise.race([
          nativeImage.createThumbnailFromPath(filePath, { width, height: width }),
          new Promise(resolve => { timeout = setTimeout(() => resolve(null), 2000); })
        ]);
      } finally { clearTimeout(timeout); }
    }
    // This also supplies image previews where no document thumbnail provider
    // exists. Avoid synchronously decoding very large or arbitrary documents.
    if ((!image || image.isEmpty()) && /\.(png|jpe?g|bmp|webp|gif)$/i.test(filePath) && info.size <= MAX_ITEM_BYTES) image = nativeImage.createFromBuffer(await fs.readFile(filePath));
    if (!image || image.isEmpty()) return undefined;
    const dimensions = image.getSize();
    const scale = Math.min(width / dimensions.width, width / dimensions.height, 1);
    return image.resize({ width: Math.max(1, Math.round(dimensions.width * scale)), height: Math.max(1, Math.round(dimensions.height * scale)), quality: 'good' }).toDataURL();
  } catch { return undefined; } // Unavailable previews must never hide a file entry.
}
async function poll() {
  if (busy) return;
  busy = true;
  const epoch = clipboardEpoch;
  const pausedAtStart = history.settings.paused;
  try {
    const entry = await readClipboard();
    if (epoch !== clipboardEpoch) return;
    if (!entry) { lastHash = ''; return; }
    const hash = fingerprint(entry.kind, entry.content);
    if (hash === lastHash) return;
    // Observe while paused so private copies don't enter history on resume.
    if (pausedAtStart || history.settings.paused) { lastHash = hash; return; }
    if (entry.kind === 'files' && !history.entries.some(e => e.hash === hash)) entry.thumbnail = await fileThumbnail(parseFileList(entry.content)[0].path);
    if (epoch !== clipboardEpoch || history.settings.paused) return;
    const added = history.add(entry.kind, entry.content, entry.thumbnail);
    lastHash = hash;
    activeId = added?.id || null;
    status = ''; broadcast();
  } catch (error) {
    const message = `Pano okunamadı: ${error.message}`;
    if (status !== message) { status = message; broadcast(); }
  } finally { busy = false; }
}
async function action(name, payload = {}) {
  switch (name) {
    case 'copy': {
      clipboardEpoch++;
      const entry = history.get(payload.id);
      if (entry.kind === 'text') await clipboard.writeText(entry.content);
      else if (entry.kind === 'files') {
        const files = parseFileList(entry.content);
        if (!files.length) throw new Error('Dosya listesi geçersiz.');
        for (const file of files) {
          try { await fs.access(file.path); }
          catch { throw new Error(`Dosya artık bu konumda bulunamıyor: ${file.path}`); }
        }
        await clipboard.write([new ClipboardItem({ 'text/uri-list': files.map(file => file.uri).join('\r\n') })]);
      } else await clipboard.write([new ClipboardItem({ 'image/png': new Blob([Buffer.from(entry.content, 'base64')], { type: 'image/png' }) })]);
      lastHash = entry.hash; activeId = entry.id;
      panel.hide(); break;
    }
    case 'pin': history.pin(payload.id); break;
    case 'remove': history.remove(payload.id); break;
    case 'edit': history.edit(payload.id, payload.text); break;
    case 'preview': {
      const e = history.get(payload.id);
      if (e.kind === 'files') {
        const files = parseFileList(e.content);
        return { ok: true, entry: { kind: 'files', paths: files.map(file => file.path), thumbnail: await fileThumbnail(files[0].path, 800) || e.thumbnail } };
      }
      return { ok: true, entry: { kind: e.kind, content: e.content } };
    }
    case 'pause': {
      clipboardEpoch++;
      // Capture the current fingerprint before changing modes, including a copy
      // that arrived between the last poll and the user's click.
      const current = await readClipboard().catch(() => null);
      lastHash = current ? fingerprint(current.kind, current.content) : '';
      history.settings.paused = !history.settings.paused; history.save(); updateTray(); break;
    }
    case 'clear': history.clear(payload.includePinned === true); activeId = null; break;
    case 'settings': {
      if (![50, 100, 200, 500].includes(payload.limit)) throw new Error('Geçersiz geçmiş sınırı.');
      if (typeof payload.launchAtLogin !== 'boolean') throw new Error('Geçersiz başlangıç ayarı.');
      if (process.platform === 'win32' && history.settings.launchAtLogin !== payload.launchAtLogin) app.setLoginItemSettings({ openAtLogin: payload.launchAtLogin, path: process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe') });
      history.settings.limit = payload.limit;
      history.settings.launchAtLogin = payload.launchAtLogin;
      history.trim(); history.save(); break;
    }
    case 'folder': await shell.openPath(app.getPath('userData')); break;
    case 'hide': panel.hide(); break;
    default: throw new Error('Bilinmeyen işlem.');
  }
  broadcast(); return { ok: true, state: state() };
}
async function start() {
  app.setAppUserModelId('com.efedogan.clipboardmanager');
  history = new History(app.getPath('userData'));
  status = history.loadError || '';
  panel = new BrowserWindow({ width: 434, height: 670, show: false, frame: false, resizable: false, maximizable: false, minimizable: false, skipTaskbar: true, alwaysOnTop: true, backgroundColor: '#353638', icon, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  panel.setMenu(null);
  if (smoke) {
    panel.webContents.on('console-message', event => console.log('RENDERER:', event.message));
    panel.webContents.on('preload-error', (_event, _file, error) => console.error('PRELOAD:', error));
  }
  panel.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  panel.webContents.on('will-navigate', event => event.preventDefault());
  panel.on('close', event => { if (!quitting) { event.preventDefault(); panel.hide(); } });
  panel.on('blur', () => { if (!smoke) panel.hide(); });
  ipcMain.handle('state', event => { if (event.sender !== panel.webContents) throw new Error('Yetkisiz pencere'); return state(); });
  ipcMain.handle('action', async (event, name, payload) => {
    if (event.sender !== panel.webContents) throw new Error('Yetkisiz pencere');
    try { return await action(name, payload); } catch (error) { return { ok: false, error: error.message }; }
  });
  tray = new Tray(icon); updateTray();
  tray.on('click', () => panel.isVisible() ? panel.hide() : showPanel());
  shortcutReady = globalShortcut.register(history.settings.shortcut, () => panel.isVisible() ? panel.hide() : showPanel());
  if (!shortcutReady) status = 'Ctrl+Shift+V başka bir uygulama tarafından kullanılıyor. Paneli tray simgesinden açabilirsiniz.';
  await panel.loadFile(path.join(__dirname, 'index.html'));
  if (smoke) await require('../test/smoke.cjs')({ app, panel, history, clipboard, ClipboardItem, poll, action, showPanel, state });
  else { await poll(); timer = setInterval(poll, 700); }
}
app.on('window-all-closed', () => {});
app.on('before-quit', () => { quitting = true; clearInterval(timer); globalShortcut.unregisterAll(); tray?.destroy(); });
