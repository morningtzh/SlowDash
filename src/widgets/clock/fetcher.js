module.exports = async function fetch(config) {
  const now = new Date();
  
  let locale = config.locale || 'zh-CN';
  let timeZone = config.timezone || 'Asia/Shanghai';
  
  const timeString = now.toLocaleTimeString(locale, { timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
  const weekday = now.toLocaleDateString(locale, { timeZone, weekday: 'short' });
  const dateStr = now.toLocaleDateString(locale, { timeZone, month: 'long', day: 'numeric' });
  const fullDate = now.toLocaleDateString(locale, { timeZone, month: 'long', day: 'numeric', weekday: 'long' });

  return {
    time: timeString,
    weekday: weekday,
    dateStr: dateStr,
    fullDate: fullDate
  };
};

module.exports.galleryVariants = [
  { size: '1x1', type: 'digital' },
  { size: '2x1', type: 'digital' },
  { size: '2x2', type: 'digital' },
  { size: '1x1', type: 'minimal' }
];
