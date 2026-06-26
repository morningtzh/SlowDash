# Countdown 倒数日/纪念日 组件设计规范

## 概述
* **用途**：展示重要事件的剩余天数（倒计时）或已经过去的天数（纪念日）。
* **数据源**：用户本地配置数组。
* **数据结构**：`events: [{ name: "发薪日", date: "2024-05-15", event_type: "countdown" }]`
* **支持类型**：`countdown` (未来), `anniversary` (过去/正计时)。

---

## Type: single (常规单事件)
清晰简洁地展示单一事件。

### Size: 1x1 (184 × 184 px)
* **布局说明**：紧凑型方块。大数字居中，底部单行事件名称。
* **ASCII Layout**:
```text
┌──────────────┐
│COUNTDOWN     │
│              │
│     128      │
│     DAYS     │
│              │
│ 半程马拉松... │
└──────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `flex flex-col justify-center items-center relative w-full h-full p-3`
  * 左上角标签: `absolute top-2 left-2 text-[8px] font-bold text-gray-400 uppercase`
  * 数字: `text-4xl font-black tabular-nums leading-none`
  * 单位(days): `text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-1`
  * 事件名: `text-[10px] font-medium absolute bottom-3 w-[85%] text-center truncate` (强制单行截断)

### Size: 1x2 (184 × 388 px)
* **布局说明**：垂直长方形版，提供更多的上下呼吸空间，事件名称可允许换行显示两行。
* **ASCII Layout**:
```text
┌──────────────┐
│ ANNIVERSARY  │
│              │
│              │
│              │
│      365     │
│      DAYS    │
│              │
│              │
│ 首次发布版本 │
│ 纪念日        │
└──────────────┘
```
* **核心差异 Classes**:
  * 数字放大至 `text-6xl`。
  * 事件名使用 `text-sm font-bold line-clamp-2 break-words` 放于底部，并取消 absolute 定位。

### Size: 2x1 (388 × 184 px)
* **布局说明**：横向长条。左侧大数字，右侧为标签与事件名。
* **核心 Tailwind Classes**:
  * 容器: `flex items-center justify-center gap-4 w-full h-full p-4`
  * 右侧信息容器: `flex flex-col min-w-0 flex-1` (防溢出核心)。
  * 右侧事件名: `text-lg font-bold truncate`。

---

## Type: highlight (反色高亮纪念日)
专用于**极其重要**的里程碑，强制使用黑底白字 (`bg-black text-white`) 打破整个看板的视觉单调性。

### Size: 2x2 (388 × 388 px)
* **布局说明**：极具冲击力的大色块。
* **ASCII Layout**:
```text
██████████████████████
█                    █
█  ANNIVERSARY       █
█                    █
█       1000         █
█       DAYS         █
█                    █
█  Lulu 相识纪念日   █
█                    █
██████████████████████
```
* **核心 Tailwind Classes**:
  * 必须覆盖外层的背景和边框颜色（或者直接在内部铺满黑色容器 `bg-black w-full h-full text-white rounded-3xl`，注意引擎层已经包裹了边框，所以这里不加边框）。
  * 数字: `text-7xl font-black tabular-nums leading-none`。

### Size: 2x3 (388 × 592 px) / Size: 3x3 (592 × 592 px)
* 提供更大的垂直或方形空间，可在中间加入精确日期文本（如 `2021-08-15`）作为副标题。

---

## Type: multiple (多事件聚合)
在一个组件块中展示多个倒数事件。

### Size: 3x3 (592 × 592 px)
* **布局说明**：内部 2x2 的网格，展示 4 个事件。
* **核心 Tailwind Classes**:
  * 容器: `grid grid-cols-2 grid-rows-2 w-full h-full`
  * 内部可加上 1px 的边框线作为十字分割 `divide-x divide-y divide-black divide-opacity-20`。

### Size: 3x2 (592 × 388 px)
* **布局说明**：横向排布 3 个事件列。`flex divide-x divide-black divide-opacity-20`。

### Size: 5x1 (1000 × 184 px)
* **布局说明**：满宽跑马灯式的统计条，横排 4-5 个事件，利用 `flex justify-evenly items-center` 均分。每个子项 `min-w-0 flex-1 flex flex-col items-center`。

---

## Gallery 变体配置 (fetcher.js)
```javascript
module.exports.galleryVariants = [
  { size: '1x1', type: 'single' },
  { size: '1x2', type: 'single' },
  { size: '2x1', type: 'single' },
  { size: '2x2', type: 'highlight' },
  { size: '3x3', type: 'multiple' },
  { size: '5x1', type: 'multiple' }
];
```

## 防溢出与字体铁律
* 所有显示倒计时的数字强制添加 `tabular-nums`，确保等宽，避免每天数字跳动时整个卡片宽度变化。
* 任何事件名展示处，无论是 single 还是 multiple，**必须使用** `truncate` 或 `line-clamp-N`，以防止用户配置了长句导致排版崩溃。
