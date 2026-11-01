const { fileURLToPath } = require('node:url');

// Electron maps this MIME type to CF_HDROP on Windows. Store references, not
// copies of the actual files, and never turn arbitrary text into a file copy.
function parseFileList(content, windows = process.platform === 'win32') {
  if (typeof content !== 'string') return [];
  const seen = new Set();
  const files = [];
  for (const line of content.split(/\r?\n/)) {
    const value = line.trim();
    if (!value || value.startsWith('#')) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== 'file:' || url.search || url.hash) continue;
      const filePath = fileURLToPath(url, { windows });
      if (filePath.includes('\0') || seen.has(url.href)) continue;
      seen.add(url.href);
      files.push({ uri: url.href, path: filePath });
    } catch { /* Ignore malformed and non-local URI formats. */ }
  }
  return files;
}

function normalizeFileList(content, windows) {
  return parseFileList(content, windows).map(file => file.uri).join('\r\n');
}

module.exports = { parseFileList, normalizeFileList };
