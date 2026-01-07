<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/feae14e9-8d68-41f9-9e33-e444f1a6f360" />


# Canvas UI Engine (working name)

> **Canvas-based UI Engine for Mobile & Embedded Apps**  
> A high-performance UI engine rendered with Canvas/WebGL, running inside a WebView runtime (Capacitor / Cordova), without DOM, HTML or CSS.

---

## 🚀 Overview

**Canvas UI Engine** is a **low-level UI engine** that renders the entire user interface using **Canvas 2D or WebGL**, instead of the DOM.

Although it runs inside a WebView, it **does not rely on HTML, CSS, or the browser layout engine**.  
The WebView is used **only as a JavaScript runtime**, not as a UI system.

> Think **Flutter’s rendering model**, but implemented in **JavaScript**, running inside a WebView.

---

## ❌ What this engine is NOT

- ❌ Not a web framework  
- ❌ Not DOM-based  
- ❌ Not Ionic / React / Vue  
- ❌ Not HTML/CSS driven  
- ❌ Not designed for SEO or websites  

---

## ✅ What this engine IS

- ✅ A **Canvas-first UI engine**
- ✅ A **custom rendering pipeline**
- ✅ A **custom layout system**
- ✅ A **custom input & gesture system**
- ✅ A **deterministic, app-like UI**
- ✅ Designed for **mobile & embedded apps**

---

## 🧠 Architecture

<svg width="100%" viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">
  <style>
    .box { fill:#ffffff; stroke-width:2; rx:14; }
    .app { stroke:#2196f3; fill:#e3f2fd; }
    .engine { stroke:#4caf50; fill:#e8f5e9; }
    .renderer { stroke:#ff9800; fill:#fff3e0; }
    .runtime { stroke:#e91e63; fill:#fce4ec; }
    .text { font-family: Arial, sans-serif; font-size:16px; fill:#222; }
    .arrow { stroke:#444; stroke-width:2; marker-end:url(#arrow); }
  </style>

  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3"
            orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L6,3 L0,6 Z" fill="#444"/>
    </marker>
  </defs>

  <!-- Boxes -->
  <rect x="200" y="20" width="400" height="80" class="box app"/>
  <rect x="200" y="130" width="400" height="90" class="box engine"/>
  <rect x="200" y="260" width="400" height="80" class="box renderer"/>
  <rect x="200" y="370" width="400" height="90" class="box runtime"/>

  <!-- Text -->
  <text x="400" y="55" text-anchor="middle" class="text">
    Application Layer
  </text>
  <text x="400" y="80" text-anchor="middle" class="text" font-size="14">
    Views · Components · State
  </text>

  <text x="400" y="165" text-anchor="middle" class="text">
    UI Engine
  </text>
  <text x="400" y="190" text-anchor="middle" class="text" font-size="14">
    Layout · Input · Animation · Routing
  </text>

  <text x="400" y="305" text-anchor="middle" class="text">
    Renderer
  </text>
  <text x="400" y="330" text-anchor="middle" class="text" font-size="14">
    Canvas 2D / WebGL
  </text>

  <text x="400" y="405" text-anchor="middle" class="text">
    WebView Runtime
  </text>
  <text x="400" y="430" text-anchor="middle" class="text" font-size="14">
    Capacitor · Cordova
  </text>

  <!-- Arrows -->
  <line x1="400" y1="100" x2="400" y2="130" class="arrow"/>
  <line x1="400" y1="220" x2="400" y2="260" class="arrow"/>
  <line x1="400" y1="340" x2="400" y2="370" class="arrow"/>
</svg>

> **The WebView is only a runtime shell.**  
> **The UI is fully controlled by the engine (no DOM, no HTML layout).**


### Key point

> **The browser does not manage UI.  
> The engine does.**

---

## 🎨 Rendering

- Canvas 2D (CPU)
- Optional WebGL backend (GPU accelerated)
- Device Pixel Ratio aware
- Dirty-region rendering
- Scene graph based

Rendering performance depends **entirely on the engine**, not on the browser DOM.

---

## 🧩 UI Model

- Every component is **drawn**, not mounted
- No HTML nodes
- No CSS
- No reflow
- No repaint cost from the browser

Example components:
- Button
- Text
- Input
- Slider
- Switch
- List / Card
- Modal / Dialog / BottomSheet
- Navigation & routing system

---

## 🧭 Navigation

- Internal routing system
- Stack-based navigation
- Animated transitions (slide / fade)
- Independent from browser routing logic

---

## 🧵 Multithreading

- **UI Worker** → layout & scroll inertia
- **Logic Worker** → business logic
- Main thread → rendering only

This allows smoother UI and better separation of concerns.

---

## 🔌 Native capabilities

Native features are accessed via the **host runtime** (Capacitor / Cordova):

- Camera
- Filesystem
- Secure storage
- Geolocation
- WebSocket
- Network

⚠️ Plugins that **require DOM access are not supported**.

---

## 📦 Data & Networking

The engine provides its own service layer:
- Cached fetch service
- WebSocket manager
- Geolocation abstraction
- Offline-first data handling

All APIs are **engine-controlled**, not browser-controlled.

---

## 🆚 Comparison

### vs React Native

| React Native | Canvas UI Engine |
|-------------|-----------------|
| Native views | Custom rendering |
| Bridge overhead | Direct rendering |
| Platform UI | Engine UI |
| DOM-like model | Scene graph |

---

### vs Flutter

| Flutter | Canvas UI Engine |
|--------|------------------|
| Native engine | WebView runtime |
| Skia | Canvas / WebGL |
| Dart | JavaScript |
| Compiled | Interpreted |
| UI engine | UI engine |

👉 **Same architecture philosophy**, different runtime constraints.

---

## ⚠️ Known limitations

- No DOM access
- No HTML rendering
- No SEO
- No accessibility (yet)
- Text shaping is basic (LTR focused)

These are **intentional design decisions**.

---

## 🎯 Target use cases

- Mobile applications
- Embedded systems
- Kiosk interfaces
- Medical / industrial apps
- Offline-first apps
- UI where **control > compatibility**

---

## 🛣️ Roadmap (simplified)

### Phase 1 – Core engine (current)
- Canvas/WebGL rendering
- Input & layout
- Core components

### Phase 2 – Performance & UX
- Gesture system
- Animation engine
- Advanced scrolling
- Asset caching

### Phase 3 – Ecosystem
- Plugin bridge
- Devtools
- Theming system

---

## 🧪 Philosophy

> **The WebView is just a runtime.  
> The UI is owned by the engine.**

If the engine is fast → the app is fast.  
If the engine is slow → nothing can save it.

---

## 📄 License

MIT
