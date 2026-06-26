module.exports = async function(config) {
  // 纯静态组件，无需网络请求
  return { 
    type: config.type || 'horizontal', 
    text: config.text || '请配置 text 参数'
  };
};

// 支持任意尺寸，因为文本会自适应容器
module.exports.supportedSizes = ['1x1', '1x2', '1x3', '2x1', '2x2', '2x3', '3x1', '3x2', '4x1', '4x2', '5x1', '5x2', '5x7'];

module.exports.galleryVariants = [
  { size: '3x1', type: 'horizontal', text: '这是一段测试用的自定义横排文本，可以用来写备忘录。' },
  { size: '1x2', type: 'vertical', text: '自\n定\n义\n竖\n排\n文\n本' },
  { size: '2x2', type: 'horizontal', text: 'HELLO WORLD' }
];
