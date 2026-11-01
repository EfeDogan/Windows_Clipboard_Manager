const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
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
    await action('copy', { id: image.id });
    assert.ok(await clipboard.has('image/png'), 'Görsel tekrar panoya yazılmalı');
    const text = history.entries.find(e => e.kind === 'text');
    await action('copy', { id: text.id }); assert.equal(await clipboard.readText(), text.content);
    await action('edit', { id: text.id, text: 'düzenlenmiş metin' });
    await action('copy', { id: text.id }); assert.equal(await clipboard.readText(), 'düzenlenmiş metin');
    // Fixture data exists only in this disposable smoke-test profile.
    history.clear(true);
    for (const text of ['b2230760523', 'https://x.com/', 'majachflynn', '1907emir', 'https://mail.google.com/mail/', 'https://www.youtube.com/', 'https://piazza.com/class/mu42…', 'https://github.com/EfeDogan', 'XA7MA7']) history.add('text', text);
    history.add('image', image.content, image.thumbnail);
    history.add('text', 'Hello from Palo Alto Networks…');
    await action('pin', { id: history.entries[0].id });
    showPanel(); await wait(500);
    await panel.webContents.executeJavaScript('window.pano.state().then(s => { model = s; render(); })');
    assert.equal(await panel.webContents.executeJavaScript('document.querySelectorAll(".entry").length'), 11);
    await panel.webContents.executeJavaScript('document.querySelector("#search-input").value="github"; document.querySelector("#search-input").dispatchEvent(new Event("input"));');
    assert.equal(await panel.webContents.executeJavaScript('document.querySelectorAll(".entry").length'), 1);
    await panel.webContents.executeJavaScript('document.querySelector("#search-input").value=""; document.querySelector("#search-input").dispatchEvent(new Event("input")); document.querySelector("#settings").click();');
    assert.equal(await panel.webContents.executeJavaScript('document.querySelector("#modal").open'), true);
    await panel.webContents.executeJavaScript('document.querySelector("#modal").close(); document.querySelector(".entry .entry-tools button").click();');
    assert.equal(await panel.webContents.executeJavaScript('document.querySelector("#modal-body textarea").value'), 'Hello from Palo Alto Networks…');
    await panel.webContents.executeJavaScript('document.querySelector("#modal").close(); document.querySelector("#search-input").focus();');
    const output = path.join(__dirname, '../test-output'); fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'panel.png'), (await panel.webContents.capturePage()).toPNG());
    assert.equal(state().settings.paused, false);
    console.log('SMOKE PASS: native text/image clipboard, private mode, edit/copy, renderer search, settings, preview screenshot');
  } catch (error) { console.error('SMOKE FAIL:', error); process.exitCode = 1; }
  finally { fs.rmSync(directory, { recursive: true, force: true }); app.exit(process.exitCode || 0); }
};
