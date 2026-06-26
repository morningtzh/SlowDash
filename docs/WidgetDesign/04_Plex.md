# Plex 媒体库组件设计规范

## 概述
* **用途**：展示 Plex 媒体库中最新添加的影片海报，或者随机展示单张海报作为看板的视觉点缀。
* **数据源**：Plex Media Server API (`/library/sections/1/all?sort=addedAt:desc`)。
* **凭证要求**：`url` (Plex 服务器地址), `token` (X-Plex-Token)。
* **Fetcher 返回**：`{ posters: ["url1", "url2", ...], error: null }`

---

## Type: poster / random_poster (单体海报推荐)
用于在看板的垂直长条区域展示单张大尺寸海报。
* `poster`: 默认展示最近添加的第一张海报。
* `random_poster`: 随机从最近添加的媒体库中抽取一张海报展示（每次看板刷新都有惊喜）。

### Size: 2x3 (388 × 592 px)
* **布局说明**：垂直满铺海报，底部带有半透明黑色渐变蒙版，用于显示白色标题（目前 API 只取图片，未来若取了文字可在此叠加）。
* **ASCII Layout**:
```text
┌──────────────────────────────┐
│ [Background Image]           │
│                              │
│                              │
│                              │
│                              │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ MOVIE OF THE DAY             │
└──────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `relative w-full h-full bg-cover bg-center overflow-hidden` (背景图通过 style 内联注入)。
  * 滤镜 (非常关键): `style="filter: grayscale(100%) contrast(1.25) brightness(0.9);"` 以适应墨水屏。
  * 底部遮罩(如有文本): `absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-black to-transparent flex items-end p-4`

### Size: 2x4 (388 × 796 px)
* **布局说明**：更高瘦的海报展示区域，逻辑与 `2x3` 相同，展现更多的画面细节。

---

## Type: recently_added (最新入库)
横向小海报矩阵，以瀑布流或网格形式展现。

### 尺寸支持
* **Size: 5x1 (1000 × 184 px)**: 单行排布，展示 5-6 张海报。
* **Size: 5x2 (1000 × 388 px)**: 两行排布，展示 10 张海报 (5x2 网格)。
* **Size: 5x3 (1000 × 592 px)**: 三行排布，展示 15 张海报 (5x3 网格)。

### 布局与样式 (以 5x2 为例)
* **ASCII Layout**:
```text
┌────────────────────────────────────────────────────────┐
│ PLEX RECENTLY ADDED                                    │
│  [Img]   [Img]   [Img]   [Img]   [Img]                 │
│  [Img]   [Img]   [Img]   [Img]   [Img]                 │
└────────────────────────────────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `flex flex-col w-full h-full p-4 relative`
  * 标题: `text-[10px] text-gray-500 font-bold uppercase mb-3 flex justify-between`
  * 网格区: `flex-grow grid grid-cols-5 gap-4`
  * 海报图片: `bg-cover bg-center grayscale shadow-sm border border-gray-300 rounded-lg aspect-[2/3]`

---

## Type: poster_wall (散落海报墙)
用于以“完全自适应面积”的物理级凌乱美学或工整网格展示多张海报。

### 核心参数支持
* `count`: 随机获取的海报张数 (默认: 6)
* `arrangement`: 
  * `overlap` (重叠散落): 海报大小完全无视数量，强制占满容器短边的 60%，并使用放射状算法以绝对定位散落在各处，产生极强的遮挡错落张力。
  * `compact` (紧凑平铺): 极小缝隙 (`gap-1`) 的网格平铺。
  * `loose` (松散平铺): 巨大缝隙 (`gap-6`) 的画廊平铺。
  * *注：平铺模式的海报大小会根据容器绝对面积 (wPx × hPx) 和 `count` 数量进行精确的数学级自适应计算开方。*

### Size 支持 (全尺寸兼容)
得益于算法底座，该类型兼容从 `2x2` 到 `5x7` 的**任意尺寸**。引擎会智能算出国标海报比例 (aspect 2:3) 对应的最佳绝对像素 (px)。

### ASCII Layout (overlap 模式)
```text
┌──────────────────────────────────────┐
│ POSTER WALL                 [Img]    │
│            [Img]             │       │
│             │        [Img]   │       │
│     [Img]   │         │              │
│      │               [Img]           │
└──────────────────────────────────────┘
```

---

## Type: background (全版背景)
作为整个看板或极大部分区域的底层视觉背景。

### Size: 5x4 (1000 × 796 px) / Size: 5x7 (1000 × 1408 px 全屏)
* **布局说明**：大面积背景图，需极其重的灰度和对比度处理，防止干扰前方的其他浮动组件。
* **核心 Tailwind Classes**:
  * 容器: `relative w-full h-full bg-black flex items-center justify-center`
  * 图片层: `absolute inset-0 bg-cover bg-center mix-blend-screen opacity-70` + `filter: grayscale(100%) contrast(1.2)`
  * 徽标: 右下角加上 `PLEX` 纯白小标签，表明图片来源。

---

## Gallery 变体配置 (fetcher.js)
```javascript
module.exports.galleryVariants = [
  { size: '2x3', type: 'poster' },
  { size: '5x2', type: 'recently_added' },
  { size: '5x4', type: 'background' }
];
```

## 开发注意
* **图片裁剪**：绝不使用 `<img src="...">` 强行改变宽高比。必须使用 `<div style="background-image: url(...)">` 配合 `bg-cover bg-center` 以实现绝对完美的裁剪。
* **性能与大小**：如果是 `recently_added`，只取前 N 条数据渲染，别渲染出屏幕外看不见的海报。
