const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const { parseConfig } = require('./src/configParser');
const { renderWidget } = require('./src/widgetEngine');
const { renderToImage } = require('./src/renderer');
const { packClientAssets, packKualExtension } = require('./src/otaPackager');
const { uploadFileToPresignedUrl } = require('./src/storage/s3Uploader');
const { uploadFileToS3 } = require('./src/storage/s3Client');

/** Deep-merge source into target (only own enumerable keys, no arrays) */
function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      deepMerge(target[k], v);
    } else if (v !== undefined) {
      target[k] = v;
    }
  }
}

/**
 * Generate the dashboard: load config, render widgets, screenshot, optionally upload to S3.
 *
 * @param {object} options
 * @param {string}  [options.configPath]      - Path to config.yaml (default: <project>/config.yaml)
 * @param {string}  [options.outputDir]       - Output directory for dashboard.png (default: <project>/output)
 * @param {boolean} [options.releaseOTA]      - Whether to also pack & upload OTA artifacts
 * @param {object}  [options.s3Overrides]     - Override S3 config fields (access_key_id, secret_access_key, etc.)
 * @param {object}  [options.storageOverride] - Override storage.type (e.g. 's3')
 * @param {object}  [options.credOverrides]  - Override credentials (e.g. { weather: { api_key: 'xxx' } })
 * @returns {Promise<{outputPath: string, imageBuffer: Buffer, config: object}>}
 */
async function generateDashboard(options = {}) {
  const {
    configPath = path.join(__dirname, 'config.yaml'),
    outputDir = path.join(__dirname, 'output'),
    releaseOTA = process.argv.includes('--release-ota'),
    s3Overrides = {},
    storageOverride = null,
    credOverrides = {},
  } = options;

  console.log(`[SlowDash] Generating dashboard...${releaseOTA ? ' (release OTA enabled)' : ''}`);

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
    console.log("[SlowDash] Created default config.yaml");
  }

  const config = await parseConfig(configPath);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Apply overrides
  if (storageOverride) {
    if (!config.storage) config.storage = {};
    config.storage.type = storageOverride;
  }
  if (config.storage && config.storage.s3) {
    Object.assign(config.storage.s3, s3Overrides);
  }

  // Apply credential overrides from environment variables (Secret)
  if (Object.keys(credOverrides).length > 0) {
    if (!config.credentials) config.credentials = {};
    deepMerge(config.credentials, credOverrides);
  }

  if (!releaseOTA) {
    // Process Layout
    let widgetsHtml = '';
    const startTime = Date.now();
    console.log(`[SlowDash] Found ${config.layout.length} widgets in configuration.`);

    for (let i = 0; i < config.layout.length; i++) {
      const wConfig = config.layout[i];
      const widgetName = wConfig.widget;
      const size = wConfig.size || 'small';
      const type = wConfig.type || 'default';
      const pos = (wConfig.row && wConfig.col) ? `[R${wConfig.row}, C${wConfig.col}]` : '[Auto-Flow]';

      console.log(`[${i + 1}/${config.layout.length}] Rendering ${widgetName} | Size: ${size} | Type: ${type} | Pos: ${pos} ...`);

      try {
        const widgetStart = Date.now();
        const widgetHtml = await renderWidget(wConfig, config.credentials);
        widgetsHtml += widgetHtml;
        console.log(`  └─ Success in ${Date.now() - widgetStart}ms`);
      } catch (err) {
        console.error(`  └─ ERROR rendering ${widgetName}:`, err.message);
      }
    }

    console.log(`[SlowDash] All widgets rendered in ${Date.now() - startTime}ms`);

    // Process Background
    let backgroundHtml = '';
    if (config.background && config.background.widget) {
      console.log(`[SlowDash] Rendering background: ${config.background.widget}`);
      const bgConfig = { ...config.background, size: '5x7', isBackground: true };
      backgroundHtml = await renderWidget(bgConfig, config.credentials);
    }

    // Render Base Template
    const baseTemplatePath = path.join(__dirname, 'src/templates/base.ejs');
    const fullHtml = await ejs.renderFile(baseTemplatePath, { widgetsHtml, backgroundHtml, isPreview: false });

    // Generate Image
    console.log("[SlowDash] Taking screenshot with Playwright (this might take a few seconds)...");
    const renderStartTime = Date.now();
    const imageBuffer = await renderToImage(fullHtml, config.settings);
    const renderDuration = Date.now() - renderStartTime;
    console.log(`[SlowDash] Playwright rendering completed in ${renderDuration}ms`);

    // Save Local
    const outputPath = path.join(outputDir, 'dashboard.png');
    try {
      fs.writeFileSync(outputPath, imageBuffer);
      console.log(`[SlowDash] ✅ Dashboard image saved at: ${outputPath}`);
    } catch (err) {
      console.error(`[SlowDash] ❌ Failed to save dashboard image:`, err.message);
    }

    // Optional: upload to external storage if configured
    if (config.storage && (config.storage.type === 's3' || config.storage.type === 'both')) {
      try {
        const s3cfg = config.storage.s3 || {};
        if (s3cfg.presigned_put_url) {
          console.log('[SlowDash] Uploading dashboard.png to presigned URL...');
          await uploadFileToPresignedUrl(s3cfg.presigned_put_url, outputPath, 'image/png');
          console.log('[SlowDash] Uploaded dashboard.png via presigned URL');
        } else if (s3cfg.bucket) {
          const keyPrefix = s3cfg.key_prefix || '';
          const key = `${keyPrefix}dashboard.png`;
          console.log('[SlowDash] Uploading dashboard.png to S3 bucket...');
          const s3StartTime = Date.now();
          const { url } = await uploadFileToS3(s3cfg, outputPath, key);
          const s3Duration = Date.now() - s3StartTime;
          console.log(`[SlowDash] Uploaded dashboard.png to S3 in ${s3Duration}ms at:`, url);
        } else {
          console.warn('[SlowDash] S3 configured but no presigned_put_url or bucket provided.');
        }
      } catch (e) {
        console.error('[SlowDash] Failed to upload to S3:', e.message);
      }
    }

    return { outputPath, imageBuffer, config };
  }

  // --- releaseOTA block ---
  if (releaseOTA) {
    try {
      const s3cfgForOta = config.storage && (config.storage.type === 's3' || config.storage.type === 'both') ? config.storage.s3 : null;
      let publicBaseUrl = null;
      if (s3cfgForOta && s3cfgForOta.public_url) {
        const prefix = (s3cfgForOta.key_prefix || '').replace(/^\/+/, '').replace(/\/+$/, '');
        publicBaseUrl = s3cfgForOta.public_url.replace(/\/+$/, '') + (prefix ? '/' + prefix : '');
      }
      const { manifest, archivePath } = packClientAssets(outputDir, { publicBaseUrl });
      console.log(`[SlowDash] ✅ Kindle OTA package created at: ${archivePath}`);
      console.log(`[SlowDash] ✅ Manifest generated with version: ${manifest.version}`);

      const { archivePath: kualExtPath } = packKualExtension(outputDir, { publicBaseUrl });
      console.log(`[SlowDash] ✅ KUAL extension package created at: ${kualExtPath}`);

      if (config.storage && (config.storage.type === 's3' || config.storage.type === 'both')) {
        const s3cfg = config.storage.s3 || {};
        if (s3cfg.bucket) {
          const keyPrefix = s3cfg.key_prefix || '';
          console.log('[SlowDash] Uploading OTA artifacts to S3...');
          const otaS3StartTime = Date.now();
          await uploadFileToS3(s3cfg, archivePath, `${keyPrefix}clients/kindle/update.tar.gz`);
          await uploadFileToS3(s3cfg, kualExtPath, `${keyPrefix}clients/kindle/slowdash-kual-extension.tar.gz`);
          const manifestPath = path.join(outputDir, 'clients', 'manifest.json');
          await uploadFileToS3(s3cfg, manifestPath, `${keyPrefix}clients/manifest.json`);
          const otaS3Duration = Date.now() - otaS3StartTime;
          console.log(`[SlowDash] OTA artifacts uploaded to S3 in ${otaS3Duration}ms`);
        }
      }
    } catch (error) {
      console.error('[SlowDash] ❌ OTA packaging failed:', error.message);
      throw error;
    }
  }
}

// --- CLI entry point (used by crontab / npm run generate) ---
async function run() {
  try {
    await generateDashboard();
  } finally {
    // Force exit to prevent hanging from unclosed handles (Playwright, fetch, timers)
    process.exit(0);
  }
}

if (require.main === module) {
  run().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}

module.exports = { generateDashboard };
