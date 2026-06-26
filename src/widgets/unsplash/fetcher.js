module.exports = async function(config) {
  return {
    // Uses Picsum API for random grayscale image
    imageUrl: `https://picsum.photos/seed/${Math.random()}/800/800?grayscale`
  };
};

module.exports.supportedSizes = ['large', '4x4', 'medium', '4x2', 'small', '2x2'];
