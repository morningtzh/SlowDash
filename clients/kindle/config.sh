#!/bin/sh
# SlowDash Kindle client configuration.
# Copy this file to Kindle 端的可写目录，或直接修改环境变量。

# 服务端地址，末尾不应包含斜杠
SLOWDASH_SERVER_URL="http://your-server:3000"

# Kindle 本地客户端根目录（用于存放 client 代码和升级包）
SLOWDASH_CLIENT_ROOT="/mnt/us/extensions/slowdash"

# 临时目录
SLOWDASH_TMPDIR="/tmp/slowdash"

# 下载工具，优先使用 curl
SLOWDASH_DOWNLOADER="curl -fsSL"

# 自动屏保刷新间隔（秒），默认 30 分钟
SLOWDASH_REFRESH_INTERVAL_SECONDS="1800"

# 可选：自定义刷新时间表 (格式：开始时间-结束时间=刷新间隔(秒))
# 例如，白天每 30 分钟刷新，夜间不刷新（设置极长刷新间隔如 36000），可配置为：
# SLOWDASH_SCHEDULE="07:00-23:00=1800 23:00-07:00=36000"
# 如果不设置，默认全天按照 SLOWDASH_REFRESH_INTERVAL_SECONDS 刷新
# SLOWDASH_SCHEDULE=""

# 公共可访问的基础 URL（优先级高于 SLOWDASH_SERVER_URL）
# 例如：https://your-public-bucket-url
# SLOWDASH_PUBLIC_URL="https://your-public-bucket-url"

# 可选：自定义图片地址，默认使用 ${SLOWDASH_PUBLIC_URL:-${SLOWDASH_SERVER_URL}}/dashboard.png
# SLOWDASH_IMAGE_URL="http://your-server:3000/dashboard.png"
