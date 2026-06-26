module.exports = async function(config) {
  const today = new Date();
  
  function calculateDays(dateStr, type) {
    const target = new Date(dateStr);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (type === 'anniversary' || type === 'countup') {
      return Math.abs(diffDays); // Days since
    }
    return diffDays; // Days until
  }

  if (config.type === 'multiple') {
    let eventsToUse = config.events;
    if (config.galleryMode && (!eventsToUse || !Array.isArray(eventsToUse))) {
      eventsToUse = [
        { name: "春节", date: "2027-02-06", event_type: "countdown" },
        { name: "发薪", date: "2026-07-15", event_type: "countdown" },
        { name: "相识", date: "2020-05-20", event_type: "anniversary" }
      ];
    }
    
    if (eventsToUse && Array.isArray(eventsToUse)) {
      const processedEvents = eventsToUse.map(ev => ({
        name: ev.name || ev.event,
        days: calculateDays(ev.date || ev.target, ev.event_type),
        isPast: calculateDays(ev.date || ev.target, ev.event_type) < 0 && ev.event_type === 'countdown'
      }));
      return { type: 'multiple', events: processedEvents };
    }
  }

  // Single mode
  const dateStr = config.date || config.target || '2027-01-01';
  const name = config.name || config.event || 'Next Year';
  const event_type = config.event_type || 'countdown';
  
  const days = calculateDays(dateStr, event_type);
  
  return { 
    type: config.type || 'single', 
    name, 
    days: Math.abs(days),
    event_type 
  };
};
module.exports.supportedSizes = ['1x1', '1x2', '2x2', '3x2', '4x2', 'small'];
module.exports.galleryVariants = [
  { size: '1x2', type: 'single' },
  { size: '2x2', type: 'single' },
  { size: '3x3', type: 'multiple' }
];
