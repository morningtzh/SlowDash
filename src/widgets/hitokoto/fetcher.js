module.exports = async function(config) {
  try {
    const response = await fetch('https://v1.hitokoto.cn?c=i&c=d&c=k');
    const data = await response.json();
    return {
      text: data.hitokoto,
      author: data.from || '佚名'
    };
  } catch (err) {
    return {
      text: "心有林夕，无谓悲喜。",
      author: "Fallback"
    };
  }
};
