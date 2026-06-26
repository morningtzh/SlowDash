module.exports = async function(config) {
  if (config.galleryMode && !config.api_key) {
    return { type: config.type || 'stats', readTime: "125小时30分", readDays: 365, booksCount: 42 };
  }
  
  if (!config.api_key) {
    return { type: config.type || 'stats', error: "未配置 API Key" };
  }
  
  try {
    const res = await fetch("https://i.weread.qq.com/api/agent/gateway", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.api_key}`
      },
      body: JSON.stringify({
        api_name: "/readdata/detail",
        mode: "overall",
        skill_version: "1.0.3"
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    const data = await res.json();
    if (data.errcode === 0 || !data.errcode) {
      let readCount = 0;
      if (data.readStat) {
         const readItem = data.readStat.find(s => s.stat.includes('读过') || s.stat.includes('阅读'));
         if (readItem) readCount = parseInt(readItem.counts) || 0;
      }
      
      const hours = Math.floor((data.totalReadTime || 0) / 3600);
      const minutes = Math.floor(((data.totalReadTime || 0) % 3600) / 60);

      return { 
        type: config.type || 'stats', 
        readTime: `${hours}H ${minutes}M`, 
        readDays: data.readDays || 0, 
        booksCount: readCount || 0 
      };
    } else {
      return { type: config.type || 'stats', error: data.errmsg || "API Error" };
    }
  } catch (e) {
    console.error("WeRead error:", e);
    return { type: config.type || 'stats', error: "Net Err" };
  }
};

module.exports.supportedSizes = ['2x1', '3x1', '5x1', '2x2', '3x2'];
module.exports.galleryVariants = [
  { size: '2x1', type: 'stats' },
  { size: '3x1', type: 'stats' },
  { size: '5x1', type: 'stats' },
  { size: '2x2', type: 'detail' }
];
