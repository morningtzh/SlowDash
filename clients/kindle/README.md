# SlowDash Kindle Client

Kindle 端的 E-Ink 仪表盘客户端，基于
[kndl-online-screensaver](https://codeberg.org/cryptomilk/kndl-online-screensaver)
移植，并针对 SlowDash 进行了适配。

## 功能特性

- **时间段调度** — 按时间段设置不同的刷新间隔（如白天高频、夜间低频）
- **省电管理** — 使用 RTC wakeup 唤醒、允许设备正常休眠，最大化电池寿命
- **WiFi 按需连接** — 自动循环连接 WiFi，连接检测后才拉取图片
- **ETag 缓存** — 服务端图片未变化时跳过下载（HTTP 304）
- **电量上报** — 将电池电量和充电状态作为查询参数发送给服务端
- **设备自动识别** — 通过序列号识别 Kindle 型号和屏幕分辨率
- **fbink 优先** — 优先使用 fbink 刷屏（自动拷贝到 /tmp），回退到 eips
- **OTA 自升级** — 每次刷新前自动检查服务端版本，有新版本时自动下载更新

## 系统要求

- 已越狱的 Kindle（固件 5.x+）
- 已安装 [KUAL](https://www.mobileread.com/forums/showthread.php?t=203326)
- 已安装 [linkss 屏保破解](https://www.mobileread.com/forums/showthread.php?t=225030)
- SlowDash 服务端或任何提供 PNG 图片的 HTTP 端点

## 目录结构

```
clients/kindle/
├── config.xml          # KUAL 扩展描述文件
├── menu.json           # KUAL 菜单入口
└── bin/
    ├── config.sh       # 所有配置项（URL、调度、WiFi、OTA 等）
    ├── device.sh       # Kindle 型号/分辨率自动检测
    ├── utils.sh        # 工具函数（日志、WiFi、RTC 唤醒、fbink 刷屏）
    ├── scheduler.sh    # 主调度器（省电事件循环）
    ├── update.sh       # 下载并显示仪表盘图片
    ├── check_update.sh # OTA 自升级检查
    ├── enable.sh       # 安装 upstart 服务（开机自启）
    ├── disable.sh      # 卸载 upstart 服务
    ├── restart.sh      # 重启 upstart 服务
    └── slowdash.conf   # upstart 配置文件
```

## 安装

1. 将本目录复制到 Kindle 的 `/mnt/us/extensions/slowdash/`
2. 创建用户配置文件：
   ```sh
   cp config.local.sh.example config.local.sh
   vi config.local.sh   # 设置 SLOWDASH_SERVER_URL
   ```
3. 在 Kindle 上打开 KUAL → **SlowDash** → **Enable auto-update**
4. 屏保将在下次休眠时自动更新

## 配置

> **重要**：不要直接编辑 `bin/config.sh`，它会被 OTA 更新覆盖！
>
> 请将你的自定义配置写入 **`config.local.sh`**（位于扩展根目录
> `/mnt/us/extensions/slowdash/config.local.sh`）。该文件不会被 OTA 触碰。

`bin/config.sh` 中定义了所有默认值，`config.local.sh` 中设置的变量会覆盖默认值：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SLOWDASH_SERVER_URL` | `http://your-server:3000` | SlowDash 服务端地址 |
| `IMAGE_URI` | 自动从 `SLOWDASH_SERVER_URL` 派生 | 仪表盘图片 URL |
| `SCHEDULE` | `00:00-07:00=60 07:00-21:00=30 21:00-24:00=60` | 刷新调度 |
| `DEFAULTINTERVAL` | `60` | 无匹配调度时的回退间隔（分钟） |
| `DISABLE_WIFI` | `0` | 更新后关闭 WiFi（1=是） |
| `OTA_ENABLED` | `1` | 启用 OTA 自升级检查 |
| `LOGGING` | `0` | 启用日志（1=是） |
| `RTC` | `0` | RTC 设备索引 |

### 调度格式

```
SCHEDULE="HH:MM-HH:MM=INTERVAL HH:MM-HH:MM=INTERVAL ..."
```

INTERVAL 单位为**分钟**。

### fbink

如果你的 Kindle 上有 fbink 二进制文件，将其放在 `/mnt/us/extensions/slowdash/fbink`。
upstart 启动时会自动拷贝到 `/tmp/fbink` 运行，避免在 FAT32 分区上保持文件句柄。

## OTA 更新流程

1. 服务端生成 `clients/manifest.json` 和 `clients/kindle/update.tar.gz`
2. Kindle 端下载 `manifest.json`，比较本地版本号
3. 如果有新版本，则下载 `update.tar.gz` 并解压覆盖
4. 版本号记录在 `/mnt/us/extensions/slowdash/client.version`

## 调试

在 `bin/config.sh` 中启用日志：

```sh
LOGGING=1
LOGFILE=/mnt/us/extensions/slowdash/log/slowdash.log
```

日志缓冲在 RAM（`/tmp/slowdash.log`），在安全时刷写到 FAT 分区。

## 致谢

本代码基于 [kndl-online-screensaver](https://codeberg.org/cryptomilk/kndl-online-screensaver)
（MIT 协议）移植，感谢 cryptomilk 及 MobileRead 社区的原始工作。
