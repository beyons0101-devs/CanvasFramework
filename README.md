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

## 🧠 Architecture

```mermaid
flowchart TB
    A[Application Layer<br/>Views · Components · State] --> B
    B[UI Engine<br/>Layout · Input · Animation · Routing] --> C
    C[Renderer<br/>Canvas 2D / WebGL] --> D
    D[WebView Runtime<br/>Capacitor · Cordova]

    style A fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    style B fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style C fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style D fill:#fce4ec,stroke:#e91e63,stroke-width:2px

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
