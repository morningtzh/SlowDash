const ical = require('node-ical');

module.exports = async function(config) {
  if (config.galleryMode && !config.caldav_url) {
    return { events: [
      { title: "评审看板组件 Gallery", time: "10:00" },
      { title: "部署到 K3s 集群", time: "15:30" }
    ]};
  }
  if (!config.username || !config.password || !config.caldav_url) {
    return { events: [{ title: "需要配置 CalDAV 账号", time: "" }] };
  }
  
  try {
    const eventsData = await ical.async.fromURL(config.caldav_url, {
      auth: {
        user: config.username,
        pass: config.password
      }
    });
    
    const now = new Date();
    let events = [];
    
    for (let k in eventsData) {
      if (eventsData[k].type === 'VEVENT') {
        const ev = eventsData[k];
        if (ev.start >= now) {
          events.push({
            title: ev.summary,
            start: ev.start
          });
        }
      }
    }
    
    events.sort((a, b) => a.start - b.start);
    const upcoming = events.slice(0, 3).map(e => {
      const timeStr = e.start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute:'2-digit' });
      const dateStr = e.start.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      return { title: e.title, time: `${dateStr} ${timeStr}` };
    });
    
    return { events: upcoming.length ? upcoming : [{ title: "近期无日程", time: "" }] };
  } catch (e) {
    console.error("iCloud sync error:", e);
    return { events: [{ title: "同步失败，请检查密码", time: "Error" }] };
  }
};
