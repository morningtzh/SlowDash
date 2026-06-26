# SlowDash 架构与设计文档 (Design Document)

## 1. 核心理念

SlowDash 遵循严格的 **"静态生成"** 与 **"瘦客户端"** 理念：
* **纯静态输出：** 服务端只负责生成最终的静态资产（一张图片 `dashboard.png` 和客户端升级包）。没有任何动态 API（不包含交互接口），最大化降低部署复杂度和运行开销。
* **TailwindCSS 驱动：** 前端 UI 模板完全基于 TailwindCSS 进行排版，提供极高的灵活性与现代化的开发体验。
* **存储抽象：** 产物输出完全与宿主机环境解耦，支持本地文件系统 (Local) 或 S3 兼容对象存储。

## 2. 模块化设计 (Modular Widget System)

为了让用户无需编写前端代码即可定制看板，SlowDash 采用了类似 `homepage` 的 YAML 驱动模块化架构：
* **配置驱动排版：** 用户通过修改 `config.yaml` 就能定义页面的行、列以及每个区块显示的内容，像搭积木一样拼装看板。
* **独立的 Widget：** 天气、日历、待办事项、系统监控等功能被彻底拆分为独立、可插拔的 Widget 模块。
* **数据与视图分离：** 每个 Widget 内部包含两部分：
  * **数据拉取层：** 负责调用外部 API（如 OpenWeather、Notion）获取原生数据。
  * **视图渲染层：** 负责将原生数据结合 TailwindCSS，生成该 Widget 的局部 HTML 代码片段。
* 核心引擎会根据 YAML 配置文件，将各个 Widget 生成的 HTML 组合成一个完整的页面供 Puppeteer 截图。

## 3. 运行模式 (Execution Modes)

Node.js 核心脚本提供两种运行模式，以适应不同的部署环境：

* **Mode A: `oneshot` (单次执行)**
  * **行为：** 启动 -> 读取配置 -> 拉取数据 -> 组合 Widget -> 渲染 HTML -> 截图保存 -> 上传产物 -> 退出进程。
  * **适用场景：** Kubernetes `CronJob`、Linux 原生 `cron` 任务、Serverless 平台。极致节省资源。
* **Mode B: `server` (常驻服务)**
  * **行为：** 启动一个 Node.js 进程，内部维护定时器定期执行 `oneshot` 流程。同时可选启动一个极其轻量的静态文件服务器（如果输出目标是 Local），用于分发图片和 OTA 包。
  * **适用场景：** Kubernetes `Deployment`、Docker `docker run`、本地守护进程（systemd/pm2）。开箱即用，无需外部配置定时任务。

## 4. 产物与存储 (Artifacts & Storage)

最终的编译产物将由系统根据配置输出到目标地址（默认输出至本地 `./output`，也可配置输出至 S3）。

**输出目录结构：**
```text
output/
├── dashboard.png          # 最新生成的看板图片
└── clients/               # 客户端文件及 OTA 更新包
    ├── manifest.json      # 版本清单记录文件，用于 OTA 校验
    └── kindle/
        └── update.tar.gz  # Kindle 端的最新 KUAL 脚本升级包
```

**存储适配器 (Storage Adapters)：**
* **Local Adapter:** 直接使用 `fs` 写入磁盘，适合配合 Nginx 提供 HTTP 服务。
* **S3 Adapter:** 使用 AWS SDK 将图片与打包文件直接上传至 S3/R2，适合配合 CDN 极速分发。

## 5. OTA 升级机制 (Over-The-Air)

为了保证客户端（如 Kindle）的逻辑能随着服务端主项目一同迭代，设计了如下的"被动推拉"更新机制：

1. **服务端发布 (Push)：** 当用户在启动生成脚本时加入 `--release-ota` 参数，脚本会将项目源码中 `clients/` 下的最新客户端脚本打包为 `update.tar.gz`，并生成包含最新版本哈希的 `manifest.json`，连同图片一起上传至输出目录。
2. **客户端校验与更新 (Pull)：** 
   * 为了安全与稳定性，V1 版本暂不强制静默更新。
   * 在 Kindle 的 KUAL 菜单中，增加一个独立的 **"Check for Updates"** 按钮。
   * 用户点击后，触发 Kindle 本地的 shell 脚本。脚本去获取 `[Server-URL]/clients/manifest.json`，比对本地版本；若有更新，则拉取 `update.tar.gz` 解压覆盖，并重启后台唤醒进程。

## 6. 部署形态 (`deploy/` 目录规划)

项目提供完整的工程化部署文件，统一存放在 `deploy/` 目录下，覆盖所有主流场景：

```text
deploy/
├── Dockerfile             # 包含 Node.js 与 Puppeteer(Chromium) 依赖的构建文件
├── k8s/                   
│   ├── cronjob.yaml       # 对应 Mode A 的 Kubernetes 部署清单
│   └── server.yaml        # 对应 Mode B 的 Kubernetes 部署清单
└── docs/
    └── linux_cron.md      # 指导如何在宿主机通过 crontab 部署 oneshot 模式
```

## 7. 核心目录结构 (Project Layout)

```text
SlowDash/
├── src/
│   ├── index.js           # CLI 入口，处理参数解析，分发 oneshot / server 模式
│   ├── renderer/          # 截图引擎 (Puppeteer 逻辑)
│   ├── storage/           # 存储适配器 (Local / S3)
│   ├── templates/         # HTML / TailwindCSS 基础布局模板
│   └── widgets/           # Widget 插件库 (Weather, Calendar等)
├── clients/
│   └── kindle/            # Kindle 端原生 shell 代码 (bin/, config.sh, menu.json)
├── deploy/                # 部署文件与文档
├── config.yaml.example    # 用户配置文件模板
└── DESIGN.md              # 架构设计文档
```
