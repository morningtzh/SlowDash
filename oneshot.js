const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const { parseConfig } = require('./src/configParser');
const { renderWidget } = require('./src/widgetEngine');
const { renderToImage } = require('./src/renderer');
const { packClientAssets, packClientAssetsMRInstaller } = require('./src/otaPackager');
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
  const imageBuffer = await renderToImage(fullHtml, config.settings);

  // Save Local
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  const outputPath = path.join(outputDir, 'dashboard.png');
  fs.writeFileSync(outputPath, imageBuffer);

  console.log(`✅ Dashboard image successfully generated at: ${outputPath}`);
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
        const { url } = await uploadFileToS3(s3cfg, outputPath, key);
        console.log('[INFO] Uploaded dashboard.png to S3 at:', url);
      } else {
        console.warn('[WARN] S3 configured but no presigned_put_url or bucket provided.');
      }
    } catch (e) {
      console.error('[ERROR] Failed to upload to S3:', e.message);
    }
  }
  if (releaseOTA) {
    try {
      const publicBaseUrl = config.storage && (config.storage.type === 's3' || config.storage.type === 'both')
        ? (config.storage.s3 && config.storage.s3.public_url) || null
        : null;
      const { manifest, archivePath } = packClientAssets(outputDir, { publicBaseUrl });
      console.log(`✅ Kindle OTA package created at: ${archivePath}`);
      console.log(`✅ Manifest generated with version: ${manifest.version}`);

      const { archivePath: mrInstallerPath } = packClientAssetsMRInstaller(outputDir, { publicBaseUrl });
      console.log(`✅ MR Installer package created at: ${mrInstallerPath}`);

      // If S3 is configured and releaseOTA, upload OTA package and manifest as well
      if (config.storage && (config.storage.type === 's3' || config.storage.type === 'both')) {
        const s3cfg = config.storage.s3 || {};
        try {
          if (s3cfg.bucket) {
            const keyPrefix = s3cfg.key_prefix || '';
            const otaKey = `${keyPrefix}clients/kindle/update.tar.gz`;
            console.log('[INFO] Uploading OTA package to S3...');
            await uploadFileToS3(s3cfg, archivePath, otaKey);
            
            const mrKey = `${keyPrefix}clients/kindle/slowdash-mr-installer.tar.gz`;
            console.log('[INFO] Uploading MR Installer package to S3...');
            await uploadFileToS3(s3cfg, mrInstallerPath, mrKey);
            
            const manifestPath = path.join(outputDir, 'clients', 'manifest.json');
            const manifestKey = `${keyPrefix}clients/manifest.json`;
            console.log('[INFO] Uploading manifest to S3...');
            await uploadFileToS3(s3cfg, manifestPath, manifestKey);
            console.log('[INFO] OTA package, MR Installer package and manifest uploaded to S3');
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
  console.error(err);
  process.exit(1);
});
