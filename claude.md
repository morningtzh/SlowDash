# SlowDash UI Agent Guidelines

Welcome, UI Agent! You are helping to build the frontend interfaces for **SlowDash**, an E-Ink dashboard designed specifically for Kindle devices (1072x1448 resolution).

## Technical Stack & Architecture
- **Templating**: EJS (`template.ejs` per widget).
- **Styling**: Tailwind CSS (injected via CDN).
- **Layout System**: 5-column CSS Grid (`grid-cols-5 gap-5`). Base row height is 90px (`auto-rows-[minmax(90px,_auto)]`).
- **Data Flow**: Each widget has a `fetcher.js` that fetches data and returns a JSON object. This object is injected into `template.ejs` as `data`. The widget's configuration (like size and type) is injected as `config`.

## Design Constraints & Aesthetics (CRITICAL)

### 1. The "No-Header" Minimalist Philosophy
- **DO NOT** use traditional app-like headers or titles (e.g., `<div class="title">Weather</div>`). 
- **DO NOT** use card headers.
- **Reference Style**: Think of GitHub contribution graphs or Hitokoto cards. The data itself should form the design. Let typography, big numbers, and icons speak for themselves.

### 2. E-Ink / Grayscale Optimization
- The target device is a Kindle. It renders in grayscale with a low refresh rate.
- **Colors**: Use only Tailwind's grayscale palette (`bg-white`, `text-black`, `text-gray-500`, etc.). Avoid complex gradients.
- **Contrast**: Rely on font-weight (`font-black`, `font-light`) and distinct borders (`border-gray-300`, `border-black`) rather than subtle shadow depth to create visual hierarchy.

### 3. Widget Multi-Variants & Sizes
- A single widget can have multiple morphological variants (`config.type`). 
- E.g., `weather` can be `current` (`1x1` or `1x2`) or `forecast` (`4x2` grid of hourly temps).
- Ensure your EJS template uses `<% if (config.type === '...') { %>` to completely alter its HTML structure based on the variant.

### 4. Error & Gallery Mode Handling
- Preview gallery (`/gallery`) uses mock data. Sometimes `data.error` will be present.
- Always defensively write your EJS: `<% if (typeof error !== 'undefined' && error) { %> <div>Error: <%= error %></div> <% } else { %> ... <% } %>`.
- Don't assume nested properties exist without optional chaining or `|| {}`.
