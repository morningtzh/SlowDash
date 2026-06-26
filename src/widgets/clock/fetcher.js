module.exports = async function fetch(config) {
  const now = new Date();
  
  let locale = config.locale || 'zh-CN';
  let timeZone = config.timezone || 'Asia/Shanghai';
  
  const timeString = now.toLocaleTimeString(locale, { timeZone, hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString(locale, { timeZone, month: 'long', day: 'numeric', weekday: 'long' });

  return {
    time: timeString,
    date: dateString
  };
};
