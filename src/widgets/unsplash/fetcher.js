module.exports = async function(config) {
  // Uses Picsum API for random grayscale image based on seed to avoid same image in one shot
  return {
    type: config.type || 'gallery',
    imageUrl: `https://picsum.photos/seed/${Math.random()}/800/800?grayscale`
  };
};

module.exports.supportedSizes = ['2x2', '3x3', '4x4', '5x4', '5x7'];
module.exports.galleryVariants = [
  { size: '2x2', type: 'gallery' },
  { size: '3x3', type: 'gallery' },
  { size: '4x4', type: 'gallery' },
  { size: '5x4', type: 'background' }
];
