# Hitokoto 一言组件设计规范

## 概述
* **用途**：展示随机的名言、诗词或句子，作为看板上的文本点缀。
* **数据源**：Hitokoto 免费 API (`https://v1.hitokoto.cn/`) 或本地配置的静态语录。
* **凭证要求**：无。
* **Fetcher 返回**：`{ text: "生活就像海洋，只有意志坚强的人才能到达彼岸。", author: "马克思" }`

---

## Type: quote (引言卡片)
带有装饰性边框和明显的作者署名排版，适合用作具有独立视觉焦点的卡片。

### 尺寸支持与布局
* **Size: 2x2 (388 × 388 px)**：
  * 左侧附带极粗黑色装饰线 `border-l-8 border-black`。
  * 文本区域：由于高度限制，必须限制最大行数。`line-clamp-4 break-all`。
  * 作者区域：放置在右下角，设置最大宽度截断 `truncate max-w-[80%]`。
* **Size: 3x2 (592 × 388 px)**：
  * 变宽，可将行数放宽至 `line-clamp-5`。
* **Size: 4x2 (796 × 388 px)**：
  * 极佳的阅读体验尺寸，大字号排版。
* **Size: 5x1 (1000 × 184 px)**：
  * 满宽横条。`line-clamp-2`，作者放在最右侧跟随在最后一行结尾或下方。

### ASCII Layout (以 2x2 为例)
```text
┌──────────────────────────────┐
│█                             │
│█   生活就像海洋，只有意志      │
│█   坚强的人才能到达彼岸。      │
│█                             │
│█                             │
│█                 —— 马克思    │
└──────────────────────────────┘
```

### 核心 Tailwind Classes
```html
<div class="flex flex-col justify-between w-full h-full p-5 border-l-8 border-black bg-gray-50">
  <!-- 注意：bg-gray-50 在墨水屏下会显示为白色，但可以用少量纹理代替，这里建议纯白 bg-white -->
  <p class="text-2xl font-serif font-black leading-relaxed text-black line-clamp-4 break-all">
    生活就像海洋...
  </p>
  <p class="text-right text-gray-500 font-bold truncate max-w-[80%] self-end">
    —— 马克思
  </p>
</div>
```

---

## Type: minimal (极简引言)
剔除边框和多余装饰，纯文本居中展示。

### Size: 3x1 (592 × 184 px)
* **布局说明**：正文和作者同行或紧密堆叠，高度居中。`line-clamp-2`。
* **ASCII Layout**:
```text
┌────────────────────────────────────────────────────────┐
│             生活就像海洋，只有意志坚强的人才能到达彼岸。             │
│                                           —— 马克思     │
└────────────────────────────────────────────────────────┘
```

### Size: 2x1 (388 × 184 px)
* **布局说明**：非常极限的高度，仅允许 `line-clamp-1`。建议作为底栏的一句话新闻或座右铭。

---

## Gallery 变体配置 (fetcher.js)
```javascript
module.exports.galleryVariants = [
  { size: '2x2', type: 'quote' },
  { size: '3x2', type: 'quote' },
  { size: '5x1', type: 'quote' },
  { size: '3x1', type: 'minimal' },
  { size: '2x1', type: 'minimal' }
];
```

## 🚨 溢出防范 (CRITICAL)
这是整个系统中**最容易引发文本溢出导致版面崩溃的组件**。
因为 API 返回的句子长度完全不可控，且可能包含连续不断行的英文字符（如报错信息、URL 等）。
必须、绝对、一定要在文本节点上加上：
`line-clamp-N` (根据 Size 高度决定 N) + `break-all` (强制截断长英文单词) + `overflow-hidden`。
作者节点：`truncate max-w-full` 或 `max-w-[150px]`，防止超长来源（如“《哈利波特与魔法石》第五章第三节”）挤出边界。
