# SlowDash

A Universal, Widget-Based Thin-Client Dashboard Ecosystem / 模块化万能瘦客户端看板系统

![License](https://img.shields.io/badge/License-MIT-blue.svg)

[English](README-en.md) | [中文](README.md)

---

**SlowDash** 是一套基于“瘦客户端（Thin-Client）”架构的万能信息看板系统。

在这个追求 120Hz 刷新率的时代，SlowDash 反其道而行之。它旨在将任何低配、廉价、甚至废旧的屏幕（如 Kindle 墨水屏、ESP32 彩屏开发板）转化为一块安静、极简、富有禅意的桌面看板。

### 为什么选择 SlowDash？

传统的 IoT 看板开发往往伴随着痛苦的 C/C++ GUI 开发（如 LVGL），而在单片机上解析复杂的 JSON、处理排版更是噩梦。

SlowDash 的核心哲学是：**“让服务端承担一切，让终端沦为瞎子。”**

* 🧩 **Homepage 般的模块化体验：** 告别写死的前端代码！通过简单的 YAML 配置文件，像搭积木一样自由组合天气、日历、待办、服务器状态监控等 Widget 组件。
* 🎨 **无上限的定制能力：** 基于成熟的 Web 技术栈（HTML/CSS），你可以轻易实现圆角、阴影、图表，甚至是动态网格布局（Grid）。
* ☁️ **云端渲染引擎：** 服务端通过无头浏览器（Puppeteer/Playwright）定时将排版好的 Widget 页面渲染为 PNG/JPEG 图像。
* 📱 **万物皆可显示：** 终端设备（Kindle 或 ESP32）只需要做一件事：下载图片并显示。单片机 0 业务代码！

### 架构 (Architecture)

1. **服务端核心：** 解析 `config.yaml` -> 组合 Widget 模块 -> 注入外部 API 数据 -> 渲染成 HTML -> 截图保存。
2. **分发层：** Nginx 极速下发图片缓存。
3. **客户端：** Kindle / ESP32 定时唤醒，拉取最新图片覆盖屏幕，继续深度休眠。

### 客户端支持状态

- [x] **Amazon Kindle (E-ink):** 完美支持（基于 KUAL 与 rtcwake 极致省电）。
- [ ] **ESP32 (Color Touch Screen):** 开发中（支持基于图片坐标映射的触摸交互）。

### 致谢 (Acknowledgments)

本项目的灵感与底层机制深受以下优秀开源项目的启发与帮助，特此致敬：

* **[gethomepage/homepage](https://github.com/gethomepage/homepage):** 为本项目基于 YAML 的高度模块化、Widget 驱动的配置方式提供了深刻的灵感。
* **[cryptomilk/kndl-online-screensaver](https://codeberg.org/cryptomilk/kndl-online-screensaver):** 为 Kindle 端极致省电的自动唤醒更新机制（基于 rtcwake）提供了极其宝贵的参考，同时也启发了本项目将“服务端渲染”与“客户端展示”作为一个完整生态统一开源的思路。
* **[Kuhno92/onlinescreensaverPW2](https://github.com/Kuhno92/onlinescreensaverPW2):** 维护了早期的定时器更新支持。
* **[64bits/Little-Langtale](https://github.com/64bits/Little-Langtale):** 提供了包括 RTC 唤醒、CPU 降频省电等优秀的电源管理策略。
* **Peterson:** Kindle Online Screensaver 概念的原初提出者。

## License

MIT License
