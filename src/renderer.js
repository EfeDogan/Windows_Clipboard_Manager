/* The renderer only receives data and a restricted set of local actions. */
const $ = selector => document.querySelector(selector);
let model, selected = 0, visible = [], toastTimer;
const search = $('#search-input');
const modal = $('#modal');
function svg(name) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS(element.namespaceURI, 'use');
  use.setAttribute('href', `#icon-${name}`); element.append(use); return element;
}
function notify(message) {
  $('#toast').textContent = message; $('#toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4000);
}
async function act(name, payload) {
  try {
    const result = await window.pano.action(name, payload);
    if (!result.ok) { notify(result.error); return null; }
    if (result.state) { model = result.state; render(); }
    return result;
  } catch { notify('İşlem tamamlanamadı. Lütfen tekrar deneyin.'); return null; }
}
function tool(icon, label, callback, extra = '') {
  const button = document.createElement('button');
  button.className = `icon-button ${extra}`; button.title = label; button.setAttribute('aria-label', label);
  button.append(svg(icon)); button.onclick = callback; return button;
}
function render() {
  if (!model) return;
  const query = search.value.toLocaleLowerCase('tr').trim();
  visible = model.entries.filter(e => !query || (e.text || 'görsel resim ekran görüntüsü').toLocaleLowerCase('tr').includes(query)).sort((a, b) => Number(b.pinned) - Number(a.pinned));
  selected = Math.max(0, Math.min(selected, visible.length - 1));
  const list = $('#history');
  const scrollTop = list.scrollTop;
  list.replaceChildren();
  visible.forEach((entry, index) => {
    const row = document.createElement('div');
    row.className = `entry${entry.id === model.activeId ? ' active' : ''}`;
    row.dataset.id = entry.id;
    const copy = document.createElement('button'); copy.className = 'entry-copy';
    copy.title = entry.kind === 'text' ? `${entry.text.slice(0, 800)}\nPanoya kopyala` : 'Görseli panoya kopyala';
    const marker = document.createElement('span'); marker.className = 'marker'; marker.setAttribute('aria-hidden', 'true'); copy.append(marker);
    if (entry.kind === 'image') {
      const image = document.createElement('img'); image.className = 'thumbnail'; image.src = entry.thumbnail; image.alt = 'Kopyalanan görsel'; copy.append(image);
    } else { const label = document.createElement('span'); label.className = 'entry-label'; label.textContent = entry.text.replace(/\s+/g, ' '); copy.append(label); }
    copy.onclick = () => act('copy', { id: entry.id });
    copy.onfocus = () => { selected = index; };
    row.append(copy);
    const tools = document.createElement('div'); tools.className = 'entry-tools';
    tools.append(tool(entry.kind === 'text' ? 'edit' : 'image', entry.kind === 'text' ? 'Metni düzenle' : 'Görseli aç', () => entry.kind === 'text' ? edit(entry) : preview(entry)));
    const pin = tool('pin', entry.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle', () => act('pin', { id: entry.id }), 'pin'); pin.setAttribute('aria-pressed', String(entry.pinned));
    tools.append(pin, tool('copy', 'Panoya kopyala', () => act('copy', { id: entry.id })), tool('book', 'İçeriği görüntüle', () => preview(entry)), tool('trash', 'Kaydı sil', () => act('remove', { id: entry.id }), 'danger'));
    row.append(tools); list.append(row);
  });
  list.scrollTop = scrollTop;
  list.hidden = visible.length === 0;
  $('#empty').hidden = visible.length > 0;
  $('#empty strong').textContent = query ? 'Sonuç bulunamadı.' : model.settings.paused ? 'Gizli kip açık.' : 'Panonuz burada.';
  $('#empty p').textContent = query ? 'Başka bir sözcükle aramayı deneyin.' : model.settings.paused ? 'Yeni kopyalananlar geçmişe kaydedilmiyor.' : 'Kopyaladığınız metinler ve görseller bu listede görünecek.';
  $('#pause').setAttribute('aria-checked', String(model.settings.paused));
  $('#notice').hidden = !model.status; $('#notice').textContent = model.status;
}
function dialog(title) {
  $('#modal-title').textContent = title; $('#modal-body').replaceChildren(); $('#modal-actions').replaceChildren();
  if (!modal.open) modal.showModal();
  return $('#modal-body');
}
function dialogButton(label, callback, style = '') {
  const button = document.createElement('button'); button.textContent = label; button.className = `button ${style}`; button.onclick = callback; $('#modal-actions').append(button); return button;
}
function paragraph(parent, text, className) { const p = document.createElement('p'); p.textContent = text; if (className) p.className = className; parent.append(p); return p; }
function edit(entry) {
  const body = dialog('Metni düzenle');
  const textarea = document.createElement('textarea'); textarea.value = entry.text; textarea.setAttribute('aria-label', 'Kayıt metni'); body.append(textarea);
  paragraph(body, 'Değişiklik geçmişte saklanır. Panoya almak için kayda tıklayın.', 'muted');
  dialogButton('Vazgeç', () => modal.close());
  dialogButton('Kaydet', async () => { if (await act('edit', { id: entry.id, text: textarea.value })) modal.close(); }, 'primary');
  textarea.focus();
}
async function preview(entry) {
  const result = await act('preview', { id: entry.id }); if (!result) return;
  const body = dialog(entry.kind === 'image' ? 'Görsel ön izlemesi' : 'Kayıt içeriği');
  if (entry.kind === 'image') { const image = document.createElement('img'); image.src = `data:image/png;base64,${result.entry.content}`; image.className = 'preview-image'; image.alt = 'Kaydın tam görseli'; body.append(image); }
  else { const text = document.createElement('pre'); text.className = 'preview-text'; text.textContent = result.entry.content; body.append(text); }
  dialogButton('Kapat', () => modal.close());
  dialogButton('Kopyala', async () => { if (await act('copy', { id: entry.id })) modal.close(); }, 'primary');
}
$('#dismiss').onclick = () => modal.close();
$('#pause').onclick = () => act('pause');
$('#clear').onclick = () => {
  const body = dialog('Geçmişi temizle');
  paragraph(body, 'Sabitlenmemiş kayıtlar silinecek. Bu işlem geri alınamaz. Mevcut panonuz değişmez.');
  const label = document.createElement('label'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; label.append(checkbox, document.createTextNode('Sabitlenmiş kayıtları da sil')); body.append(label);
  dialogButton('Vazgeç', () => modal.close());
  dialogButton('Temizle', async () => { if (await act('clear', { includePinned: checkbox.checked })) modal.close(); }, 'danger');
};
$('#settings').onclick = () => {
  const body = dialog('Ayarlar');
  const limitLabel = document.createElement('label'); limitLabel.textContent = 'Geçmişte tutulacak kayıt sayısı';
  const limit = document.createElement('select');
  [50, 100, 200, 500].forEach(n => { const option = document.createElement('option'); option.value = n; option.textContent = `${n} kayıt`; limit.append(option); });
  limit.value = model.settings.limit; limitLabel.append(limit); body.append(limitLabel);
  paragraph(body, 'Sabitlenmiş kayıtlar sayı sınırından etkilenmez. Toplam geçmiş sınırı 50 MB, tek kayıt sınırı 10 MB.', 'muted');
  const startupLabel = document.createElement('label'); const startup = document.createElement('input'); startup.type = 'checkbox'; startup.checked = model.settings.launchAtLogin; startup.disabled = !model.windows;
  startupLabel.append(startup, document.createTextNode('Windows açıldığında başlat')); body.append(startupLabel);
  paragraph(body, 'Panel kısayolu: Ctrl + Shift + V');
  paragraph(body, 'Geçmiş yalnızca bu bilgisayarda, şifrelenmeden saklanır. Parolalar gibi hassas içerikleri kopyalamadan önce gizli kipi açın.', 'muted');
  const folder = document.createElement('button'); folder.className = 'button'; folder.textContent = 'Veri klasörünü aç'; folder.onclick = () => act('folder'); body.append(folder);
  dialogButton('Vazgeç', () => modal.close());
  dialogButton('Kaydet', async () => { if (await act('settings', { limit: Number(limit.value), launchAtLogin: startup.checked })) modal.close(); }, 'primary');
};
search.oninput = () => { selected = 0; render(); };
document.addEventListener('keydown', event => {
  if (modal.open) return;
  if (event.key === 'Escape') { event.preventDefault(); act('hide'); }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    if (!visible.length) return; event.preventDefault();
    selected = Math.max(0, Math.min(visible.length - 1, selected + (event.key === 'ArrowDown' ? 1 : -1)));
    const rows = [...document.querySelectorAll('.entry')]; rows.forEach((row, i) => row.classList.toggle('keyboard', i === selected)); rows[selected]?.scrollIntoView({ block: 'nearest' });
  }
  if (event.key === 'Enter' && document.activeElement === search && visible[selected]) { event.preventDefault(); act('copy', { id: visible[selected].id }); }
});
window.pano.onChange(state => { model = state; render(); });
window.pano.onOpen(() => { modal.close(); selected = 0; search.value = ''; render(); search.focus(); });
window.pano.state().then(state => { model = state; render(); search.focus(); }).catch(() => notify('Pano geçmişi yüklenemedi.'));
