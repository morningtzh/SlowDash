# WeRead 微信读书组件设计规范

## 概述
* **用途**：展示用户的微信读书数据，体现坚持阅读的打卡感。
* **数据源**：微信读书网页版 API。
* **凭证要求**：`cookie` (由于微信反扒，必须提取 Web 端的有效 Cookie)。
* **Fetcher 返回**：`{ readTime: "125小时30分", readDays: 365, booksCount: 42 }`

---

## Type: stats (横向统计条)
非常典型的纯数据流展示，通过粗黑的数字压住版面。

### 尺寸支持
* **Size: 2x1 (388 × 184 px)**：紧凑排布 2-3 个核心指标。
* **Size: 3x1 (592 × 184 px)**：标准排布，三项数据等距分布。
* **Size: 5x1 (1000 × 184 px)**：满宽排布，极其宽裕的呼吸空间。

### 布局与样式 (以 3x1 为例)
* **ASCII Layout**:
```text
┌────────────────────────────────────────────────────────┐
│ WEREAD                                                 │
│       365       │     125h30m     │       42           │
│      连续天数    │      阅读时长     │      读过书籍       │
└────────────────────────────────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `relative w-full h-full flex items-center justify-evenly p-4`
  * 左上角标识: `absolute top-3 left-4 text-[9px] font-black tracking-widest uppercase opacity-40`
  * 子数据块: `flex flex-col items-center`
  * 大数字: `text-3xl font-black text-black leading-none`
  * 小中文单位: `text-[10px] text-gray-500 font-bold tracking-widest mt-2`
  * 分割线: `w-px h-10 bg-gray-300`

---

## Type: detail (详细面板)
占据更大屏幕面积，适合作为版面核心部件，赋予读书打卡更高的优先级。

### Size: 2x2 (388 × 388 px)
* **布局说明**：垂直居中的数据罗列，由三行巨大的数字和标签构成。
* **ASCII Layout**:
```text
┌──────────────────────────────┐
│ WEREAD                       │
│                              │
│             365              │
│            天连续            │
│                              │
│           125h30m            │
│           总阅读长           │
│                              │
│              42              │
│            本读过            │
└──────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `relative w-full h-full flex flex-col justify-center items-center gap-6 p-4`
  * 将分割线替换为视觉留白 (Gap)。数字字体可加大到 `text-4xl`。

### Size: 3x2 (592 × 388 px)
* **布局说明**：横向三列平铺，由于高度增加，可以在底部放置一个“本周阅读进度”或静态的图形占位（未来扩展）。

---

## Gallery 变体配置 (fetcher.js)
```javascript
module.exports.galleryVariants = [
  { size: '2x1', type: 'stats' },
  { size: '3x1', type: 'stats' },
  { size: '5x1', type: 'stats' },
  { size: '2x2', type: 'detail' }
];
```

## 溢出防范
* 返回的 `readTime` 可能包含中文字符如“小时”，如果字体过大会导致单行撑爆。
* 开发时应考虑将带有中文字符的长字符串中的中文部分字体缩小，或直接在子容器上施加 `truncate` 防范。
