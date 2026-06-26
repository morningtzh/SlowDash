# AI 辅助开发规范: Widget 创建指南

当要求你创建一个新的 Widget 组件时，你**必须**执行以下标准操作流程（SOP）：

1. **创建核心文件**:
   - 在 `src/widgets/{widget_name}/` 目录下创建 `fetcher.js` 和 `template.ejs`。
   - `fetcher.js` 需要导出 `async function(config)` 并处理数据获取（必须尽可能利用 `src/cache.js` 避免 API 滥用）。
   - 如果适用，请在 `fetcher.js` 中导出一个 `supportedSizes` 数组（例如 `module.exports.supportedSizes = ['small'];`）来限制 Gallery 画廊模式下该组件展示的尺寸。
   - 在处理 `config.galleryMode === true` 并且缺少 API Key 的情况下，必须返回美观的假数据以供画廊展示。
   - `template.ejs` 负责渲染基于 TailwindCSS 驱动的无状态 UI。

2. **更新文档**:
   - 你必须将新 Widget 的名称、功能描述和所有可配置的参数及示例补充到 `./docs/Widgets.md` 文档中，以保证文档与代码严格同步。

3. **更新模板配置**:
   - 如果新 Widget 需要传入凭据（如 API Keys、账号密码等）或自定义变量，**必须**将其字段以注释的形式添加到 `config.template.yaml` 的 `credentials` 块中。这是供后续使用者复制参考的标准模板。
