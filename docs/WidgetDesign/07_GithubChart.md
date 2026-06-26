# GithubChart 组件设计规范

## 概述
* **用途**：展示 GitHub 一年内的贡献热力图 (Contribution Graph)。
* **数据源**：直接拉取 GitHub 用户主页的热力图 SVG。
* **凭证要求**：`username` (公开的 GitHub 用户名)。
* **Fetcher 返回**：`{ svgContent: "<svg>...</svg>", error: null }`。

---

## Type: heatmap (贡献热力图)
将经典的绿色方块阵列转化为墨水屏风格的灰度阵列。

### 尺寸支持
* **Size: 4x1 (796 × 184 px)**：高度极其紧凑。必须剥除所有的图例 (Legend) 和月份文本，仅留下纯粹的方格矩阵。
* **Size: 4x2 (796 × 388 px)**：标准比例，可容纳月份文本标签以及左上角的用户名标题。
* **Size: 5x2 (1000 × 388 px)**：满宽版，最适合长达 52 周的数据横向舒展。

### 布局与样式 (以 4x2 为例)
* **ASCII Layout**:
```text
┌────────────────────────────────────────────────────────┐
│ GITHUB: MORNINGTZH                                     │
│                                                        │
│   Jan   Feb   Mar   Apr   May   Jun   Jul   Aug      │
│ ■ ░ ▒ ■ ░ ░ ■ ░ ▒ ■ ░ ░ ■ ░ ▒ ■ ░ ░ ■ ░ ▒ ■ ░ ░        │
│ ░ ■ ░ ▒ ■ ░ ░ ■ ░ ▒ ■ ░ ░ ■ ░ ▒ ■ ░ ░ ■ ░ ▒ ■ ░        │
│ ▒ ■ ░ ░ ■ ░ ▒ ■ ░ ░ ■ ░ ▒ ■ ░ ░ ■ ░ ▒ ■ ░ ░ ■ ░        │
│ ■ ░ ▒ ■ ░ ░ ■ ░ ▒ ■ ░ ░ ■ ░ ▒ ■ ░ ░ ■ ░ ▒ ■ ░ ░        │
│                                                        │
│ Less ░ ▒ ▓ ■ More                                      │
└────────────────────────────────────────────────────────┘
```
* **SVG 开发注意 (核心难点)**：
  1. Fetcher 拉下来的 SVG 是带有硬编码 `width` 和 `height` 的。**必须用正则或 cheerio 删除原生宽高**。
  2. 给 SVG 强制添加类名 `w-full h-full` 并确保带有 `viewBox`。
  3. **灰度转换**：GitHub 默认使用绿色的不同色阶填充 `<rect>`。在模版中必须使用 CSS 选择器或正则，将它们映射为墨水屏对比度极高的黑灰阶。例如：填充 `<rect data-level="1">` 为 `#e5e7eb`，`data-level="4"` 为 `#000000`。
  4. 外层容器需要有 `p-4` 内边距防止方块紧贴黑框。

---

## Type: stats (贡献统计)
不展示图表，纯数字汇总，与其他数据流组件保持一致的视觉节奏。

### Size: 2x1 (388 × 184 px)
* **布局说明**：左侧显示总贡献数字，右侧显示 "Contributions" 和年份标签。
* **核心 Tailwind Classes**:
  * 容器: `flex items-center justify-center gap-4`。
  * 数字: `text-5xl font-black`。

### Size: 1x1 (184 × 184 px)
* **布局说明**：极简数字块。居中大数字，底部标 "CONTRIBUTIONS"。

---

## Gallery 变体配置 (fetcher.js)
```javascript
module.exports.galleryVariants = [
  { size: '4x1', type: 'heatmap' },
  { size: '4x2', type: 'heatmap' },
  { size: '5x2', type: 'heatmap' },
  { size: '2x1', type: 'stats' },
  { size: '1x1', type: 'stats' }
];
```

## 溢出防范
* SVG 图表极易因为 `viewBox` 缩放模式 (`preserveAspectRatio`) 设置不当而超出外框或缩小得无法看清。建议使用 `preserveAspectRatio="xMidYMid meet"`。
