# iCloud Calendar 日程组件设计规范

## 概述
* **用途**：读取苹果 iCloud 日历或其他 CalDAV 服务的日程，提醒即将发生的事件。
* **数据源**：iCloud CalDAV 接口。
* **凭证要求**：`caldav_url`, `username`, `password` (App-Specific Password)。
* **Fetcher 返回**：`{ events: [ { title: "部门周会", time: "Oct 24 10:00" }, ... ] }`

---

## Type: agenda (日程列表)
提供一个近期的事务清单。

### 尺寸支持
* **Size: 2x2 (388 × 388 px)**：标准版，可显示 3-4 个即将到来的事件。
* **Size: 2x3 (388 × 592 px)**：加高版，可显示 5-6 个事件。
* **Size: 3x2 (592 × 388 px)**：加宽版，为事件标题留出更多横向截断空间。

### 布局与样式 (以 2x2 为例)
* **ASCII Layout**:
```text
┌──────────────────────────────┐
│ UPCOMING              iCloud │
│                              │
│ 部门周会及月度总...   10:00  │
│                              │
│ 去牙医诊所洗牙        14:30  │
│                              │
│ 续费服务器            明天   │
└──────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `flex flex-col w-full h-full p-5`
  * 顶部标题栏: `flex justify-between items-center mb-4 border-b-2 border-black pb-2`
  * 标题 "UPCOMING": `text-sm font-bold uppercase tracking-widest`
  * Badge "iCloud": `text-[9px] bg-black text-white px-2 py-0.5 rounded font-bold`
  * 列表容器: `flex-grow flex flex-col justify-start gap-4`
  * 每一行: `flex justify-between items-center`
  * 左侧标题: `text-lg font-bold truncate max-w-[65%] min-w-0` (严格防溢出)。
  * 右侧时间: `text-sm font-black text-right flex-shrink-0 tabular-nums`。

---

## Type: today (今日概览)
聚焦于当天最紧急的一个或两个事件。

### Size: 2x1 (388 × 184 px)
* **布局说明**：横向单行显示下一个即将发生的事件。
* **ASCII Layout**:
```text
┌──────────────────────────────┐
│ NEXT                 10:00   │
│                              │
│ 部门周会及月度总结复盘会议      │
└──────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 顶部两端对齐显示 `NEXT` 标签和事件时间 (`text-xl font-black`)。
  * 底部占据全宽显示标题 (`text-2xl font-bold truncate`)。

### Size: 1x2 (184 × 388 px)
* **布局说明**：竖向紧凑排列，仅容纳两个极短的事件标题。

---

## Gallery 变体配置 (fetcher.js)
```javascript
module.exports.galleryVariants = [
  { size: '2x2', type: 'agenda' },
  { size: '2x3', type: 'agenda' },
  { size: '3x2', type: 'agenda' },
  { size: '2x1', type: 'today' },
  { size: '1x2', type: 'today' }
];
```

## 溢出防范
* 日历事件的 `title` 经常会包含超长文本（如附带了 Zoom 链接或无意义的自动生成前缀）。
* `agenda` 模式下，左侧标题必须设置 `max-w-[65%]` (或类似限制) 并 `truncate`，否则会把右侧的时间挤出屏幕。
* 如果列表太长，需要用 `events.slice(0, N)` 截断数据，不要让 `flex` 子项因为超出容器高度而被纵向挤压变形。
