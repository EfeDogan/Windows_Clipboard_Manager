const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { normalizeFileList } = require('../src/file-references.cjs');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(condition) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await wait(50);
  }
  throw new Error('Arayüz beklenen duruma geçmedi.');
}
module.exports = async ({ app, panel, history, clipboard, ClipboardItem, poll, action, showPanel, state }) => {
  const directory = app.getPath('userData');
  try {
    await clipboard.writeText('Smoke test: Türkçe metin ıİğş'); await poll();
    assert.equal(history.entries[0].content, 'Smoke test: Türkçe metin ıİğş');
    await action('pause'); await clipboard.writeText('gizli parola'); await poll(); await action('pause'); await poll();
    assert.equal(history.entries.length, 1, 'Gizli kipteki metin saklanmamalı');
    await action('pause'); await clipboard.writeText('iki tarama arasında gizli'); await action('pause'); await poll();
    assert.equal(history.entries.length, 1, 'Tarama yapılmadan kip kapansa da gizli metin saklanmamalı');
    const png = fs.readFileSync(path.join(__dirname, '../assets/icon.png'));
    await clipboard.write([new ClipboardItem({ 'image/png': new Blob([png], { type: 'image/png' }) })]); await poll();
    const image = history.entries[0]; assert.equal(image.kind, 'image');
    await clipboard.writeText('başka metin'); await poll();
    const originalOrder = history.entries.map(e => e.id);
    await action('copy', { id: image.id });
    await poll();
    assert.deepEqual(history.entries.map(e => e.id), originalOrder, 'Geçmişten seçmek sıralamayı değiştirmemeli');
    assert.ok(await clipboard.has('image/png'), 'Görsel tekrar panoya yazılmalı');
    const text = history.entries.find(e => e.kind === 'text');
    await action('copy', { id: text.id }); assert.equal(await clipboard.readText(), text.content);
    await action('edit', { id: text.id, text: 'düzenlenmiş metin' });
    await action('copy', { id: text.id }); assert.equal(await clipboard.readText(), 'düzenlenmiş metin');
    const imagePath = path.join(directory, 'Resim ğ #1.png');
    const documentPath = path.join(directory, 'Rapor ğ #1.txt');
    fs.writeFileSync(imagePath, png); fs.writeFileSync(documentPath, 'Belge kopyalama testi');
    const imageURI = pathToFileURL(imagePath).href;
    const documentURI = pathToFileURL(documentPath).href;
    await clipboard.write([new ClipboardItem({ 'text/uri-list': imageURI, 'text/plain': imagePath, 'image/png': new Blob([png], { type: 'image/png' }) })]); await poll();
    const imageFile = history.entries[0];
    assert.equal(imageFile.kind, 'files', 'Resim dosyası ekran görüntüsü veya düz metin olarak kaydedilmemeli');
    assert.equal(imageFile.content, imageURI);
    assert.ok(imageFile.thumbnail?.startsWith('data:image/png;base64,'), 'Resim dosyası küçük ön izlemeli olmalı');
    await clipboard.write([new ClipboardItem({ 'text/uri-list': documentURI })]); await poll();
    const documentFile = history.entries[0]; assert.equal(documentFile.kind, 'files');
    const orderBeforeFileCopy = history.entries.map(e => e.id);
    await action('copy', { id: imageFile.id }); await poll();
    const copiedItems = await clipboard.read();
    const copiedFile = copiedItems.find(item => item.types.includes('text/uri-list'));
    assert.ok(copiedFile, 'Dosya başvurusu tekrar panoya yazılmalı');
    assert.equal(normalizeFileList(await (await copiedFile.getType('text/uri-list')).text()), imageURI);
    assert.deepEqual(history.entries.map(e => e.id), orderBeforeFileCopy);
    assert.equal(state().activeId, imageFile.id, 'Seçim dairesi dosya kaydını izlemeli');
    const groupURI = `${imageURI}\r\n${documentURI}`;
    await clipboard.write([new ClipboardItem({ 'text/uri-list': groupURI })]); await poll();
    const group = history.entries[0]; assert.equal(group.kind, 'files');
    assert.deepEqual(state().entries[0].paths, [imagePath, documentPath]);
    await action('copy', { id: group.id });
    const groupItems = await clipboard.read();
    assert.equal(normalizeFileList(await (await groupItems.find(item => item.types.includes('text/uri-list')).getType('text/uri-list')).text()), groupURI);
    await action('pause'); await clipboard.write([new ClipboardItem({ 'text/uri-list': pathToFileURL(path.join(directory, 'gizli.docx')).href })]); await action('pause'); await poll();
    assert.ok(!history.entries.some(e => e.content.includes('gizli.docx')), 'Gizli dosya başvuruları kaydedilmemeli');
    await clipboard.writeText('korunacak pano');
    fs.unlinkSync(documentPath);
    await assert.rejects(action('copy', { id: documentFile.id }), /Dosya artık/);
    assert.equal(await clipboard.readText(), 'korunacak pano', 'Eksik dosya panonun üzerine yazmamalı');
    fs.writeFileSync(documentPath, 'Belge kopyalama testi');
    // Fixture data exists only in this disposable smoke-test profile.
    history.clear(true);
    for (const text of ['b2230760523', 'https://x.com/', 'majachflynn', '1907emir', 'https://mail.google.com/mail/', 'https://www.youtube.com/', 'https://piazza.com/class/mu42…', 'https://github.com/EfeDogan', 'XA7MA7']) history.add('text', text);
    history.add('image', image.content, image.thumbnail);
    const fileFixture = history.add('files', imageFile.content, imageFile.thumbnail);
    history.add('files', documentFile.content, documentFile.thumbnail);
    history.add('text', 'Hello from Palo Alto Networks…');
    await action('pin', { id: history.entries[0].id });
    showPanel(); await wait(500);
    await panel.webContents.executeJavaScript('window.pano.state().then(s => { model = s; render(); })');
    assert.equal(await panel.webContents.executeJavaScript('document.querySelectorAll(".entry").length'), 13);
    await panel.webContents.executeJavaScript('document.querySelector("#search-input").value="github"; document.querySelector("#search-input").dispatchEvent(new Event("input"));');
    assert.equal(await panel.webContents.executeJavaScript('document.querySelectorAll(".entry").length'), 1);
    await panel.webContents.executeJavaScript('document.querySelector("#search-input").value=""; document.querySelector("#search-input").dispatchEvent(new Event("input")); document.querySelector("#settings").click();');
    assert.equal(await panel.webContents.executeJavaScript('document.querySelector("#modal").open'), true);
    await panel.webContents.executeJavaScript('document.querySelector("#modal").close(); document.querySelector(".entry .entry-tools button").click();');
    assert.equal(await panel.webContents.executeJavaScript('document.querySelector("#modal-body textarea").value'), 'Hello from Palo Alto Networks…');
    await panel.webContents.executeJavaScript('document.querySelector("#modal").close(); document.querySelector("#search-input").value="Rapor ğ"; document.querySelector("#search-input").dispatchEvent(new Event("input"));');
    assert.equal(await panel.webContents.executeJavaScript('document.querySelectorAll(".entry").length'), 1, 'Dosya yolları aranabilmeli');
    await panel.webContents.executeJavaScript('document.querySelector(".entry .entry-tools button").click();');
    await waitFor(() => panel.webContents.executeJavaScript('document.querySelector("#modal").open && document.querySelector("#modal-title").textContent === "Dosya ön izlemesi"'));
    assert.equal(await panel.webContents.executeJavaScript('document.querySelector("#modal-title").textContent'), 'Dosya ön izlemesi');
    assert.ok((await panel.webContents.executeJavaScript('document.querySelector("#modal-body").textContent')).includes(documentPath));
    await panel.webContents.executeJavaScript('document.querySelector("#modal").close(); document.querySelector("#search-input").value=""; document.querySelector("#search-input").dispatchEvent(new Event("input"));');
    const uiOrder = await panel.webContents.executeJavaScript('[...document.querySelectorAll(".entry")].map(e => e.dataset.id)');
    await panel.webContents.executeJavaScript(`document.querySelector('[data-id="${fileFixture.id}"] .entry-copy').click();`);
    await waitFor(() => state().activeId === fileFixture.id); await poll(); showPanel();
    await waitFor(() => panel.webContents.executeJavaScript(`document.querySelector('.entry.active')?.dataset.id === '${fileFixture.id}'`));
    assert.deepEqual(await panel.webContents.executeJavaScript('[...document.querySelectorAll(".entry")].map(e => e.dataset.id)'), uiOrder, 'Arayüzde seçilen dosya yerinde kalmalı');
    assert.equal(await panel.webContents.executeJavaScript('document.querySelector(".entry.active").dataset.id'), fileFixture.id);
    await panel.webContents.executeJavaScript('document.querySelector("#modal").close(); document.querySelector("#search-input").focus();');
    const output = path.join(__dirname, '../test-output'); fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'panel.png'), (await panel.webContents.capturePage()).toPNG());
    assert.equal(state().settings.paused, false);
    console.log('SMOKE PASS: native text/image/file clipboard, multi-file restore, private files, missing files, stable ordering, file previews/search, active marker, settings');
  } catch (error) { console.error('SMOKE FAIL:', error); process.exitCode = 1; }
  finally {
    // Windows can keep Chromium profile files locked until the app exits.
    try { fs.rmSync(directory, { recursive: true, force: true }); } catch { console.warn('Temporary smoke profile will remain in the system temp directory.'); }
    app.exit(process.exitCode || 0);
  }
};
