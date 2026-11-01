const { fileURLToPath, pathToFileURL } = require('node:url');

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
      // Windows and Node may spell the same URI differently (e.g. ~ / %7E).
      // Re-encode from its path so round trips use the same history identity.
      const uri = pathToFileURL(filePath, { windows }).href;
      if (filePath.includes('\0') || seen.has(uri)) continue;
      seen.add(uri);
      files.push({ uri, path: filePath });
    } catch { /* Ignore malformed and non-local URI formats. */ }
  }
  return files;
}

function normalizeFileList(content, windows) {
  return parseFileList(content, windows).map(file => file.uri).join('\r\n');
}

module.exports = { parseFileList, normalizeFileList };
