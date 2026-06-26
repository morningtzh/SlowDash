const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const { parseConfig } = require('./src/configParser');
const { renderWidget } = require('./src/widgetEngine');
const { renderToImage } = require('./src/renderer');
const { packClientAssets } = require('./src/otaPackager');

async function run() {
  const releaseOTA = process.argv.includes('--release-ota');
  console.log(`Starting SlowDash OneShot generation...${releaseOTA ? ' (release OTA enabled)' : ''}`);

  const configPath = path.join(__dirname, 'config.yaml');
  if (!fs.existsSync(configPath)) {
    // Create default config for test
    fs.writeFileSync(configPath, `
settings:
  resolution: "1072x1448"
  color_mode: "grayscale"
layout:
  - row:
      - widget: clock
  - row:
      - widget: hitokoto
`);
    console.log("Created default config.yaml");
  }

  const config = await parseConfig(configPath);
  
  let widgetsHtml = '';
  // Process Layout (Simplified for demo)
  for (const row of config.layout) {
    if (row.row) {
      for (const wConfig of row.row) {
        console.log(`Rendering widget: ${wConfig.widget}...`);
        const widgetHtml = await renderWidget(wConfig, config.credentials);
        widgetsHtml += widgetHtml;
      }
    }
  }

  // Render Base Template
  const baseTemplatePath = path.join(__dirname, 'src/templates/base.ejs');
  const fullHtml = await ejs.renderFile(baseTemplatePath, { widgetsHtml, isPreview: false });

  // Generate Image
  console.log("Taking screenshot with Puppeteer (this might take a few seconds)...");
  const imageBuffer = await renderToImage(fullHtml, config.settings);

  // Save Local
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  const outputPath = path.join(outputDir, 'dashboard.png');
  fs.writeFileSync(outputPath, imageBuffer);

  console.log(`✅ Dashboard image successfully generated at: ${outputPath}`);

  if (releaseOTA) {
    try {
      const { manifest, archivePath } = packClientAssets(outputDir);
      console.log(`✅ Kindle OTA package created at: ${archivePath}`);
      console.log(`✅ Manifest generated with version: ${manifest.version}`);
    } catch (error) {
      console.error('❌ OTA packaging failed:', error.message);
      process.exit(1);
    }
  }
}

run().catch(console.error);
