const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAX_ITEM_BYTES = 10 * 1024 * 1024;
const MAX_HISTORY_BYTES = 50 * 1024 * 1024;
const defaults = { limit: 100, paused: false, launchAtLogin: false, shortcut: 'CommandOrControl+Shift+V' };
const fingerprint = (kind, content) => createHash('sha256').update(kind).update(content).digest('hex');
const size = entry => Buffer.byteLength(entry.content);

class History {
  constructor(directory) {
    this.file = path.join(directory, 'history.json');
    this.entries = [];
    this.settings = { ...defaults };
    this.loadError = null;
    fs.mkdirSync(directory, { recursive: true });
    if (fs.existsSync(this.file)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        if (!Array.isArray(data.entries)) throw new Error('Geçersiz geçmiş dosyası');
        this.entries = data.entries.filter(e => e && typeof e.id === 'string' && ['text', 'image'].includes(e.kind) && typeof e.content === 'string' && size(e) <= MAX_ITEM_BYTES).map(e => ({ ...e, pinned: Boolean(e.pinned), hash: fingerprint(e.kind, e.content) }));
        const s = data.settings || {};
        this.settings = { ...defaults, limit: [50, 100, 200, 500].includes(s.limit) ? s.limit : 100, paused: s.paused === true, launchAtLogin: s.launchAtLogin === true };
        this.trim();
      } catch {
        // Keep the original file recoverable instead of silently overwriting it.
        const backup = `${this.file}.unreadable-${Date.now()}`;
        fs.copyFileSync(this.file, backup);
        this.loadError = 'Geçmiş dosyası okunamadı. Önceki dosyanın yedeği veri klasöründe korundu.';
      }
    }
  }
  save() {
    const temp = `${this.file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({ version: 1, entries: this.entries, settings: this.settings }), { mode: 0o600 });
    fs.renameSync(temp, this.file);
  }
  trim() {
    while (this.entries.filter(e => !e.pinned).length > this.settings.limit || this.entries.reduce((n, e) => n + size(e), 0) > MAX_HISTORY_BYTES) {
      const index = this.entries.findLastIndex(e => !e.pinned);
      if (index < 0) break;
      this.entries.splice(index, 1);
    }
  }
  add(kind, content, thumbnail) {
    if (!['text', 'image'].includes(kind) || !content || Buffer.byteLength(content) > MAX_ITEM_BYTES) return null;
    const hash = fingerprint(kind, content);
    const existing = this.entries.find(e => e.hash === hash);
    if (existing) {
      this.entries = this.entries.filter(e => e.id !== existing.id);
      existing.updated = Date.now();
      this.entries.unshift(existing);
    } else {
      this.entries.unshift({ id: randomUUID(), kind, content, ...(thumbnail ? { thumbnail } : {}), hash, pinned: false, updated: Date.now() });
    }
    this.trim();
    this.save();
    return existing || this.entries.find(e => e.hash === hash) || null;
  }
  get(id) {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) throw new Error('Bu kayıt artık geçmişte bulunmuyor.');
    return entry;
  }
  pin(id) {
    const entry = this.get(id);
    if (!entry.pinned && this.entries.filter(e => e.pinned).length >= 100) throw new Error('En fazla 100 kayıt sabitlenebilir.');
    entry.pinned = !entry.pinned;
    this.trim();
    this.save();
  }
  remove(id) { this.entries = this.entries.filter(e => e.id !== id); this.save(); }
  clear(includePinned) { this.entries = this.entries.filter(e => e.pinned && !includePinned); this.save(); }
  edit(id, content) {
    const entry = this.get(id);
    if (entry.kind !== 'text' || typeof content !== 'string' || !content.trim() || Buffer.byteLength(content) > MAX_ITEM_BYTES) throw new Error('Geçerli bir metin girin (en fazla 10 MB).');
    entry.content = content;
    entry.hash = fingerprint('text', content);
    entry.updated = Date.now();
    this.trim();
    this.save();
  }
}
module.exports = { History, fingerprint, MAX_ITEM_BYTES };
