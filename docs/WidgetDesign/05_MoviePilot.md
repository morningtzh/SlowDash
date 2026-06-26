# MoviePilot 组件设计规范

## 概述
* **用途**：展示 MoviePilot 自动化系统的基础统计信息（如电影订阅数、下载任务数等）。
* **数据源**：MoviePilot 插件系统 API (`/api/v1/plugin/HomePage/statistic`)。
* **前置条件**：需在 MP 中安装并开启 HomePage 插件。
* **凭证要求**：`url` (MP 地址), `api_token` (MP 的 API Key)。
* **Fetcher 返回**：`{ stats: { movie_subscribes, tv_subscribes, downloading, seeding }, posters: [] }`

---

## Type: stats (统计数据流)
横向键值对平铺，适合作为看板的顶栏或底栏。

### 尺寸支持
* **Size: 2x1 (388 × 184 px)**：紧凑显示前 2 个统计指标。
* **Size: 3x1 (592 × 184 px)**：显示 3-4 个指标。
* **Size: 5x1 (1000 × 184 px)**：满宽版，分布得极具呼吸感。

### 布局与样式 (以 5x1 为例)
* **ASCII Layout**:
```text
┌────────────────────────────────────────────────────────┐
│ MOVIEPILOT                                             │
│       12        │        5        │       189          │
│      电影        │       剧集       │       做种          │
└────────────────────────────────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `relative w-full h-full flex items-center justify-evenly p-4`
  * 左上角小标: `absolute top-3 left-4 text-[9px] font-black uppercase opacity-40`
  * 子项块: `flex flex-col items-center min-w-0`
  * 数字: `text-4xl font-black text-black leading-none tabular-nums truncate`
  * 标签: `text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2`
  * 分割线: 每两个子项间插入 `w-px h-8 bg-black opacity-20`。

---

## Type: dashboard (综合数据盘)
利用较大的垂直空间，展示更详细或字号更大的数据排版，增强视觉重心。

### Size: 2x2 (388 × 388 px)
* **布局说明**：垂直居中展示，适合将重点数据（如总订阅数、当前下载数）放大展示。
* **ASCII Layout**:
```text
┌──────────────────────────────┐
│ MOVIEPILOT STATS             │
│                              │
│             17               │
│          总订阅数            │
│                              │
│              2               │
│          当前下载            │
└──────────────────────────────┘
```

---

## Gallery 变体配置 (fetcher.js)
```javascript
module.exports.galleryVariants = [
  { size: '2x1', type: 'stats' },
  { size: '3x1', type: 'stats' },
  { size: '5x1', type: 'stats' },
  { size: '2x2', type: 'dashboard' }
];
```

## 溢出防范
* MoviePilot 的 `seeding` (做种数) 可能会达到上千甚至上万。在 `stats` 布局中，数字外围的 Flex 容器一定要加 `min-w-0 flex-shrink`，同时数字文本加 `truncate`，防止数字过长挤没其他列。
