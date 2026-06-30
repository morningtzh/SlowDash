const express = require('express');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const { parseConfig } = require('./src/configParser');
const { renderWidget } = require('./src/widgetEngine');
const { generateDashboard } = require('./oneshot');

// =============================================================
// Environment / defaults
// =============================================================
const PROJECT_ROOT   = __dirname;
const CONFIG_PATH    = process.env.CONFIG_PATH   || path.join(PROJECT_ROOT, 'config.yaml');
const OUTPUT_DIR     = process.env.OUTPUT_DIR    || path.join(PROJECT_ROOT, 'output');
const SERVER_PORT    = parseInt(process.env.SERVER_PORT || '3000', 10);
const REFRESH_SEC    = parseInt(process.env.REFRESH_INTERVAL || '0', 10);  // 0 = manual only
const HOST           = process.env.HOST || '0.0.0.0';

// --- S3 overrides ---
const s3Overrides = {};
for (const [envKey, s3Field] of Object.entries({
  S3_ACCESS_KEY_ID: 'access_key_id',
  S3_SECRET_ACCESS_KEY: 'secret_access_key',
  S3_BUCKET: 'bucket',
  S3_REGION: 'region',
  S3_ENDPOINT: 'endpoint',
  S3_KEY_PREFIX: 'key_prefix',
  S3_PUBLIC_URL: 'public_url',
})) {
  if (process.env[envKey]) s3Overrides[s3Field] = process.env[envKey];
}
const storageOverride = process.env.STORAGE_TYPE || null;

// --- Credential overrides from CRED__<section>__<key> env vars ---
function buildCredOverrides() {
  const overrides = {};
  for (const [envKey, val] of Object.entries(process.env)) {
    if (!envKey.startsWith('CRED__') || !val) continue;
    const parts = envKey.slice(6).split('__');
    let cursor = overrides;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i].toLowerCase();
      if (!cursor[p] || typeof cursor[p] !== 'object') cursor[p] = {};
      cursor = cursor[p];
    }
    cursor[parts[parts.length - 1].toLowerCase()] = val;
  }
  return overrides;
}

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

// =============================================================
// Status tracking (used by generation loop & status endpoint)
// =============================================================
let lastSuccessTime = 0;
let lastError = null;
let isGenerating = false;

async function runGeneration() {
  if (isGenerating) return;
  isGenerating = true;
  try {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    await generateDashboard({
      configPath: CONFIG_PATH,
      outputDir: OUTPUT_DIR,
      releaseOTA: false,
      s3Overrides, storageOverride,
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

// =============================================================
// Unified navigation: "SlowDash ▾" dropdown (方案 C)
// =============================================================
function renderNavbar(active) {
  const pages = [
    { id: 'home',    label: '主页',     path: '/' },
    { id: 'gallery', label: '组件画廊',  path: '/gallery' },
    { id: 'png',     label: '当前看板',  path: '/png' },
  ];
  const activeIdx = pages.findIndex(p => p.id === active);
  const navStyle = `
    position:fixed;top:0;left:0;z-index:1000;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;
    user-select:none;
  `;
  // 左上角触发按钮
  let html = `<div style="${navStyle}">`;
  html += `<div class="sd-dropdown-btn" style="
    background:#222;color:#fff;padding:8px 14px;border-radius:0 0 8px 0;
    cursor:pointer;display:inline-block;font-weight:600;letter-spacing:0.5px;
  ">SlowDash ▾</div>`;
  // 下拉菜单
  html += `<div class="sd-dropdown-menu" style="
    display:none;position:absolute;top:36px;left:0;min-width:140px;
    background:#222;border-radius:0 8px 8px 0;padding:6px 0;
    box-shadow:0 4px 16px rgba(0,0,0,0.3);
  ">`;
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const activeClass = i === activeIdx ? 'font-weight:700;background:#444;' : '';
    html += `<a href="${p.path}" style="
      display:block;padding:8px 18px;color:#fff;text-decoration:none;
      ${activeClass}transition:background .15s;
    " onmouseover="this.style.background='#444'" onmouseout="this.style.background='${i === activeIdx ? '#444' : 'transparent'}'">${p.label}</a>`;
  }
  // 分隔线 + 功能按钮
  html += `<div style="height:1px;background:#444;margin:4px 12px"></div>`;
  // 📏 网格 — 仅主页/画廊显示
  if (active === 'home' || active === 'gallery') {
    html += `<a href="#" onclick="event.preventDefault();toggleGrid();this.blur();return false" style="display:block;padding:8px 18px;color:#aaa;text-decoration:none;transition:background .15s;" onmouseover="this.style.background='#444'" onmouseout="this.style.background='transparent'">📏 网格</a>`;
  }
  html += `<a href="#" onclick="event.preventDefault();location.reload();this.blur();return false" style="display:block;padding:8px 18px;color:#aaa;text-decoration:none;transition:background .15s;" onmouseover="this.style.background='#444'" onmouseout="this.style.background='transparent'">🔄 刷新</a>`;
  html += `</div></div>`;

  // CSS 控制 hover/click 显示
  html += `<style>
    .sd-dropdown-btn:hover + .sd-dropdown-menu,
    .sd-dropdown-menu:hover,
    .sd-dropdown-btn:focus + .sd-dropdown-menu { display:block !important; }
    .sd-dropdown-btn + .sd-dropdown-menu { display:none; }
    @media (hover:none) {
      .sd-dropdown-btn + .sd-dropdown-menu { display:none; }
      .sd-dropdown-btn.show + .sd-dropdown-menu { display:block !important; }
    }
  </style>
  <script>
    document.querySelector('.sd-dropdown-btn').addEventListener('click',function(e){
      var m=this.nextElementSibling;
      var isTouch='ontouchstart'in window;
      if(isTouch){e.preventDefault();this.classList.toggle('show');m.style.display=m.style.display==='block'?'none':'block';}
    });
    document.addEventListener('click',function(e){
      if(!e.target.closest('.sd-dropdown-btn,.sd-dropdown-menu')){
        var btn=document.querySelector('.sd-dropdown-btn');
        if(btn){btn.classList.remove('show');btn.nextElementSibling.style.display='none';}
      }
    });
  </script>`;
  return html;
}

// =============================================================
// Express app
// =============================================================
const app = express();

// ---- Health / operational endpoints ----

app.get('/healthz', (_req, res) => res.type('text/plain').send('ok'));

app.get('/readyz', (_req, res) => {
  const always = process.env.ALWAYS_READY === 'true';
  if (always || lastSuccessTime > 0) return res.type('text/plain').send('ready');
  res.status(503).type('text/plain').send('still initializing');
});

app.get('/status', (_req, res) => {
  res.json({
    pid: process.pid, uptime: Math.floor(process.uptime()),
    lastGeneration: lastSuccessTime ? new Date(lastSuccessTime).toISOString() : null,
    lastError, isGenerating, refreshInterval: REFRESH_SEC,
  });
});

// ---- Dashboard image ----

app.get('/dashboard.png', (_req, res) => {
  const png = path.join(OUTPUT_DIR, 'dashboard.png');
  if (fs.existsSync(png)) return res.sendFile(png);
  res.status(404).type('text/plain').send('dashboard.png not yet generated');
});

// ---- Kindle layout preview (from previewServer.js) ----

app.get('/', async (req, res) => {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return res.status(404).type('text/plain').send('config.yaml not found');
    }
    const config = await parseConfig(CONFIG_PATH);
    // Apply credential overrides from env (CRED__) so preview shows real data
    deepMerge(config.credentials, buildCredOverrides());
    let widgetsHtml = '';
    for (const item of config.layout) {
      if (item.row && Array.isArray(item.row)) {
        for (const wConfig of item.row) {
          widgetsHtml += await renderWidget(wConfig, config.credentials);
        }
      } else if (item.widget) {
        widgetsHtml += await renderWidget(item, config.credentials);
      }
    }
    let bgHtml = '';
    if (config.background && config.background.widget) {
      bgHtml = await renderWidget({ ...config.background, size: '5x7', isBackground: true }, config.credentials);
    }
    const baseTmpl = path.join(PROJECT_ROOT, 'src/templates/base.ejs');
    const html = await ejs.renderFile(baseTmpl, { widgetsHtml, backgroundHtml: bgHtml, isPreview: true });
    // Inject unified navbar at the top
    res.send(renderNavbar('home') + html);
  } catch (err) {
    console.error(err);
    res.status(500).send(`<pre>${err.stack}</pre>`);
  }
});

// ---- Widget Gallery (from previewServer.js) ----

app.get('/gallery', async (req, res) => {
  try {
    const widgetsDir = path.join(PROJECT_ROOT, 'src/widgets');
    const widgetNames = fs.readdirSync(widgetsDir).filter(f =>
      fs.statSync(path.join(widgetsDir, f)).isDirectory());
    const config = fs.existsSync(CONFIG_PATH) ? await parseConfig(CONFIG_PATH) : { credentials: {} };
    deepMerge(config.credentials, buildCredOverrides());
    // Gallery 内容（在内联 nav 按钮之前插入 navbar）
    let galleryHtml = `<div class="max-w-7xl mx-auto p-8 relative" style="padding-top:60px">
        <h1 class="text-4xl font-bold mb-4 text-center text-gray-800">SlowDash Widget Gallery</h1>
        <p class="text-center text-gray-600 mb-12">浏览所有可用组件的尺寸形态（数据均为演示效果）。</p>`;

    for (const wName of widgetNames) {
      galleryHtml += `
        <div class="mb-16 bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center">
          <h2 class="text-3xl font-bold mb-6 text-gray-800 capitalize border-b-2 border-gray-800 pb-2 inline-block">${wName.replace(/_/g, ' ')}</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 32px; justify-content: center; align-items: flex-start; padding: 24px;">`;

      const fetcherPath = path.join(widgetsDir, wName, 'fetcher.js');
      let variants = [];
      if (fs.existsSync(fetcherPath)) {
        const fetcher = require(fetcherPath);
        if (fetcher.galleryVariants) variants = fetcher.galleryVariants;
        else if (fetcher.supportedSizes) variants = fetcher.supportedSizes.map(size => ({ size }));
        else variants = [{ size: '2x2' }, { size: '4x2' }, { size: '4x4' }];
      } else {
        variants = [{ size: '2x2' }, { size: '4x2' }, { size: '4x4' }];
      }
      for (const variant of variants) {
        const wc = { widget: wName, size: variant.size, type: variant.type, galleryMode: true };
        const rendered = await renderWidget(wc, config.credentials || {});
        const m = variant.size && variant.size.match(/^(\d+)x(\d+)$/);
        const cols = m ? parseInt(m[1]) : 2, rows = m ? parseInt(m[2]) : 2;
        const pxW = cols * 184 + (cols - 1) * 20, pxH = rows * 184 + (rows - 1) * 20;
        const scale = 0.56;
        galleryHtml += `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
            <div style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap;">
              ${variant.type ? variant.type + ' (' + variant.size + ')' : variant.size}
            </div>
            <div style="width: ${Math.round(pxW * scale)}px; height: ${Math.round(pxH * scale)}px; overflow: hidden; flex-shrink: 0;">
              <div style="width: ${pxW}px; height: ${pxH}px; transform: scale(${scale}); transform-origin: top left; position: relative;">
                ${rendered}
                <div class="grid-overlay-item hidden" style="position: absolute; inset: 0; pointer-events: none; z-index: 50;">
                  <div style="display: grid; grid-template-columns: repeat(${cols}, 184px); grid-template-rows: repeat(${rows}, 184px); gap: 20px; width: ${pxW}px; height: ${pxH}px;">
                    ${Array(cols * rows).fill('<div style="border: 3px solid #f9a8d4; background: rgba(252,231,243,0.2); border-radius: 32px;"></div>').join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>`;
      }
      galleryHtml += `</div></div>`;
    }

    res.send(`
      <!DOCTYPE html><html lang="zh-CN"><head>
      <title>Widget Gallery - SlowDash</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>body{background:#f3f4f6}</style></head>
      <body class="text-gray-900">${renderNavbar('gallery')}${galleryHtml}</div>
      <script>function toggleGrid(){document.querySelectorAll('.grid-overlay-item').forEach(e=>e.classList.toggle('hidden'))}</script>
      </body></html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send(`<pre>${err.stack}</pre>`);
  }
});

// ---- /png — 当前看板展示页 ----

app.get('/png', (req, res) => {
  const pngPath = path.join(OUTPUT_DIR, 'dashboard.png');
  const exists = fs.existsSync(pngPath);
  let imgTag;
  if (exists) {
    const stat = fs.statSync(pngPath);
    const sizeKB = (stat.size / 1024).toFixed(0);
    imgTag = `<img src="/dashboard.png?t=${Date.now()}" style="max-width:100%;max-height:75vh;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);image-rendering:pixelated;" alt="SlowDash 看板">`;
  } else {
    imgTag = `<div style="background:#f0f0f0;border:2px dashed #ccc;border-radius:12px;padding:60px 40px;color:#999;font-size:18px;text-align:center">⏳ 看板尚未生成<br><span style="font-size:14px;">首次生成后自动显示</span></div>`;
  }

  res.send(`<!DOCTYPE html><html lang="zh-CN"><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>SlowDash 当前看板</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:#e8e8e8;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;flex-direction:column;align-items:center;min-height:100vh;padding:60px 16px 24px}
      h1{font-size:20px;font-weight:700;margin-bottom:4px;color:#333}
      .frame{background:#fff;border-radius:16px;padding:20px;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:90vw;display:flex;flex-direction:column;align-items:center;margin-bottom:20px}
      .info{color:#666;font-size:13px;margin-bottom:14px;text-align:center;line-height:1.6}
      .info .ok{color:#2a2;font-weight:600}
      .info .err{color:#c33;font-weight:600}
      .info .label{color:#999}
    </style></head><body>
    ${renderNavbar('png')}
    <h1>📋 SlowDash 当前看板</h1>
    <div class="info" id="status">加载中…</div>
    <div class="frame">${imgTag}</div>
    <div style="margin-top:4px">
      <label style="font-size:13px;color:#666;cursor:pointer;user-select:none">
        <input type="checkbox" id="autoReload" checked onchange="toggleReload()"> 自动刷新（30s）
      </label>
    </div>
    <script>
      // 状态轮询
      var statusEl = document.getElementById('status');
      var lastSuccess = ${lastSuccessTime || 0};
      var refreshSec = ${REFRESH_SEC};
      function updateStatus() {
        fetch('/status').then(function(r){return r.json()}).then(function(d){
          var parts = [];
          if (d.lastGeneration) {
            var t = new Date(d.lastGeneration);
            parts.push('<span class="label">上次生成</span> ' + t.toLocaleString('zh-CN'));
            if (refreshSec > 0 && lastSuccess > 0) {
              var next = lastSuccess + refreshSec * 1000;
              var rem = Math.max(0, Math.round((next - Date.now()) / 1000));
              if (rem > 0) {
                var m = Math.floor(rem / 60), s = rem % 60;
                parts.push('<span class="label">下次刷新</span> ' + m + '分' + s + '秒后');
              } else {
                parts.push('<span class="label">下次刷新</span> 即将开始…');
              }
            } else if (refreshSec === 0) {
              parts.push('<span class="label">模式</span> 手动');
            }
            if (d.lastError) {
              parts.push('<span class="err">❌ 失败:</span> ' + d.lastError);
            } else {
              parts.push('<span class="ok">✅ 正常</span>');
            }
          } else {
            parts.push('⏳ 尚未生成');
          }
          statusEl.innerHTML = parts.join(' · ');
        }).catch(function(){
          statusEl.innerHTML = '<span class="err">⚠️ 无法连接</span>';
        });
      }
      updateStatus();
      setInterval(updateStatus, 3000);
      // 自动刷新
      var timer;
      function toggleReload(){if(document.getElementById('autoReload').checked){timer=setInterval(function(){location.reload()},30000)}else{clearInterval(timer)}}
      document.getElementById('autoReload').dispatchEvent(new Event('change'));
    </script>
  </body></html>`);
});

// =============================================================
// Start
// =============================================================
async function main() {
  const server = app.listen(SERVER_PORT, HOST, () => {
    console.log(`🚀 SlowDash running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${SERVER_PORT}`);
    console.log(`   Config: ${CONFIG_PATH}`);
    console.log(`   Output: ${OUTPUT_DIR}`);
    if (REFRESH_SEC > 0) {
      console.log(`   Auto-refresh: every ${REFRESH_SEC}s`);
    } else {
      console.log(`   Auto-refresh: disabled (REFRESH_INTERVAL=0)`);
    }
    console.log(`   Routes:`);
    console.log(`   /            Kindle 布局预览`);
    console.log(`   /gallery     Widget 画廊`);
    console.log(`   /png         当前看板展示`);
    console.log(`   /dashboard.png 原始 PNG`);
    console.log(`   /healthz     Liveness`);
    console.log(`   /readyz      Readiness`);
    console.log(`   /status      JSON 状态`);
  }).on('error', (err) => {
    if (err.code === 'EADDRNOTAVAIL') {
      app.listen(SERVER_PORT, '0.0.0.0', () => console.log(`🚀 SlowDash fallback to http://0.0.0.0:${SERVER_PORT}`));
    } else {
      console.error(err);
      process.exit(1);
    }
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n[server] ${signal}, shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  // CSI-u terminal support
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => {
    if (d.includes('\u0003') || d.includes('99;5u')) shutdown('SIGINT(CSI-u)');
  });

  // Run initial generation if auto-refresh enabled
  if (REFRESH_SEC > 0) {
    console.log('[server] Running initial generation...');
    runGeneration().catch(err => console.error('[server] Initial generation error:', err.message));

    const intervalMs = REFRESH_SEC * 1000;
    setInterval(() => runGeneration().catch(err => console.error('[server] Generation error:', err.message)), intervalMs);
    console.log(`[server] Next refresh in ${REFRESH_SEC}s`);
  }
}

main().catch(err => { console.error('[FATAL]', err); process.exit(1); });
