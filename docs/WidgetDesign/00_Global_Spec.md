# SlowDash 组件全局设计规范

## 1. 设计总览
SlowDash 是一套专为 Kindle 墨水屏（特别是 KPW3）打造的控制面板体系。
* **目标设备**：Kindle Paperwhite 3 (1072x1448 分辨率，16级灰度)
* **渲染方式**：通过 Puppeteer 生成静态图片（截图），然后推送到 Kindle。
* **设计基调**：极简、高对比度、无杂色、大字体优先。

## 2. 三层架构说明
为了实现高度可复用和易配置，所有组件必须遵循 **Widget -> Type -> Size** 的三层架构：
* **Widget (业务域)**：组件的业务功能，对应 `widgets/` 下的文件夹名（如 `weather`, `countdown`, `plex`）。
* **Type (展现形态)**：组件的不同展现形式或变体（如天气的 `current` 当前天气、`forecast` 小时预报，或倒计时的 `single`、`highlight`）。
* **Size (网格跨度)**：组件占用的网格大小，格式为 `WxH`（如 `1x1`, `2x3`, `5x1`）。
* **Position (绝对定位)**：为了保证仪表盘排版的绝对稳定，使用 `row`（起止行）和 `col`（起止列）进行物理锚定，防止 API 返回异常导致的错位。

在 `config.yaml` 中的配置示例：
```yaml
# 全局独立背景配置 (渲染在最底层 Z-0，脱离网格边界绝对铺满)
background:
  widget: unsplash
  type: background

# 悬浮组件布局
layout:
  - widget: weather
    size: 4x1
    type: hourly
    row: 1
    col: 1
```

## 3. 5x7 固定网格系统
SlowDash 采用了严格的固定物理像素网格系统，保证完美像素对齐（Pixel-Perfect）：
* **屏幕总尺寸**：1072 × 1448 px
* **屏幕边距 (Margins)**：左右 36px，上下 20px
* **核心内容区**：1000 × 1408 px
* **网格规格**：5 列 × 7 行
* **基础单元格 (Cell)**：184 × 184 px
* **网格间距 (Gap)**：20px

### 尺寸参考表 (SIZE REFERENCE TABLE)
任何组件的真实像素尺寸严格通过以下公式计算：
* 宽度 = W * 184 + (W - 1) * 20
* 高度 = H * 184 + (H - 1) * 20

| Size (WxH) | 像素尺寸 (Px) | 常见用途示例 |
|---|---|---|
| `1x1` | 184 × 184 | 极简时钟、单个数值、极简天气 |
| `1x2` | 184 × 388 | 垂直排版的天气、单个倒数日 |
| `2x1` | 388 × 184 | 两个横向并排的数值、横向时钟 |
| `2x2` | 388 × 388 | 标准时钟、重要纪念日（反色）、微信读书详情 |
| `2x3` | 388 × 592 | 电影单张海报、天气折线图 |
| `3x1` | 592 × 184 | 3个横向排列的数据（如余额、微信读书统计） |
| `3x2` | 592 × 388 | 引言 (Hitokoto) 卡片、较宽的详情列表 |
| `3x3` | 592 × 592 | 大型多事件聚合、画廊 |
| `4x1` | 796 × 184 | 紧凑型 Github 贡献图 |
| `4x2` | 796 × 388 | 标准 Github 贡献图、横向宽版引言 |
| `5x1` | 1000 × 184 | 满宽横条（最新入库小海报、统计数据流） |
| `5x2` | 1000 × 388 | 满宽综合面板、两行海报墙 |
| `5x4` | 1000 × 796 | 大面积背景图 |
| `5x7` | 1000 × 1408 | 满屏壁纸 |

## 4. 排版规范 (Typography)
在墨水屏上，字体需要粗壮有力，避免使用细体（Thin/Light）。所有字体最小字重必须为 `font-medium`。

1. **Label 标签级**（分类名、小标题）：
   * 必须大写，字间距拉宽。
   * Tailwind: `text-[9px]` 或 `text-[10px]`, `font-bold`, `uppercase`, `tracking-widest`, `text-gray-500`
2. **Body 正文级**（描述、天气文本）：
   * 清晰易读。
   * Tailwind: `text-base` 或 `text-lg`, `font-medium`
3. **Data 数据级**（核心温度、天数、主要数值）：
   * 极致放大，极粗，缩小字间距和行高。
   * Tailwind: `text-4xl` 至 `text-6xl`, `font-black`, `tracking-tighter`, `leading-none`

## 5. 内边距梯队 (Padding)
为了适配不同大小的方块，内边距需遵循以下梯队：
* **`1x1` 组件**：`p-3` (12px)
* **`1xN` (N≥2) 组件**：`p-3` ~ `p-4`
* **`2xN` 组件**：`p-4` ~ `p-5`
* **`3xN` 及以上组件**：`p-5` ~ `p-6`

## 6. 视觉铁律 (墨水屏特化)
* **边框线**：必须是纯黑，最小 2px（`border-2 border-black`）。绝不使用灰色边框。
* **背景色**：默认纯白（`bg-white`）。绝不使用浅灰色背景（如 `bg-gray-50`），因为在墨水屏上完全看不出区别且会显得脏。
* **高对比度**：要么白底黑字，要么黑底白字。避免大量的灰色。
* **图片处理**：所有外部图片（海报、背景）必须应用灰度、高对比度和略微降暗滤镜。
  * CSS: `filter: grayscale(100%) contrast(1.2) brightness(0.95)`

## 7. 文本溢出防御规范 (CRITICAL)
在固定物理像素的布局中，数据过长撑破容器是灾难性的。必须强制执行以下防御策略：

1. **容器边界防御**：所有可能包含文本的容器都要加 `overflow-hidden`。
2. **单行文本截断 (短文本/标题)**：
   ```html
   <div class="truncate max-w-full">超长的城市名字或是事件名字</div>
   ```
3. **多行文本截断 (长文本/引言)**：
   ```html
   <div class="line-clamp-3 break-words">这里是一段非常长非常长的句子，超出的部分会自动变成省略号，纯英文无空格asdasdasd也会自动折行。</div>
   ```
4. **Flex 挤压防御**：在 Flex 容器中，带有截断文本的子元素必须加上 `min-w-0`（水平 flex）或 `min-h-0`（垂直 flex），否则截断会失效并撑爆 Flex 容器。
   ```html
   <div class="flex items-center">
     <div class="min-w-0 flex-1 truncate">保证截断生效的名称</div>
     <div class="flex-shrink-0">88.88</div>
   </div>
   ```
5. **数字防溢出**：对跳动的数字或宽度不确定的数值，使用 `tabular-nums`，并在必要时限制缩放或最大宽度。

## 8. Widget Wrapper 标准
**注意：组件模板（template.ejs）内部不应包含最外层的包裹器圆角和边框！**

系统的引擎 `widgetEngine.js` 会自动为每个 Widget 注入标准的最外层 Wrapper 样式：
```html
<div class="bg-white rounded-[32px] overflow-hidden flex w-full h-full border-2 border-black box-border relative">
  <!-- 你的 template.ejs 会被注入到这里 -->
</div>
```
因此，组件开发者只需要关注内部的布局排版即可。

**例外情况 (isBackground)**：
如果在 `config.yaml` 中将组件配置在了根节点的 `background:` 下，引擎在渲染时会注入 `isBackground: true` 的标志。此时，上述的 `rounded-[32px] border-2 border-black` 等样式会被**完全剥离**，替换为纯粹的 `w-full h-full` 绝对铺满容器，从而实现物理屏幕级别的全屏（无视 `20px 36px` 边距）。
