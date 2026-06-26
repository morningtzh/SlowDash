const cache = require('../../cache');

module.exports = async function(config) {
  const username = config.username || "torvalds";
  
  if (config.galleryMode && !config.username) {
    return { username: "Github Contributions", svg: `<div class="w-full h-full flex items-center justify-center text-gray-400 font-bold">Chart Preview</div>` };
  }
  
  const cacheKey = `github_svg_${username}`;
  const cached = cache.get(cacheKey);
  if (cached) return { username, svg: cached };

  try {
    if (config.type === 'stats') {
      const cacheKeyStats = `github_stats_${username}`;
      const cachedStats = cache.get(cacheKeyStats);
      if (cachedStats) return { username, total: cachedStats, type: 'stats' };

      const res = await fetch(`https://github.com/users/${username}/contributions`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/<h2[^>]*>\s*([\d,]+)\s*contributions/i);
        if (match && match[1]) {
          const total = match[1];
          cache.set(cacheKeyStats, total, 3600 * 2); // Cache for 2 hours
          return { username, total, type: 'stats' };
        }
      }
      return { username, total: "0", type: 'stats' };
    }

    const res = await fetch(`https://ghchart.rshah.org/000000/${username}`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      let svgText = await res.text();
      // Make it 100% and slice to right align naturally
      svgText = svgText
        .replace(/width="[^"]+"/, 'width="100%"')
        .replace(/height="[^"]+"/, 'height="100%"')
        .replace(/<svg\s+/, '<svg preserveAspectRatio="xMaxYMid slice" ');
      cache.set(cacheKey, svgText, 3600 * 12); // Cache for 12 hours
      return { username, svg: svgText };
    }
  } catch(e) {
    console.error("Github Chart Error:", e.message);
  }
  return { username, svg: "<div>Error loading chart</div>" };
};

module.exports.supportedSizes = ['4x1', '4x2', '5x2'];
module.exports.galleryVariants = [
  { size: '4x1', type: 'heatmap' },
  { size: '4x2', type: 'heatmap' },
  { size: '5x2', type: 'heatmap' }
];
