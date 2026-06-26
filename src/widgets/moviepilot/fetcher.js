module.exports = async function(config) {
  const dummyPosters = [
    "https://image.tmdb.org/t/p/w500/8cdWjvZQUrmdDO7BaR1TomG42Mg.jpg", 
    "https://image.tmdb.org/t/p/w500/tncbMvfV0V07UZvzZRkYPAzpb91.jpg", 
    "https://image.tmdb.org/t/p/w500/tMefBSflR6PGQLvLuPE31VRCRv9.jpg"
  ];
  
  if (config.galleryMode && (!config.url || !config.api_token)) {
    return {
      type: config.type || 'stats',
      stats: {
        movie_subscribes: 12,
        tv_subscribes: 5,
        downloading: 2,
        seeding: 189
      }
    };
  }

  let stats = {};
  if (config.url && config.api_token) {
    try {
      const baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
      const res = await fetch(`${baseUrl}/api/v1/plugin/HomePage/statistic?apikey=${config.api_token}`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        stats = data || {};
      } else {
        stats = { "API 错误": res.status };
      }
    } catch (e) {
      console.error("MoviePilot Fetch Error:", e.message);
      stats = { "网络错误": "超时或断开" };
    }
  } else {
    stats = { "配置缺失": "缺少 Token" };
  }

  return { type: config.type || 'stats', stats };
};

module.exports.supportedSizes = ['2x1', '3x1', '5x1', '2x2'];
module.exports.galleryVariants = [
  { size: '2x1', type: 'stats' },
  { size: '3x1', type: 'stats' },
  { size: '5x1', type: 'stats' },
  { size: '2x2', type: 'dashboard' }
];
