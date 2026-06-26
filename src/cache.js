const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', 'output', 'cache.json');

function _readCache() {
  if (!fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function _writeCache(data) {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

function get(key) {
  const cache = _readCache();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete cache[key];
    _writeCache(cache);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlSeconds = 3600) {
  const cache = _readCache();
  cache[key] = {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  };
  _writeCache(cache);
}

module.exports = { get, set };
