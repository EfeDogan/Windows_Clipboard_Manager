const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseFileList, normalizeFileList } = require('../src/file-references.cjs');

test('Dosya URI listesi Türkçe, boşluk, # ve çoklu seçimleri korur', () => {
  const input = '# yorum\r\nfile:///tmp/Rapor%20%C4%9F%20%231.pdf\r\nfile:///tmp/resim.png\r\nfile:///tmp/resim.png\r\n';
  const files = parseFileList(input, false);
  assert.deepEqual(files.map(f => f.path), ['/tmp/Rapor ğ #1.pdf', '/tmp/resim.png']);
  assert.equal(normalizeFileList(input, false), 'file:///tmp/Rapor%20%C4%9F%20%231.pdf\r\nfile:///tmp/resim.png');
});
test('Windows sürücü ve UNC dosya yollarını çözer', () => {
  assert.deepEqual(parseFileList('file:///C:/Users/Efe/Resimler/a%20b.png\r\nfile://server/share/rapor.pdf', true).map(f => f.path), ['C:\\Users\\Efe\\Resimler\\a b.png', '\\\\server\\share\\rapor.pdf']);
});
test('Web adresleri, bozuk URI ve NUL içeren yollar dosya sayılmaz', () => {
  assert.deepEqual(parseFileList('https://example.com/a.pdf\nC:\\rapor.pdf\nfile:///tmp/a%00b\nfile:///tmp/file?query=1\nfile:///tmp/file#hash\nfile:///tmp/%ZZ', false), []);
});
test('Windows panosunun farklı URI kodlamaları aynı kayda dönüşür', () => {
  assert.equal(normalizeFileList('file:///C:/Users/RUNNER%7E1/Resim%20a.png', true), normalizeFileList('file:///C:/Users/RUNNER~1/Resim%20a.png', true));
  assert.equal(parseFileList('file:///tmp/a%7Eb.png\r\nfile:///tmp/a~b.png', false).length, 1);
});
