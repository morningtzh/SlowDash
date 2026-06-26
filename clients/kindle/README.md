# SlowDash Kindle Client

本目录包含 Kindle 端客户端代码与 OTA 升级脚本。

## 目录结构

- `bin/check_update.sh`：Kindle 端拉取服务器 `manifest.json` 并下载更新包的脚本。
- `config.sh`：Kindle 客户端运行时配置文件。
- `menu.json`：客户端菜单入口示例。

## 使用说明

1. 在 Kindle 上将本目录复制到一个可写目录，例如 `/mnt/us/slowdash/kindle`。
2. 编辑 `config.sh`，将 `SLOWDASH_SERVER_URL` 设置为你的 SlowDash 服务端地址。
3. 运行 `bin/check_update.sh` 检查并安装最新 OTA 包。
4. 运行 `bin/display_dashboard.sh` 立即刷新当前屏保图片。
5. 运行 `bin/run_screensaver.sh` 可进入自动唤醒循环，按间隔拉取更新并刷新屏幕。

## OTA 更新流程

1. 服务端生成 `output/clients/manifest.json` 和 `output/clients/kindle/update.tar.gz`。
2. Kindle 端下载 `manifest.json`，比较本地版本号。
3. 如果有新版本，则下载 `update.tar.gz` 并解压覆盖。
