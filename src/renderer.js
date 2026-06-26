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

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width, height }
  });
  
  const page = await context.newPage();

  await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  if (settings.color_mode === 'grayscale') {
    // 增加对比度(contrast)和调整亮度(brightness)，针对墨水屏 16 级灰度优化阶调
    await page.addStyleTag({ content: 'html { filter: grayscale(100%) contrast(1.2) brightness(0.95); }' });
  }

  const imageBuffer = await page.screenshot({ type: 'png' });
  
  await browser.close();

  return imageBuffer;
}

module.exports = { renderToImage };
