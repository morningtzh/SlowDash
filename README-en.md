# SlowDash

A Universal, Widget-Based Thin-Client Dashboard Ecosystem

![License](https://img.shields.io/badge/License-MIT-blue.svg)

[English](README-en.md) | [中文](README.md)

---

**SlowDash** is a universal, widget-based thin-client dashboard ecosystem.

In an era of 120Hz displays, SlowDash embraces the slow. It transforms low-power, cheap, or obsolete screens (like Kindle E-ink readers or ESP32 touch displays) into quiet, minimalist, and serene desktop dashboards.

### Why SlowDash?

Traditional IoT dashboard development often involves painful C/C++ GUI libraries (like LVGL). Parsing complex JSON and handling typography on a microcontroller is a nightmare.

SlowDash's core philosophy is: **"Let the server do everything; keep the client dumb."**

* 🧩 **Modular Widget System:** Inspired by projects like `homepage`, SlowDash is completely modular. Define your layout and widgets (Weather, Calendar, Todo, Server Stats) via a simple YAML configuration file.
* 🎨 **Unbeatable UI Capabilities:** Powered by standard Web technologies (HTML/CSS), you have access to flexbox, CSS grid, charts, and modern typography without writing a single line of C code.
* ☁️ **Cloud Rendering Engine:** The server uses a headless browser to render your configured widgets into a pristine PNG/JPEG image periodically.
* 📱 **Any Screen Works:** The edge device (Kindle or ESP32) only has one job: download the image and display it. Zero business logic on the MCU!

### Architecture

1. **Server Core:** Parse `config.yaml` -> Assemble Widgets -> Hydrate with API data -> Render HTML -> Screenshot.
2. **CDN:** Serve static images blazingly fast.
3. **Client:** Wake up -> Download Image -> Refresh Screen -> Deep Sleep.

### Supported Clients

- [x] **Amazon Kindle (E-ink):** Fully supported (Extreme power saving via KUAL and rtcwake).
- [ ] **ESP32 (Color Touch Screen):** WIP (JPEG streaming and touch coordinate callbacks).

### Acknowledgments

This project is deeply inspired by and stands on the shoulders of the following amazing open-source projects:

* **[gethomepage/homepage](https://github.com/gethomepage/homepage):** Provided the profound inspiration for a highly modular, widget-driven architecture configured via YAML.
* **[cryptomilk/kndl-online-screensaver](https://codeberg.org/cryptomilk/kndl-online-screensaver):** Provided invaluable reference for the extreme battery-saving auto-wakeup update mechanism (rtcwake) on Kindle devices, and inspired the idea of shipping the server-side renderer and client-side display as one cohesive project.
* **[Kuhno92/onlinescreensaverPW2](https://github.com/Kuhno92/onlinescreensaverPW2):** For maintaining early schedule support.
* **[64bits/Little-Langtale](https://github.com/64bits/Little-Langtale):** For power management improvements (RTC wakeup, CPU powersave).
* **Peterson:** The original author of the Kindle online screensaver concept on the MobileRead forums.

## License

MIT License
