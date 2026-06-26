const yaml = require('js-yaml');
const fs = require('fs');

async function parseConfig(yamlPathOrString, isString = false) {
  let fileContents = '';
  if (isString) {
    fileContents = yamlPathOrString;
  } else {
    fileContents = fs.readFileSync(yamlPathOrString, 'utf8');
  }

  const doc = yaml.load(fileContents);

  if (!doc || !doc.layout) {
    throw new Error('Layout is missing in configuration');
  }

  // Set default settings
  if (!doc.settings) {
    doc.settings = {};
  }
  doc.settings.resolution = doc.settings.resolution || '1072x1448';
  doc.settings.color_mode = doc.settings.color_mode || 'grayscale';

  return doc;
}

module.exports = { parseConfig };
