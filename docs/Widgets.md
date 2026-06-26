# SlowDash Widgets 列表与使用说明

下面是目前 SlowDash 已经支持的所有组件（Widget）的使用说明。如果需要在 `config.yaml` 中配置带有隐私信息的参数，请将它们放置在全局的 `credentials:` 块下。

## 基础功能类
### 1. 时钟 (clock)
- **功能**: 显示当前时间、星期和日期。
- **推荐尺寸**: `small` (2x2), `medium` (4x2)
- **配置参数**: 无需配置凭据。

### 2. 倒数日 (countdown)
- **功能**: 计算距离某个目标日期的剩余天数。
- **推荐尺寸**: `small` (2x2)
- **凭据参数**: 无需凭据，直接在 `layout` 中配置：
  ```yaml
  - widget: countdown
    size: small
    event: "新年"
    target: "2027-01-01"
  ```

### 3. 刷新时间 (refresh_time)
- **功能**: 显示看板上一次渲染的具体时间。
- **推荐尺寸**: `small` (2x2)
- **配置参数**: 无需配置凭据。

## API 接入类
### 4. 一言 (hitokoto)
- **功能**: 获取随机的一言名句。
- **推荐尺寸**: `medium` (4x2)
- **配置参数**: 无需配置凭据。

### 5. 和风天气 (weather)
- **功能**: 获取当前天气的气温与天气状况。
- **推荐尺寸**: `small` (2x2), `medium` (4x2)
- **凭据参数** (填在 `credentials.weather` 下):
  - `api_key`: 和风天气的 Web API 密钥。
  - `location`: 城市代码（如 `101010100` 为北京）。
  - `city_name`: 用于界面显示的城市名称。
  - `api_host`: 请求网关地址。免费版用户请填 `https://devapi.qweather.com`，商业版付费用户请填 `https://api.qweather.com`。

### 6. AI 余额展示 (ai_balance)
- **功能**: 展示各大 AI API 的账户余额。
- **推荐尺寸**: `small` (2x2), `medium` (4x2)
- **凭据参数** (填在 `credentials.ai_balance` 下):
  - `deepseek_key`: DeepSeek 的 API Key。
  - `aliyun_access_key`: 阿里云 AccessKey ID。
  - `aliyun_secret_key`: 阿里云 AccessKey Secret。
- **阿里云权限说明**:
  为了安全起见，强烈建议你创建一个专门的 RAM 子用户。该子用户仅需要**读取账单（BSS）的权限**即可获取余额。
  你可以在 RAM 访问控制中给子用户添加系统策略：**`AliyunBSSReadOnlyAccess`**。
  （如果想做到极限控制，也可以自定义权限策略，仅开放 `"Action": "bss:QueryAccountBalance"`）。

### 7. iCloud 日历 (icloud_calendar)
- **功能**: 安全抓取 iCloud 私人日程安排。
- **说明**: 无论是云上贵州还是国际版，通常均可使用 `https://caldav.icloud.com`，系统底层会自动路由。如果不通，可以尝试 `https://caldav.icloud.com.cn`。
- **推荐尺寸**: `medium` (4x2), `large` (4x4)
- **凭据参数** (填在 `credentials.icloud_calendar` 下):
  - `caldav_url`: `https://caldav.icloud.com`
  - `username`: Apple ID 邮箱。
  - `password`: Apple 官网生成的 App 专用密码。

### 8. MoviePilot (moviepilot)
- **功能**: 展示 MoviePilot 的运行状态与订阅统计数据。
- **特别说明**: 该组件依赖 MoviePilot 的第三方插件 `HomePage`。**你必须在 MoviePilot 的插件中心安装并启用 HomePage 插件**，否则接口无法调用！
- **推荐尺寸**: `medium` (4x2), `large` (4x4)
- **凭据参数** (填在 `credentials.moviepilot` 下):
  - `url`: 你的 MoviePilot 地址（如 `http://192.168.31.x:3000`）。
  - `api_token`: 你的 API Token。

### 9. Plex (plex)
- **功能**: 展示 Plex 媒体库最新入库的海报（Recently Added）。
- **推荐尺寸**: `medium` (4x2), `large` (4x4)
- **支持尺寸响应**: 能够根据容器大小自动决定显示的海报数量（1-6张）。
- **凭据参数** (填在 `credentials.plex` 下):
  - `url`: 你的 Plex 局域网地址（例如 `http://192.168.31.200:32400`）。
  - `token`: 你的 Plex X-Plex-Token。

### 10. Github 瓷砖 (github_chart)
- **功能**: 展示 Github 一年内的绿点贡献图。
- **推荐尺寸**: `medium` (4x2), `4x1`
- **凭据参数** (填在 `credentials.github_chart` 下):
  - `username`: Github 用户名。

### 11. 黑白美术馆 (unsplash)
- **功能**: 展示高对比度、黑白色调的高雅艺术照片。
- **推荐尺寸**: `large` (4x4)
- **配置参数**: 无需凭据，直接支持。

### 12. 微信读书打卡 (weread)
- **功能**: 展示微信读书的阅读时长、连续阅读天数和读过书籍数量。
- **说明**: 微信读书没有公开的 API，底层通过抓取网页版接口实现。你需要登录电脑网页版微信读书，在开发者工具的网络请求中提取请求头里的 `Cookie`。
- **推荐尺寸**: `medium` (4x2)
- **凭据参数** (填在 `credentials.weread` 下):
  - `cookie`: 网页版微信读书的 Cookie。
