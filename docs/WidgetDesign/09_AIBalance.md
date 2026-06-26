# AIBalance 余额组件设计规范

## 概述
* **用途**：展示常用云服务或 AI 模型 API 的剩余额度，适合打工人或开发者监控账单。
* **数据源**：各个 API 厂商的查询接口。
* **凭证要求**：`deepseek_key`, `aliyun_access_key`, `aliyun_secret_key` 等。
* **Fetcher 返回**：`{ balances: [{ name: "DeepSeek", balance: "12.45", currency: "¥" }, ...] }`

---

## Type: balance (余额列表)
以键值对的形式列出多个服务的余额。

### 尺寸支持
* **Size: 2x1 (388 × 184 px)**：横向分布 2 个厂商的余额。
* **Size: 2x2 (388 × 388 px)**：垂直列表，展示 3-4 个厂商。
* **Size: 3x1 (592 × 184 px)**：横向分布 3 个厂商，中间带竖向分割线。

### 布局与样式 (以 2x2 垂直列表为例)
* **ASCII Layout**:
```text
┌──────────────────────────────┐
│ API BALANCES                 │
│                              │
│ DeepSeek            ¥ 12.45  │
│ ──────────────────────────── │
│ Aliyun               ¥ 4.20  │
│ ──────────────────────────── │
│ OpenAI              $ 10.00  │
└──────────────────────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `flex flex-col w-full h-full p-5 justify-center`
  * 标题: `text-[10px] font-bold text-gray-400 uppercase mb-4`
  * 每一行: `flex justify-between items-baseline border-b border-gray-200 pb-2 mb-2 last:border-0 last:mb-0`
  * 左侧名称: `text-sm font-bold text-gray-700 uppercase tracking-wider flex-shrink-0 mr-4` (必须加 flex-shrink-0 防止被数字挤压)。
  * 右侧金额容器: `flex items-baseline min-w-0 truncate`。
  * 货币符号: `text-[10px] font-bold mr-1 text-gray-500`。
  * 金额数字: `text-2xl font-black tabular-nums text-black truncate`。

---

## Type: compact (紧凑余额)
极限压缩空间的展示形式，只关注最重要的一个厂商。

### Size: 1x1 (184 × 184 px)
* **布局说明**：居中巨大的数字，厂商名称化为微小标签。
* **ASCII Layout**:
```text
┌──────────────┐
│ DEEPSEEK     │
│              │
│    12.45     │
│              │
│              │
└──────────────┘
```
* **核心 Tailwind Classes**:
  * 容器: `relative w-full h-full p-3 flex flex-col justify-center items-center`
  * 标签: `absolute top-3 left-3 text-[9px] font-bold uppercase text-gray-400`
  * 金额: `text-4xl font-black tabular-nums tracking-tighter`

---

## Gallery 变体配置 (fetcher.js)
```javascript
module.exports.galleryVariants = [
  { size: '2x2', type: 'balance' },
  { size: '3x1', type: 'balance' },
  { size: '2x1', type: 'balance' },
  { size: '1x1', type: 'compact' }
];
```

## 溢出防范
* **数字长度极易超标**：如果是刚充值的金额（如 `1000.00`），在 `2x2` 的右对齐排版中很容易顶破边界。右侧金额容器务必加上 `min-w-0 truncate`，或者单独限制数字的 `max-w-[120px] truncate`。
* **左侧名称防压扁**：右侧数字变大时会去挤压左侧的名字，导致 "DeepSeek" 变成 "DeepS..."。如果名称必须完整，加上 `flex-shrink-0` 保护。
