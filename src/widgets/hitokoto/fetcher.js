module.exports = async function(config) {
  try {
    const response = await fetch('https://v1.hitokoto.cn?c=i&c=d&c=k', { signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    return {
      type: config.type || 'quote',
      text: data.hitokoto,
      author: data.from || '佚名'
    };
  } catch (err) {
    return {
      type: config.type || 'quote',
      text: "心有林夕，无谓悲喜。",
      author: "Fallback"
    };
  }
};

module.exports.supportedSizes = ['2x1', '3x1', '5x1', '2x2', '3x2', '4x2'];
module.exports.galleryVariants = [
  { size: '2x2', type: 'quote' },
  { size: '3x2', type: 'quote' },
  { size: '5x1', type: 'quote' },
  { size: '1x3', type: 'quote_vertical' },
  { size: '3x1', type: 'minimal' },
  { size: '2x1', type: 'minimal' },
  { size: '1x2', type: 'minimal_vertical' }
];
