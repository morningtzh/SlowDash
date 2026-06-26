# Clock 时钟组件设计规范

## 概述
* **用途**：展示当前时间、星期和日期。
* **数据源**：纯本地运行环境的时间计算，无需外部 API。
* **Fetcher 返回**：`{ hours, minutes, weekday, date, dateStr }`

---

## Type: digital (数字时钟)
展示时间与日期的标准组合。

### Size: 1x1 (184 × 184 px)
* **布局说明**：极致紧凑版。大号时间在中间，底部极小的日期。
* **ASCII Layout**:
```text
┌──────────────┐
│              │
│    20:35     │
│              │
│ 周五 10月24日 │
└──────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `flex flex-col justify-center items-center w-full h-full p-3`
  * 时间: `text-3xl font-black tabular-nums tracking-tighter`
  * 日期: `text-[9px] font-bold text-gray-500 mt-2`

### Size: 1x2 (184 × 388 px)
* **布局说明**：垂直长条排版，完美适配边缘缝隙填补。顶部巨大时间，底部堆叠星期与日期。
* **ASCII Layout**:
```text
┌──────────────┐
│              │
│    20:35     │
│              │
│              │
│    FRIDAY    │
│    OCT 24    │
└──────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `flex flex-col justify-center items-center w-full h-full p-4 relative`
  * 时间: `text-5xl font-black tabular-nums tracking-tighter mt-4`
  * 底部日期容器: `flex-grow flex flex-col justify-end items-center pb-6`
  * 星期/日期: `text-[10px] font-bold uppercase tracking-widest`

### Size: 2x1 (388 × 184 px)
* **布局说明**：横向排版，适合作为页眉或页脚的点缀。左侧大字号时间，右侧垂直堆叠星期与日期。
* **ASCII Layout**:
```text
┌──────────────────────────────┐
│                  Friday      │
│      20:35                   │
│                  Oct 24      │
└──────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `flex items-center justify-center gap-6 w-full h-full p-4`
  * 时间: `text-5xl font-black tabular-nums leading-none`
  * 右侧信息: `flex flex-col items-start`
  * 星期/日期: `text-sm font-bold uppercase tracking-widest`

### Size: 2x2 (388 × 388 px)
* **布局说明**：最标准的桌面时钟形态，巨大的时间居中，底部空间充裕，容纳完整的星期与日期。
* **ASCII Layout**:
```text
┌──────────────────────────────┐
│                              │
│                              │
│           20:35              │
│                              │
│                              │
│         周五, 10月24日        │
└──────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `flex flex-col justify-center items-center w-full h-full relative`
  * 时间: `text-7xl font-black tabular-nums tracking-tighter`
  * 日期栏: `absolute bottom-6 text-sm font-bold tracking-widest text-gray-500`

---

## Type: minimal (极简时钟)
剔除所有冗余信息，仅保留时间，视觉最纯粹。

### Size: 1x1 (184 × 184 px)
* **布局说明**：仅有 HH:MM，将字号顶满方格，完美居中。没有任何边角标签。
* **ASCII Layout**:
```text
┌──────────────┐
│              │
│    20:35     │
│              │
└──────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `flex items-center justify-center w-full h-full p-2`
  * 时间: `text-4xl font-black tabular-nums tracking-tighter`

---

## Gallery 变体配置 (fetcher.js)
```javascript
module.exports.galleryVariants = [
  { size: '1x1', type: 'digital' },
  { size: '2x1', type: 'digital' },
  { size: '2x2', type: 'digital' },
  { size: '1x1', type: 'minimal' }
];
```

## 排版铁律
* 时间数字必须应用 `tabular-nums` (或者 `font-variant-numeric: tabular-nums;`)。因为数字如 '1' 和 '8' 的自然宽度不同，如果不使用等宽数字特性，时间跳动时整个文本块会左右晃动。
