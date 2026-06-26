module.exports = async function(config) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
  return {
    time: timeStr
  };
};

module.exports.galleryVariants = [
  { size: '1x1', type: 'stamp' },
  { size: '2x1', type: 'stamp' }
];
