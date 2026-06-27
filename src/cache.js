const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', 'output', 'cache.json');
const ERROR_INDICATORS = ['Err', 'Net Err', 'Auth Err', 'API Error'];

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

function _containsErrorIndicators(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const normalized = value.trim();
    return ERROR_INDICATORS.includes(normalized) || normalized.includes('Err') || normalized.includes('Net Err') || normalized.includes('Auth Err');
  }
  if (Array.isArray(value)) {
    return value.some((item) => _containsErrorIndicators(item));
  }
  if (typeof value === 'object') {
    if (value.error) return true;
    return Object.values(value).some((item) => _containsErrorIndicators(item));
  }
  return false;
}

function _isCacheable(value) {
  return value !== null && value !== undefined && !_containsErrorIndicators(value);
}

function get(key) {
  const cache = _readCache();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt || !_isCacheable(entry.value)) {
    delete cache[key];
    _writeCache(cache);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlSeconds = 3600) {
  if (!_isCacheable(value)) return;

  const cache = _readCache();
  cache[key] = {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  };
  _writeCache(cache);
}

module.exports = { get, set };
