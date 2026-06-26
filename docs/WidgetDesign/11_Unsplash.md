# Unsplash / 画廊组件设计规范

## 概述
* **用途**：提供大面积的高灰度黑白摄影图片，为数据密集的看板提供视觉喘息空间。
* **数据源**：Picsum Photos API 或 Unsplash API。
* **凭证要求**：无（若用 Picsum）。
* **Fetcher 返回**：`{ imageUrl: "https://picsum.photos/..." }`

---

## Type: gallery (艺术画廊区块)
嵌套在网格中的独立画廊区块，带有圆角。

### 尺寸支持
* **Size: 2x2 (388 × 388 px)**：标准正方形画作。
* **Size: 3x3 (592 × 592 px)**：大型视觉焦点。
* **Size: 4x4 (796 × 796 px)**：超大型沉浸展示。

### 布局与样式
* **ASCII Layout**:
```text
┌──────────────────────────────┐
│                              │
│                              │
│    [Grayscale Image BG]      │
│                              │
│                              │
│                      GALLERY │
└──────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `relative w-full h-full rounded-[32px] overflow-hidden bg-gray-200` (外层引擎自动包裹了 rounded-32px，但内层图片依然需要确保圆角不溢出)。
  * 图片层: `absolute inset-0 bg-cover bg-center`
  * 墨水屏核心滤镜 (内联): `style="background-image: url(...); filter: grayscale(100%) contrast(1.2) brightness(0.95);"`
  * 标签徽章: 放置在右下角，`absolute bottom-4 right-4 bg-white text-black px-2 py-1 text-[9px] font-bold uppercase tracking-widest shadow`。

---

## Type: background (全屏背景)
放置在 `config.yaml` 根级 `background:` 字段下的专用类型，自动绕过常规的圆角黑边外框。

### 尺寸自动设定为 5x7 (1000 × 1408 px，但实际渲染 1072x1448)
* **布局说明**：作为全屏壁纸，由于引擎的特殊判断机制 (`isBackground`)，会被渲染在最底层 `Z-0`。
* **设计注意**：
  1. 它不会被加上常规 widget 的白底黑边大圆角，而是纯净覆盖整块屏幕（包含 20px 36px 的 safe-area 留白区边距）。
  2. 强制使用极其暗淡、模糊的特效，图片 `brightness` 极低，且配合 `mix-blend-multiply opacity-20` 与白底融合，作为一种高级底纹存在，不干扰上方悬浮数据。
  3. 依然保留了一个极小的 "ART" 边角标签在右下方。

---

## Gallery 变体配置 (fetcher.js)
```javascript
module.exports.galleryVariants = [
  { size: '2x2', type: 'gallery' },
  { size: '3x3', type: 'gallery' },
  { size: '5x4', type: 'background' }
];
```

## 墨水屏优化建议
1. 墨水屏只有 16 级灰度，展示复杂的风景图容易出现“色带”或断层。在 API 请求参数中尽量请求带 `/grayscale` 标志的图片。
2. 不要在模板中使用 `<img class="object-cover w-full h-full">`，因为缩放时极易引发布局漂移。请坚持使用 `div` + `background-image: url(...)` 的组合。
