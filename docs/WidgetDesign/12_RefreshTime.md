# RefreshTime 刷新时间组件设计规范

## 概述
* **用途**：显示整个 Dashboard 面板的最后一次渲染更新时间。用于确认 Kindle 设备是否成功获取了最新的截图。
* **数据源**：Node.js 本地系统时间。
* **凭证要求**：无。
* **Fetcher 返回**：`{ time: "2024/10/24 20:35:12" }` (根据 `toLocaleString` 生成)。

---

## Type: stamp (时间戳)
这是最简单、最迷你的状态组件。

### Size: 1x1 (184 × 184 px)
* **布局说明**：垂直两行居中排布，上方小标题，下方加粗时间。
* **ASCII Layout**:
```text
┌──────────────┐
│              │
│   最后刷新   │
│   20:35:12   │
│              │
└──────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `flex flex-col items-center justify-center w-full h-full p-2 text-center`
  * 标题: `text-[10px] font-bold text-gray-500 uppercase tracking-widest`
  * 时间: `text-sm font-black tabular-nums mt-1`

### Size: 2x1 (388 × 184 px)
* **布局说明**：横向单行排布，左侧标题，右侧时间。
* **ASCII Layout**:
```text
┌──────────────────────────────┐
│                              │
│   最后刷新时间   20:35:12    │
│                              │
└──────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `flex items-center justify-center gap-4 w-full h-full`

---

## Gallery 变体配置 (fetcher.js)
```javascript
module.exports.galleryVariants = [
  { size: '1x1', type: 'stamp' },
  { size: '2x1', type: 'stamp' }
];
```

## 溢出防范与注意
* 确保返回的 `time` 字符串不要过长（例如带上完整的年月日可能在 `1x1` 下装不下）。建议 Fetcher 只返回 `HH:MM` 或 `MM-DD HH:MM`，以保持界面的简洁。
* 使用 `tabular-nums` 是常识，防止分钟跳动时引起的宽度变化。
