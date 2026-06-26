# Text 自定义文本组件设计规范

## 概述
* **用途**：展示纯静态的用户自定义文本。可用于备忘录、提醒、Slogan、或者大字报。
* **数据源**：无需 API，纯配置驱动。
* **凭证要求**：无。在 `layout` 中直接提供 `text` 参数。
* **Fetcher 返回**：`{ type: "...", text: "..." }`

---

## Type: horizontal (横排文本)
最常见的横向排版大字报，适合作为醒目提醒或格言。

### 适用尺寸
* 支持任意尺寸（`1x1` 到 `5x7` 均可），文本会自动居中并根据容器大小截断。
* 推荐尺寸：`3x1`, `2x2`, `5x1`

### 布局与样式
* **ASCII Layout**:
```text
┌──────────────────────────────┐
│ TEXT                         │
│                              │
│       这里是自定义文本         │
│       会自动居中并折行         │
│                              │
└──────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `flex flex-col justify-center items-center relative text-center`
  * 文本: `text-2xl font-black tracking-tighter leading-relaxed break-words overflow-hidden whitespace-pre-wrap`

---

## Type: vertical (竖排文本)
极具东方美学的传统竖排文本，非常适合在页面侧边栏（如 `1x3`、`2x3`）填补空白，呈现墨水屏独特的书卷气。

### 适用尺寸
* 支持任意尺寸，但最推荐竖长条尺寸。
* 推荐尺寸：`1x2`, `1x3`, `2x3`

### 布局与样式
* **ASCII Layout**:
```text
┌──────────────┐
│         T    │
│  自  这  E    │
│  动  里  X    │
│  折  是  T    │
│  行  竖       │
│  。  排       │
│      文       │
│      本       │
└──────────────┘
```
* **核心 CSS 特性**:
  * 排版方向: `writing-mode: vertical-rl; text-orientation: mixed;`
  * 行高与间距: `line-height: 1.6; tracking-widest`
  * 当包含英文时，英文字母会自动旋转 90 度，中文字符保持直立。

---

## 开发注意
* 该组件没有任何外部请求，因此速度极快。
* 使用原生的 `overflow-hidden` 配合限制框，确保无论放入多长的文字都不会撑爆 `Grid` 布局。
