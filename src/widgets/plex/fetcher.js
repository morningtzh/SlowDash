module.exports = async function(config) {
  if (config.galleryMode && (!config.url || !config.token)) {
    return {
      posters: [
        "https://image.tmdb.org/t/p/w500/8cdWjvZQUrmdDO7BaR1TomG42Mg.jpg",
        "https://image.tmdb.org/t/p/w500/tncbMvfV0V07UZvzZRkYPAzpb91.jpg",
        "https://image.tmdb.org/t/p/w500/tMefBSflR6PGQLvLuPE31VRCRv9.jpg"
      ],
      error: null
    };
  }

  let posters = [];
  let error = null;

  if (config.url && config.token) {
    try {
      const baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
      const url = `${baseUrl}/library/recentlyAdded?X-Plex-Token=${config.token}`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (res.ok) {
        const data = await res.json();
        const items = data.MediaContainer?.Metadata || [];
        
        let limit = 25; // Fetch a large pool to be safe

        // Filter for items with a thumb
        let validItems = items.filter(i => i.thumb);
        
        if (config.type === 'random_poster' || config.type === 'poster_wall') {
            // Shuffle
            validItems.sort(() => 0.5 - Math.random());
        }

        validItems = validItems.slice(0, limit);
        
        posters = validItems.map(item => {
          return `${baseUrl}${item.thumb}?X-Plex-Token=${config.token}`;
        });
      } else {
        error = `API Err: ${res.status}`;
      }
    } catch(e) {
      console.error("Plex Fetch Error:", e.message);
      error = "Fetch Error";
    }
  } else {
    error = "Missing Config";
  }

  return { posters, error };
};
module.exports.supportedSizes = ['small', 'medium', '4x2', 'large', '4x4', '5x2', '2x3'];
module.exports.galleryVariants = [
  { size: '5x2', type: 'poster_wall' },
  { size: '5x2', type: 'recently_added' },
  { size: '2x3', type: 'random_poster' },
  { size: '5x4', type: 'background' }
];
