const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const { parseConfig } = require('./src/configParser');
const { renderWidget } = require('./src/widgetEngine');
const { renderToImage } = require('./src/renderer');
const { packClientAssets, packKualExtension } = require('./src/otaPackager');
const { uploadFileToPresignedUrl } = require('./src/storage/s3Uploader');
const { uploadFileToS3 } = require('./src/storage/s3Client');

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
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  if (!releaseOTA) {
  // Process Layout
  let widgetsHtml = '';
  const startTime = Date.now();
  console.log(`[INFO] Found ${config.layout.length} widgets in configuration.`);
  
  for (let i = 0; i < config.layout.length; i++) {
    const wConfig = config.layout[i];
    const widgetName = wConfig.widget;
    const size = wConfig.size || 'small';
    const type = wConfig.type || 'default';
    const pos = (wConfig.row && wConfig.col) ? `[R${wConfig.row}, C${wConfig.col}]` : '[Auto-Flow]';
    
    console.log(`[${i+1}/${config.layout.length}] Rendering ${widgetName} | Size: ${size} | Type: ${type} | Pos: ${pos} ...`);
    
    try {
      const widgetStart = Date.now();
      const widgetHtml = await renderWidget(wConfig, config.credentials);
      widgetsHtml += widgetHtml;
      console.log(`  └─ Success in ${Date.now() - widgetStart}ms`);
    } catch (err) {
      console.error(`  └─ ERROR rendering ${widgetName}:`, err.message);
    }
  }
  
  console.log(`[INFO] All widgets rendered in ${Date.now() - startTime}ms`);

  // Process Background
  let backgroundHtml = '';
  if (config.background && config.background.widget) {
    console.log(`[INFO] Rendering background: ${config.background.widget}`);
    const bgConfig = { ...config.background, size: '5x7', isBackground: true };
    backgroundHtml = await renderWidget(bgConfig, config.credentials);
  }

  // Render Base Template
  const baseTemplatePath = path.join(__dirname, 'src/templates/base.ejs');
  const fullHtml = await ejs.renderFile(baseTemplatePath, { widgetsHtml, backgroundHtml, isPreview: false });

  // Generate Image
  console.log("Taking screenshot with Puppeteer (this might take a few seconds)...");
  const renderStartTime = Date.now();
  const imageBuffer = await renderToImage(fullHtml, config.settings);
  const renderDuration = Date.now() - renderStartTime;
  console.log(`[INFO] Puppeteer rendering completed in ${renderDuration}ms`);

  // Save Local
  const outputPath = path.join(outputDir, 'dashboard.png');
  try {
    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`✅ Dashboard image successfully generated at: ${outputPath}`);
  } catch (err) {
    console.error(`❌ Failed to save dashboard image to ${outputPath}:`, err.message);
  }
  
  // Optional: upload to external storage if configured
  if (config.storage && (config.storage.type === 's3' || config.storage.type === 'both')) {
    try {
      const s3cfg = config.storage.s3 || {};
      if (s3cfg.presigned_put_url) {
        console.log('[INFO] Uploading dashboard.png to presigned URL...');
        await uploadFileToPresignedUrl(s3cfg.presigned_put_url, outputPath, 'image/png');
        console.log('[INFO] Uploaded dashboard.png via presigned URL');
      } else if (s3cfg.bucket) {
        // Direct S3 upload using credentials
        const keyPrefix = s3cfg.key_prefix || '';
        const filename = 'dashboard.png';
        const key = `${keyPrefix}${filename}`;
        console.log('[INFO] Uploading dashboard.png to S3 bucket...');
        const s3StartTime = Date.now();
        const { url } = await uploadFileToS3(s3cfg, outputPath, key);
        const s3Duration = Date.now() - s3StartTime;
        console.log(`[INFO] Uploaded dashboard.png to S3 in ${s3Duration}ms at:`, url);
      } else {
        console.warn('[WARN] S3 configured but no presigned_put_url or bucket provided.');
      }
    } catch (e) {
      console.error('[ERROR] Failed to upload to S3:', e.message);
    }
  }
  } // end of !releaseOTA block

  if (releaseOTA) {
    try {
      const s3cfgForOta = config.storage && (config.storage.type === 's3' || config.storage.type === 'both') ? config.storage.s3 : null;
      let publicBaseUrl = null;
      if (s3cfgForOta && s3cfgForOta.public_url) {
        const prefix = (s3cfgForOta.key_prefix || '').replace(/^\/+/, '').replace(/\/+$/, '');
        publicBaseUrl = s3cfgForOta.public_url.replace(/\/+$/, '') + (prefix ? '/' + prefix : '');
      }
      const { manifest, archivePath } = packClientAssets(outputDir, { publicBaseUrl });
      console.log(`✅ Kindle OTA package created at: ${archivePath}`);
      console.log(`✅ Manifest generated with version: ${manifest.version}`);

      const { archivePath: kualExtPath } = packKualExtension(outputDir, { publicBaseUrl });
      console.log(`✅ KUAL extension package created at: ${kualExtPath}`);

      // If S3 is configured and releaseOTA, upload OTA package and manifest as well
      if (config.storage && (config.storage.type === 's3' || config.storage.type === 'both')) {
        const s3cfg = config.storage.s3 || {};
        try {
          if (s3cfg.bucket) {
            const keyPrefix = s3cfg.key_prefix || '';
            const otaKey = `${keyPrefix}clients/kindle/update.tar.gz`;
            console.log('[INFO] Uploading OTA artifacts to S3...');
            const otaS3StartTime = Date.now();
            await uploadFileToS3(s3cfg, archivePath, otaKey);
            const kualKey = `${keyPrefix}clients/kindle/slowdash-kual-extension.tar.gz`;
            await uploadFileToS3(s3cfg, kualExtPath, kualKey);
            
            const manifestPath = path.join(outputDir, 'clients', 'manifest.json');
            const manifestKey = `${keyPrefix}clients/manifest.json`;
            await uploadFileToS3(s3cfg, manifestPath, manifestKey);
            const otaS3Duration = Date.now() - otaS3StartTime;
            console.log(`[INFO] OTA package, KUAL extension and manifest uploaded to S3 in ${otaS3Duration}ms`);
          }
        } catch (err) {
          console.error('[ERROR] Failed to upload OTA artifacts to S3:', err.message);
        }
      }
    } catch (error) {
      console.error('❌ OTA packaging failed:', error.message);
      process.exit(1);
    }
  }

  // Force exit to prevent hanging from any unclosed handles (e.g. timers, fetch, or playwright)
  process.exit(0);
}

run().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
