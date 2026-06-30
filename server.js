const express = require('express');
const path = require('path');
const fs = require('fs');
const { generateDashboard } = require('./oneshot');

// --- Environment / defaults ---
const CONFIG_PATH   = process.env.CONFIG_PATH   || '/etc/slowdash/config.yaml';
const OUTPUT_DIR    = process.env.OUTPUT_DIR    || '/var/lib/slowdash/output';
const SERVER_PORT   = parseInt(process.env.SERVER_PORT || '3000', 10);
const REFRESH_SEC   = parseInt(process.env.REFRESH_INTERVAL || '300', 10);
const NODE_ENV      = process.env.NODE_ENV      || 'production';

// Build S3 overrides from environment variables (prefer env over config.yaml values)
const s3Overrides = {};
const s3EnvMap = {
  S3_ACCESS_KEY_ID: 'access_key_id',
  S3_SECRET_ACCESS_KEY: 'secret_access_key',
  S3_BUCKET: 'bucket',
  S3_REGION: 'region',
  S3_ENDPOINT: 'endpoint',
  S3_KEY_PREFIX: 'key_prefix',
  S3_PUBLIC_URL: 'public_url',
};
for (const [envKey, s3Field] of Object.entries(s3EnvMap)) {
  if (process.env[envKey]) s3Overrides[s3Field] = process.env[envKey];
}

const storageOverride = process.env.STORAGE_TYPE || null;

// --- Build credential overrides from CRED__<section>__<key> env vars ---
function buildCredOverrides() {
  const overrides = {};
  const prefix = 'CRED__';
  for (const [envKey, val] of Object.entries(process.env)) {
    if (!envKey.startsWith(prefix) || !val) continue;
    const parts = envKey.slice(prefix.length).split('__');
    let cursor = overrides;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i].toLowerCase();
      if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
      cursor = cursor[part];
    }
    cursor[parts[parts.length - 1].toLowerCase()] = val;
  }
  return overrides;
}

// --- Status tracking ---
let lastSuccessTime = 0;
let lastError = null;
let isGenerating = false;

// --- Generation loop ---
async function runGeneration() {
  if (isGenerating) {
    console.log('[server] Generation already in progress, skipping this cycle');
    return;
  }
  isGenerating = true;
  try {
    // Ensure output dir exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    await generateDashboard({
      configPath: CONFIG_PATH,
      outputDir: OUTPUT_DIR,
      releaseOTA: false,
      s3Overrides,
      storageOverride,
      credOverrides: buildCredOverrides(),
    });
    lastSuccessTime = Date.now();
    lastError = null;
  } catch (err) {
    lastError = err.message || String(err);
    console.error(`[server] Generation failed: ${lastError}`);
  } finally {
    isGenerating = false;
  }
}

// --- Express server ---
const app = express();

// Liveness: is the process alive?
app.get('/healthz', (_req, res) => {
  res.type('text/plain').send('ok');
});

// Readiness: has the first generation completed at least once?
app.get('/readyz', (_req, res) => {
  // Allow "alwaysReady" for initial deployment — the first gen might take >30s
  const alwaysReady = process.env.ALWAYS_READY === 'true';
  if (alwaysReady || lastSuccessTime > 0) {
    res.type('text/plain').send('ready');
  } else {
    res.status(503).type('text/plain').send('still initializing');
  }
});

// Status: human-readable info
app.get('/status', (_req, res) => {
  res.json({
    pid: process.pid,
    uptime: Math.floor(process.uptime()),
    lastGeneration: lastSuccessTime ? new Date(lastSuccessTime).toISOString() : null,
    lastError,
    isGenerating,
    refreshInterval: REFRESH_SEC,
  });
});

// Serve the latest dashboard PNG (root redirect for convenience)
app.get('/', (_req, res) => {
  res.redirect('/dashboard.png');
});
app.get('/dashboard.png', (_req, res) => {
  const pngPath = path.join(OUTPUT_DIR, 'dashboard.png');
  if (fs.existsSync(pngPath)) {
    res.sendFile(pngPath);
  } else {
    res.status(404).type('text/plain').send('dashboard.png not yet generated');
  }
});

// --- Start ---
async function main() {
  // Start HTTP server
  const server = app.listen(SERVER_PORT, '0.0.0.0', () => {
    console.log(`[server] SlowDash server listening on 0.0.0.0:${SERVER_PORT}`);
    console.log(`[server] Config: ${CONFIG_PATH}`);
    console.log(`[server] Output: ${OUTPUT_DIR}`);
    console.log(`[server] Refresh interval: ${REFRESH_SEC}s`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n[server] Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log('[server] HTTP server closed');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10000);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Run initial generation (block startup until done? No — let the pod start quickly)
  // Run it in the background so the server is ready immediately
  console.log('[server] Running initial dashboard generation...');
  runGeneration().catch(err => {
    console.error(`[server] Initial generation error: ${err.message}`);
  });

  // Schedule periodic generation
  const intervalMs = REFRESH_SEC * 1000;
  setInterval(() => {
    runGeneration().catch(err => {
      console.error(`[server] Scheduled generation error: ${err.message}`);
    });
  }, intervalMs);

  console.log(`[server] Next refresh in ${REFRESH_SEC}s`);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
