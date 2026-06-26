module.exports = async function(config) {
  const now = new Date();
  return {
    time: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
  };
};
