const { chromium } = require('playwright');

async function renderToImage(htmlContent, settings) {
  if (!htmlContent) {
    throw new Error('HTML content cannot be empty');
  }

  let width = 1072;
  let height = 1448;
  if (settings.resolution) {
    const parts = settings.resolution.split('x');
    if (parts.length === 2) {
      width = parseInt(parts[0], 10);
      height = parseInt(parts[1], 10);
    }
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext({
      viewport: { width, height }
    });
    
    const page = await context.newPage();

    // 【修改点 1】: 将 waitUntil 从 domcontentloaded 改为 networkidle，确保外部资源请求完成
    // 设置基础超时时间为 20s，防止复杂页面卡死
    await page.setContent(htmlContent, { waitUntil: 'networkidle', timeout: 60000 });
    
    // 显式等待所有图像完全加载并解码 (修复 Unsplash & Plex 背景图空白问题)
    await page.evaluate(async () => {
      const promises = [];

      // 1. 常规 <img> 标签
      const imgs = Array.from(document.querySelectorAll('img'));
      imgs.forEach(img => {
        if (img.complete) return;
        promises.push(new Promise((resolve) => {
          img.onload = () => img.decode().then(resolve).catch(resolve);
          img.onerror = resolve; // 遇到错误也 resolve，防止阻塞整个渲染进程
          setTimeout(resolve, 15000); // 【修改点 2】: 超时延长至 15 秒
        }));
      });

      // 2. CSS background-image URLs
      const elements = Array.from(document.querySelectorAll('*'));
      elements.forEach(el => {
        const bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
          if (match && match[1] && !match[1].startsWith('data:')) {
            promises.push(new Promise((resolve) => {
              const tempImg = new Image();
              // 【修改点 3】: 利用 decode() 确保浏览器已经将图片光栅化并准备好绘制
              tempImg.onload = () => {
                tempImg.decode().then(resolve).catch(resolve);
              };
              tempImg.onerror = resolve; // 容错处理
              tempImg.src = match[1];
              setTimeout(resolve, 15000); 
            }));
          }
        }
      });

      // 【修改点 4】: 使用 allSettled 确保所有 Promise 无论成功失败都会完结
      await Promise.allSettled(promises);
    });
    
    // 给浏览器最终的光栅化 (Rasterization) 留出一点缓冲时间
    await page.waitForTimeout(800);

    if (settings.color_mode === 'grayscale') {
      // 增加对比度(contrast)和调整亮度(brightness)，针对墨水屏 16 级灰度优化阶调
      await page.addStyleTag({ content: 'html { filter: grayscale(100%) contrast(1.2) brightness(0.95); }' });
    }

    const imageBuffer = await page.screenshot({ type: 'png' });
    
    return imageBuffer;
  } catch (error) {
    console.error('[Renderer Error] Failed to render image:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { renderToImage };