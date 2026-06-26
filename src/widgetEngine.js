const ejs = require('ejs');
const path = require('path');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const fs = require('fs');

function getGridClasses(size) {
  // 严格的 5x7 网格尺寸映射表，所有可能的类名都写死在此
  // 避免动态拼接字符串导致 Tailwind PurgeCSS 剔除类名
  const map = {
    // 标准数字尺寸
    '1x1': 'col-span-1 row-span-1',
    '1x2': 'col-span-1 row-span-2',
    '1x3': 'col-span-1 row-span-3',
    '1x4': 'col-span-1 row-span-4',
    '2x1': 'col-span-2 row-span-1',
    '2x2': 'col-span-2 row-span-2',
    '2x3': 'col-span-2 row-span-3',
    '2x4': 'col-span-2 row-span-4',
    '3x1': 'col-span-3 row-span-1',
    '3x2': 'col-span-3 row-span-2',
    '3x3': 'col-span-3 row-span-3',
    '3x4': 'col-span-3 row-span-4',
    '4x1': 'col-span-4 row-span-1',
    '4x2': 'col-span-4 row-span-2',
    '4x3': 'col-span-4 row-span-3',
    '4x4': 'col-span-4 row-span-4',
    '5x1': 'col-span-5 row-span-1',
    '5x2': 'col-span-5 row-span-2',
    '5x3': 'col-span-5 row-span-3',
    '5x4': 'col-span-5 row-span-4',
    '5x5': 'col-span-5 row-span-5',
    '5x7': 'col-span-5 row-span-7',

    // 语义化别名
    'small':  'col-span-1 row-span-1',
    'medium': 'col-span-2 row-span-2',
    'large':  'col-span-5 row-span-4',
  };

  return map[size] || 'col-span-1 row-span-1'; // 找不到默认 1x1
}

async function renderWidget(widgetConfig, globalCredentials = {}) {
  const widgetName = widgetConfig.widget;
  const widgetDir = path.join(__dirname, 'widgets', widgetName);
  const sizeClasses = getGridClasses(widgetConfig.size || 'small');

  // 合并全局凭据与组件内部排版配置
  const mergedConfig = { 
    ...globalCredentials[widgetName], 
    ...widgetConfig 
  };

  // Widget Wrapper (Handles the standard rounded corners and grid sizing)
  // 墨水屏高反差：纯白底、2px 纯黑边框、32px 统一大圆角
  const wrapperStart = `<div class="${sizeClasses} bg-white rounded-[32px] overflow-hidden flex w-full h-full border-2 border-black box-border relative">`;
  const wrapperEnd = `</div>`;

  if (!fs.existsSync(widgetDir)) {
    // If widget not implemented yet, return a skeleton placeholder
    return `${wrapperStart}<div class="p-6 w-full h-full flex flex-col items-center justify-center text-black bg-white border-2 border-dashed border-black rounded-[32px] m-2"><p class="text-xl font-bold mb-2">${widgetName}</p><p class="text-sm font-medium">(Waiting for API keys)</p></div>${wrapperEnd}`;
  }

  // TDD placeholder simulation for error test
  if (widgetConfig.simulateError) {
    return `${wrapperStart}<div class="p-4 text-black font-bold">Widget Error: Failed to load data</div>${wrapperEnd}`;
  }

  try {
    const fetcher = require(path.join(widgetDir, 'fetcher.js'));
    const templatePath = path.join(widgetDir, 'template.ejs');
    
    const data = await fetcher(mergedConfig);
    const renderData = { ...data, config: mergedConfig };
    const innerHtml = await ejs.renderFile(templatePath, renderData);
    
    return `${wrapperStart}${innerHtml}${wrapperEnd}`;
  } catch (err) {
    console.error(`Error rendering widget ${widgetName}:`, err);
    return `${wrapperStart}<div class="p-4 text-black font-bold">Error rendering: ${widgetName}</div>${wrapperEnd}`;
  }
}

module.exports = { renderWidget };
