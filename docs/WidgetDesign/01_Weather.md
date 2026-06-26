# Weather 天气组件设计规范

## 概述
* **用途**：展示当地当前天气状况或未来几小时的趋势预报。
* **数据源**：和风天气 (QWeather) API。
* **请求端点**：`/v7/weather/now` (当前) 和 `/v7/weather/24h` (预报)。
* **配置凭证**：
  * `api_key`: 和风天气密钥
  * `location`: 城市 Location ID (如 `101010100`)
  * `city_name`: 显示的城市名称
  * `api_host`: API 域名 (默认 `https://devapi.qweather.com`)
* **Fetcher 返回数据**：
  * Current: `{ type: 'current', temp: "26", text: "多云", city: "北京" }`
  * Forecast: `{ type: 'forecast', city: "北京", hourly: [ { temp: "26", text: "多云", fxTime: "..." }, ... ] }`

---

## Type: current (当前天气)
聚焦于当下的气象快照，以巨大的数字展示最高视觉优先级。

### Size: 1x1 (184 × 184 px)
* **布局说明**：极致极简。屏幕空间有限，居中展示一个巨大的温度，底部配以非常小字号的天气描述。**不显示城市名称**。
* **内边距**：`p-3`
* **ASCII Layout**:
```text
┌──────────────┐
│              │
│     26°      │
│     多云      │
│              │
└──────────────┘
```
* **核心 Tailwind Classes**:
  * 外层: `flex flex-col justify-center items-center w-full h-full p-3`
  * 温度: `text-5xl font-black tracking-tighter text-black`
  * 天气: `text-[10px] font-bold tracking-widest mt-1`

### Size: 1x2 (184 × 388 px)
* **布局说明**：垂直标准版。顶部显示城市名称，中间为超大温度数字，底部展示天气状况。
* **内边距**：`p-4`
* **ASCII Layout**:
```text
┌──────────────┐
│ BEIJING      │
│              │
│              │
│              │
│      26°     │
│              │
│              │
│              │
│ 多云          │
└──────────────┘
```
* **核心 Tailwind Classes**:
  * 外层: `flex flex-col justify-between items-center w-full h-full p-4`
  * 城市(顶部左上绝对定位): `absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 opacity-40 truncate max-w-[80%]`
  * 温度: `text-6xl font-black tracking-tighter text-black`
  * 天气: `text-sm font-bold tracking-widest pb-2`

---

## Type: hourly (纯文本小时预报)
横向时间轴，展示未来数小时的文本预报。

### 尺寸支持
* **Size: 3x1 (592 × 184 px)**：展示 4 个小时的数据。
* **Size: 4x1 (796 × 184 px)**：展示 5-6 个小时的数据。
* **Size: 5x1 (1000 × 184 px)**：满宽，展示 6-7 个小时的数据。

### 布局与样式
* **ASCII Layout (以 3x1 为例)**:
```text
┌────────────────────────────────────────────────────────┐
│ CITY FORECAST                                          │
│   12:00      │   13:00      │   14:00      │   15:00   │
│    26°       │    27°       │    28°       │    27°    │
│    多云       │    晴        │    阴        │    雨     │
└────────────────────────────────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `flex items-center justify-evenly w-full h-full relative p-4`
  * 徽标: 绝对定位左上角小标签 `CITY FORECAST` (`text-[8px] opacity-40 uppercase`)
  * 单列元素: `flex flex-col items-center justify-center`
  * 时间: `text-[9px] font-bold text-gray-500 mb-2`
  * 温度: `text-xl font-black text-black`
  * 天气: `text-[9px] font-bold text-black tracking-widest mt-1`
  * 分隔线 (插入在列之间): `w-px h-8 bg-black opacity-20`
* **开发注意**：需要根据 Size 来切片 (slice) `hourly` 数组的长度，确保不会拥挤。

---

## Type: hourly_chart (带折线图的小时预报)
数据密集型展示，视觉复杂度较高。

### 尺寸支持
* **Size: 2x3 (388 × 592 px)**：标准折线图版，显示 4-5 个时间节点。
* **Size: 2x4 (388 × 796 px)**：加长版，图表起伏细节更丰富。
* **Size: 2x5 (388 × 1000 px)**：极限高大版，适合放于版面侧边栏。

### 布局与样式
* **ASCII Layout (2x3为例)**:
```text
┌────────────────────────┐
│ 12:00   14:00   16:00  │
│  多云     晴      阴   │
│                        │
│   o                    │
│    \                   │
│     \         o        │
│      \       /         │
│       \     /          │
│        \   /           │
│         \ /            │
│          o             │
└────────────────────────┘
```
* **结构说明**:
  * 上半部分 (约占 30%)：横向 Flex，分布时间与天气描述文本。
  * 下半部分 (约占 70%)：SVG 容器。
* **SVG 开发注意**:
  * `<svg>` 标签必须使用 `viewBox`，并设定 `width="100%" height="100%"`。
  * 必须通过 JS 代码遍历 `hourly` 数据，找出最高温 (Max) 和最低温 (Min)。
  * 依据组件的实际高度动态计算坐标映射 (Y 轴缩放)，为线条上下保留 Padding，防止超出边界。
  * 墨水屏特化：`<polyline>` 或 `<path>` 必须使用 `stroke="black" stroke-width="2" fill="none"`。数据点小圆圈可使用 `fill="white" stroke="black" stroke-width="2" r="3"`。

---

## Gallery 变体配置 (fetcher.js)
```javascript
module.exports.galleryVariants = [
  { size: '1x1', type: 'current' },
  { size: '1x2', type: 'current' },
  { size: '3x1', type: 'hourly' },
  { size: '5x1', type: 'hourly' },
  { size: '2x3', type: 'hourly_chart' }
];
```

## 文本溢出防御
* 城市名必须截断：`truncate max-w-[80%]`，防止某些超长城市名撑破顶部左上角位置。
* 天气描述（如“晴转多云”）如果超过 4 个字可能会换行，使用 `whitespace-nowrap text-center` 保证不折行。
