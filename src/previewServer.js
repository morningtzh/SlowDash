const express = require('express');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
const { parseConfig } = require('./configParser');
const { renderWidget } = require('./widgetEngine');

const app = express();
const port = 3000;
const host = '192.168.31.233';

// 1. 原有的 Kindle 布局预览
app.get('/', async (req, res) => {
  try {
    const configPath = path.join(__dirname, '..', 'config.yaml');
    if (!fs.existsSync(configPath)) {
      return res.status(404).send('config.yaml not found at root');
    }

    const config = await parseConfig(configPath);
    let widgetsHtml = '';

    for (const item of config.layout) {
      if (item.row && Array.isArray(item.row)) {
        for (const wConfig of item.row) {
          const widgetHtml = await renderWidget(wConfig, config.credentials);
          widgetsHtml += widgetHtml;
        }
      } else if (item.widget) {
        const widgetHtml = await renderWidget(item, config.credentials);
        widgetsHtml += widgetHtml;
      }
    }

    let backgroundHtml = '';
    if (config.background && config.background.widget) {
      const bgConfig = { ...config.background, size: '5x7', isBackground: true };
      backgroundHtml = await renderWidget(bgConfig, config.credentials);
    }

    const baseTemplatePath = path.join(__dirname, 'templates', 'base.ejs');
    const fullHtml = await ejs.renderFile(baseTemplatePath, { widgetsHtml, backgroundHtml, isPreview: true });
    
    res.send(fullHtml);
  } catch (error) {
    console.error(error);
    res.status(500).send(`<pre>${error.stack}</pre>`);
  }
});

// 2. 新增的 Widget Gallery 画廊
app.get('/gallery', async (req, res) => {
  try {
    const widgetsDir = path.join(__dirname, 'widgets');
    const widgetNames = fs.readdirSync(widgetsDir).filter(f => fs.statSync(path.join(widgetsDir, f)).isDirectory());
    
    let galleryHtml = `
      <div class="max-w-7xl mx-auto p-8 relative">
        <div class="absolute top-8 left-8 flex gap-4">
          <a href="/" class="bg-black text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-gray-800 transition">← 回到主面板 (Home)</a>
          <button onclick="window.location.reload()" class="bg-white text-black border-2 border-black px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-gray-100 transition">🔄 强制刷新</button>
          <button onclick="toggleGrid()" class="bg-pink-100 text-pink-700 border-2 border-pink-300 px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-pink-200 transition">📏 显示/隐藏网格</button>
        </div>
        <h1 class="text-4xl font-bold mb-4 text-center text-gray-800 mt-12">SlowDash Widget Gallery</h1>
        <p class="text-center text-gray-600 mb-12">浏览所有可用组件的尺寸形态（数据均为演示效果）。</p>
    `;

    const configPath = path.join(__dirname, '..', 'config.yaml');
    const config = fs.existsSync(configPath) ? await parseConfig(configPath) : { credentials: {} };

    for (const wName of widgetNames) {
      galleryHtml += `
        <div class="mb-16 bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center">
          <h2 class="text-3xl font-bold mb-6 text-gray-800 capitalize border-b-2 border-gray-800 pb-2 inline-block">${wName.replace('_', ' ')}</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 32px; justify-content: center; align-items: flex-start; padding: 24px;">
      `;
      
      const fetcherPath = path.join(widgetsDir, wName, 'fetcher.js');
      let variants = []; 
      
      if (fs.existsSync(fetcherPath)) {
        const fetcher = require(fetcherPath);
        if (fetcher.galleryVariants) {
          variants = fetcher.galleryVariants;
        } else if (fetcher.supportedSizes) {
          variants = fetcher.supportedSizes.map(size => ({ size }));
        } else {
          variants = [{ size: '2x2' }, { size: '4x2' }, { size: '4x4' }];
        }
      } else {
        variants = [{ size: '2x2' }, { size: '4x2' }, { size: '4x4' }];
      }

      for (const variant of variants) {
        const widgetConfig = { widget: wName, size: variant.size, type: variant.type, galleryMode: true };
        const widgetRendered = await renderWidget(widgetConfig, config.credentials || {});
        
        // 计算 Widget 在 Kindle 规范下的真实像素尺寸 (184px 基准 + 20px 间距)
        const sizeAliases = { 'small': [1,1], 'medium': [2,2], 'large': [5,4] };
        const m = variant.size && variant.size.match(/^(\d+)x(\d+)$/);
        const cols = m ? parseInt(m[1]) : (sizeAliases[variant.size] || [2,2])[0];
        const rows = m ? parseInt(m[2]) : (sizeAliases[variant.size] || [2,2])[1];
        const pxW = cols * 184 + (cols - 1) * 20;
        const pxH = rows * 184 + (rows - 1) * 20;
        // 缩放系数与 Kindle 预览页保持一致
        const scale = 0.56;
        const dispW = Math.round(pxW * scale);
        const dispH = Math.round(pxH * scale);
        // 网格叠加层单元格
        const gridCells = Array(cols * rows).fill('<div style="border: 3px solid #f9a8d4; background: rgba(252,231,243,0.2); border-radius: 32px;"></div>').join('');
        
        galleryHtml += `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
            <div style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap;">
              ${variant.type ? variant.type + ' (' + variant.size + ')' : variant.size}
            </div>
            <div style="width: ${dispW}px; height: ${dispH}px; overflow: hidden; flex-shrink: 0;">
              <div style="width: ${pxW}px; height: ${pxH}px; transform: scale(${scale}); transform-origin: top left; position: relative;">
                ${widgetRendered}
                <div class="grid-overlay-item hidden" style="position: absolute; inset: 0; pointer-events: none; z-index: 50;">
                  <div style="display: grid; grid-template-columns: repeat(${cols}, 184px); grid-template-rows: repeat(${rows}, 184px); gap: 20px; width: ${pxW}px; height: ${pxH}px;">
                    ${gridCells}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      
      galleryHtml += `
          </div>
        </div>
      `;
    }

    galleryHtml += `</div>`;

    const template = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <title>Widget Gallery - SlowDash</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { background-color: #f3f4f6; }
      </style>
    </head>
    <body class="text-gray-900">
      ${galleryHtml}
      <script>
        function toggleGrid() {
          const overlays = document.querySelectorAll('.grid-overlay-item');
          overlays.forEach(overlay => overlay.classList.toggle('hidden'));
        }
      </script>
    </body>
    </html>
    `;
    
    res.send(template);
  } catch (error) {
    console.error(error);
    res.status(500).send(`<pre>${error.stack}</pre>`);
  }
});

const server = app.listen(port, host, () => {
  console.log(`🚀 Preview Server running at http://${host}:${port}`);
  console.log(`   - Kindle Layout : http://${host}:${port}/`);
  console.log(`   - Widget Gallery: http://${host}:${port}/gallery`);
}).on('error', (err) => {
  if (err.code === 'EADDRNOTAVAIL') {
    app.listen(port, '0.0.0.0', () => {
       console.log(`🚀 Preview Server fallback to http://0.0.0.0:${port}`);
    });
  } else {
    console.error(err);
  }
});

// Handle Ctrl+C and exit immediately
process.on('SIGINT', () => {
  console.log('\nExiting preview server (SIGINT)...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nExiting preview server (SIGTERM)...');
  process.exit(0);
});

// Hack for modern terminals (Kitty, Wezterm, Ghostty etc) using CSI-u keyboard protocol.
// When CSI-u is enabled, Ctrl+C sends `\x1b[99;5u` instead of `\x03`, which bypasses the OS SIGINT handler.
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  if (data.includes('\u0003') || data.includes('99;5u')) {
    console.log('\nExiting preview server (Keyboard Interrupt detected on stdin)...');
    process.exit(0);
  }
});
