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
    const res = await fetch(`https://ghchart.rshah.org/000000/${username}`);
    if (res.ok) {
      let svgText = await res.text();
      // Remove hardcoded width/height to make it responsive
      svgText = svgText.replace(/width="[^"]+"/, 'width="100%"').replace(/height="[^"]+"/, 'height="100%"');
      cache.set(cacheKey, svgText, 3600 * 12); // Cache for 12 hours
      return { username, svg: svgText };
    }
  } catch(e) {
    console.error("Github Chart Error:", e.message);
  }
  return { username, svg: "<div>Error loading chart</div>" };
};

module.exports.supportedSizes = ['medium', '4x2', '4x1'];
