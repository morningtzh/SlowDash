module.exports = async function(config) {
  if (config.galleryMode && !config.api_key) {
    if (config.type === 'forecast') {
      return { type: 'forecast', city: "杭州", hourly: [
        { temp: '25', text: '晴', fxTime: '12:00' },
        { temp: '26', text: '多云', fxTime: '13:00' },
        { temp: '27', text: '阴', fxTime: '14:00' },
        { temp: '28', text: '小雨', fxTime: '15:00' },
        { temp: '25', text: '雨', fxTime: '16:00' }
      ] };
    }
    return { type: 'current', temp: "26", text: "晴", city: "杭州" };
  }

  const location = config.location || "101010100";
  const host = config.api_host || 'https://devapi.qweather.com';
  
  if (config.type === 'forecast' || config.type === 'hourly' || config.type === 'hourly_chart') {
    try {
      const url = `${host}/v7/weather/24h?location=${location}&key=${config.api_key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      if (data.code == 200 || data.code === "200") {
        let sliceLen = 6;
        if (config.size === '3x1') sliceLen = 4;
        if (config.size === '4x1') sliceLen = 5;
        if (config.size === '5x1') sliceLen = 7;
        if (config.size === '2x3' || config.size === '2x4' || config.size === '3x2') sliceLen = 6;
        return {
          type: config.type === 'hourly_chart' ? 'hourly_chart' : 'hourly',
          city: config.city_name || "City",
          hourly: data.hourly.slice(0, sliceLen) // dynamic limit based on layout size
        };
      } else {
        return { type: config.type === 'hourly_chart' ? 'hourly_chart' : 'hourly', city: config.city_name || "City", error: `Code ${data.code || data.error?.status}` };
      }
    } catch(e) {
      return { type: config.type === 'hourly_chart' ? 'hourly_chart' : 'hourly', city: config.city_name || "City", error: "Net Err" };
    }
  } else {
    // Current weather
    try {
      const url = `${host}/v7/weather/now?location=${location}&key=${config.api_key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      if (data.code == 200 || data.code === "200") {
        if (!data.now) {
          return { type: 'current', temp: "Err", text: "No data", city: config.city_name || "City" };
        }
        return {
          type: 'current',
          temp: data.now.temp,
          text: data.now.text,
          city: config.city_name || "City"
        };
      } else {
        return { type: 'current', temp: "Err", text: `Code ${data.code || data.error?.status || res.status}`, city: "API 报错" };
      }
    } catch (e) {
      console.error("Weather error:", e.message);
      return { type: 'current', temp: "Err", text: "Net Err", city: config.city_name || "API 报错" };
    }
  }
};
module.exports.supportedSizes = ['1x1', '2x2', '5x1', '3x1', '4x1'];
module.exports.galleryVariants = [
  { size: '1x2', type: 'current' },
  { size: '2x2', type: 'current' },
  { size: '4x2', type: 'forecast' },
  { size: '5x1', type: 'forecast' }
];
