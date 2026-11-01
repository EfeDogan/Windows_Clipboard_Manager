const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { History } = require('../src/history.cjs');
function history(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pano-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return new History(directory);
}
test('Tekrar kopyalanan kayıt çoğalmaz ve yeniden yüklenebilir', t => {
  const h = history(t); const first = h.add('text', 'merhaba');
  h.add('text', 'ikinci'); h.add('text', 'merhaba');
  assert.equal(h.entries.length, 2); assert.equal(h.entries[0].id, first.id);
  const loaded = new History(path.dirname(h.file));
  assert.deepEqual(loaded.entries, h.entries);
});
test('Sayı sınırı ve temizleme sabitlenmiş kayıtları korur', t => {
  const h = history(t); h.settings.limit = 2;
  const pin = h.add('text', 'koru'); h.pin(pin.id);
  for (let i = 0; i < 6; i++) h.add('text', `kayıt ${i}`);
  assert.equal(h.entries.length, 3); assert.ok(h.get(pin.id).pinned);
  h.clear(false); assert.equal(h.entries.length, 1);
  h.clear(true); assert.equal(h.entries.length, 0);
});
test('Bozuk veri korunur; HTML metni çalıştırılmadan aynen saklanır', t => {
  const h = history(t);
  fs.writeFileSync(h.file, '{bozuk veri');
  const recovered = new History(path.dirname(h.file));
  assert.ok(recovered.loadError);
  const backup = fs.readdirSync(path.dirname(h.file)).find(f => f.includes('.unreadable-'));
  assert.equal(fs.readFileSync(path.join(path.dirname(h.file), backup), 'utf8'), '{bozuk veri');
  const entry = recovered.add('text', '<script>alert(1)</script>');
  assert.equal(entry.content, '<script>alert(1)</script>');
});
test('Düzenleme geçersiz içerikleri reddeder ve görsel tam verisini korur', t => {
  const h = history(t); const entry = h.add('text', 'önce');
  h.edit(entry.id, 'sonra'); assert.equal(h.get(entry.id).content, 'sonra');
  assert.throws(() => h.edit(entry.id, '  '));
  assert.equal(h.add('text', 'x'.repeat(10 * 1024 * 1024 + 1)), null);
  const image = h.add('image', 'aGVsbG8=', 'data:image/png;base64,aGVsbG8=');
  assert.equal(new History(path.dirname(h.file)).get(image.id).content, 'aGVsbG8=');
});
