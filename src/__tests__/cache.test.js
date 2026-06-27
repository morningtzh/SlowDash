const fs = require('fs');
const path = require('path');
const cache = require('../cache');

describe('cache', () => {
  const cacheFile = path.join(__dirname, '..', '..', 'output', 'cache.json');
  const testKey = 'test_error_cache';

  afterEach(() => {
    if (fs.existsSync(cacheFile)) {
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      delete data[testKey];
      fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
    }
  });

  it('should not persist error-like payloads', () => {
    cache.set(testKey, { type: 'current', temp: 'Err', text: 'Net Err', city: '杭州' }, 60);

    expect(cache.get(testKey)).toBeNull();

    const persisted = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    expect(persisted[testKey]).toBeUndefined();
  });
});
