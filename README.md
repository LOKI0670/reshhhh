<<<<<<< HEAD
# MIST — The Virtual Fog Mirror

> _"Your mirror. Your mood. Your moment."_

A beautiful, immersive web application that recreates the experience of a fogged bathroom mirror. See your live reflection through your device's camera beneath a realistic fog layer — then wipe, write, and reveal your reflection with your fingertips.

![MIST Application](https://img.shields.io/badge/MIST-Fog_Mirror-8ba3d4?style=for-the-badge)

---

## ✨ Features

- **Live Camera Mirror** — Real-time webcam feed horizontally flipped like a real mirror
- **Realistic Fog Rendering** — Procedural noise-based fog with droplets, water marks, and shimmer
- **Wipe & Write** — Mouse, touch, and pointer-based fog erasing with smooth stroke interpolation
- **Fog Presets** — 6 distinct atmospheric styles (Classic Bathroom, Morning Mist, Heavy Steam, Dew Drops, Dreamy, Clean Glass)
- **Undo / Redo** — Full stroke history with configurable depth limit (no memory bloat)
- **Message Reveal** — Type a word and reveal it in the fog
- **Optional Hand Tracking** — MediaPipe-powered index finger tracking with pinch gesture
- **Image Export** — Composite camera + fog → downloadable PNG with optional MIST watermark
- **Demo Mode** — Fully functional without a camera
- **Fullscreen Mode** — Immersive full-viewport experience
- **Settings Persistence** — LocalStorage-backed preferences
- **Responsive** — Desktop, tablet, and mobile (portrait + landscape)
- **Accessible** — ARIA labels, keyboard navigation, reduced-motion support

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A modern browser (Chrome, Edge, Firefox, Safari)
- Camera access (optional; Demo Mode works without it)
- **HTTPS or localhost** required for camera access (browser security requirement)

### Installation

```bash
# Clone or open in the project directory
cd RESHHH

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Production build (TypeScript + Vite) |
| `npm run preview` | Preview production build locally |
| `npm test` | Run all unit tests once |
| `npm run test:watch` | Run tests in watch mode |

---

## 🏗 Architecture

```
src/
├── components/
│   ├── IntroPage.tsx       # Landing / onboarding screen
│   ├── MirrorView.tsx      # Core mirror experience (camera + fog + controls)
│   ├── Toolbar.tsx         # Bottom mode selector and action buttons
│   └── SettingsPanel.tsx   # Slide-out settings drawer
│
├── engine/
│   ├── FogTexture.ts       # Procedural fog texture generator (value noise + FBM)
│   ├── FogRenderer.ts      # Canvas rendering, stroke erase, undo/redo
│   ├── StrokeHistory.ts    # Bounded ImageData snapshot history
│   └── HandTracking.ts     # MediaPipe hand-landmark tracking
│
├── hooks/
│   ├── useCamera.ts        # WebRTC camera stream with permission handling
│   ├── useFogCanvas.ts     # FogRenderer lifecycle + pointer event state
│   └── useSettings.ts      # App settings with localStorage persistence
│
├── services/
│   ├── CameraService.ts    # getUserMedia wrapper with error classification
│   └── ExportService.ts    # Canvas composite → PNG download
│
├── styles/
│   ├── global.css          # Design system (tokens, glass, buttons, animations)
│   ├── intro.css           # Intro page styles
│   └── mirror.css          # Mirror view styles
│
├── test/
│   ├── setup.ts            # jsdom environment mocks
│   ├── StrokeHistory.test.ts
│   ├── FogRenderer.test.ts
│   └── CameraService.test.ts
│
├── types/index.ts          # TypeScript types and interfaces
├── utils/constants.ts      # Fog preset configs and app constants
├── App.tsx                 # Root screen router
└── main.tsx                # Entry point
```

### Key Design Decisions

**Fog Rendering:**  
The fog uses a two-layer approach: a pre-generated texture canvas (value noise + FBM + droplets) is drawn to the interactive fog canvas on `initFog`. Erasing uses `destination-out` compositing with a feathered radial gradient, revealing the live video beneath — not a painted face.

**Performance:**  
- The fog texture is generated once per preset change (not per frame)
- Stroke interpolation fills gaps between fast pointer moves
- Canvas operations happen via direct refs — no React state involved during drawing
- Hand tracking runs at ~15 FPS independently from the render loop

**Undo/Redo:**  
Snapshots are taken as `ImageData` before each stroke begins (not after every point). The history is bounded to 20 entries, preventing memory leaks during long sessions.

---

## 🎮 Usage

### Modes

| Mode | Description |
|---|---|
| **Wipe** | Drag to erase fog and reveal your reflection |
| **Write** | Draw letters, shapes, or patterns freely |
| **Hand Tracking** | Use your index finger (pinch gesture to activate drawing) |
| **Message** | Type a word to reveal it in the fog |

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Z` | Undo last stroke |
| `Ctrl+Shift+Z` or `Ctrl+Y` | Redo |
| `Ctrl+S` | Save image |
| `Escape` | Close settings panel |

### Fog Presets

| Preset | Opacity | Character |
|---|---|---|
| Classic Bathroom | 88% | Standard white condensation + droplets |
| Morning Mist | 65% | Subtle, light mist |
| Heavy Steam | 96% | Dense opaque fog + droplets |
| Dew Drops | 78% | Glass droplets focus |
| Dreamy Mirror | 82% | Cool lavender-tinted mist |
| Clean Glass | 40% | Near-transparent condensation |

---

## 🤚 Hand Tracking Setup

Hand tracking uses **MediaPipe Tasks Vision** loaded from CDN at runtime.

1. Enable **Hand Tracking** in Settings
2. Switch to **Hand** mode in the toolbar
3. Show your hand to the camera
4. **Pinch** your index finger and thumb together to start wiping
5. Release the pinch to stop

> ⚠️ Hand tracking requires a working camera and runs on WebGL. It degrades gracefully to mouse/touch if unavailable.

---

## 📸 Image Export

Click the **Save** button (↓ icon in toolbar) or press `Ctrl+S`.

The export composites:
1. The current camera frame (mirrored to match display)
2. The current fog canvas state (including all wiped areas)
3. Optional MIST watermark (bottom-left)
4. Optional timestamp (bottom-right)

> Note: The camera frame is captured at the moment of export. If fog fully covers an area, the camera image shows beneath it but may not be captured — this is by design.

---

## 🔒 Privacy

- **Camera video is never transmitted** anywhere
- All processing happens locally in your browser
- Screenshots are created only when you explicitly click Save
- Camera tracks are stopped when you exit the mirror
- No analytics capture camera content

---

## ⚙️ Configuration

Settings are persisted in `localStorage` under the key `mist-settings`. No `.env` file is required for the frontend-only version.

---

## 🧪 Testing

```bash
npm test
```

Tests cover:
- `StrokeHistory` — undo/redo logic, stack limits, clear
- `FogRenderer` — initialization, stroke lifecycle, history integration
- `CameraService` — permission states, error classification, stream cleanup

Tests run in a jsdom environment with mocked canvas, MediaDevices, and ResizeObserver APIs.

---

## 🛠 Troubleshooting

**Camera not working?**
- Make sure you're on `localhost` or `https://` — cameras require a secure context
- Check that no other app is using your camera
- Try clicking "Try Again" on the permission error screen

**Hand tracking not detecting?**
- Ensure good lighting on your hand
- Hold your hand ~30–60cm from the camera
- The feature downloads ~150KB of model data on first use

**Fog looks flat?**
- Try the "Classic Bathroom" or "Heavy Steam" preset
- Increase Droplet Intensity in Settings

**Export image looks dark?**
- This can happen if the browser blocks `drawImage` on a tainted canvas. Use `localhost` or HTTPS to avoid cross-origin restrictions.

---

## 📋 Limitations

- Hand tracking currently uses an external CDN for the MediaPipe WASM and model files. A fully offline version would need those bundled locally.
- The fog texture is regenerated when switching presets, which takes ~100ms on slower devices.
- Safari on iOS may limit camera frame rate in PWA/standalone mode.

---

## 🏗 Future Roadmap

- [ ] Backend with user accounts and saved creations
- [ ] Cloud gallery to share fog art
- [ ] Custom fog color themes
- [ ] More brush shapes (spray, line, star)
- [ ] Time-lapse recording of the wipe session
- [ ] PWA / installable app support

---

Made with ❤️ and a little fog.
=======
# reshhhh
>>>>>>> 1a64834b6263168b37221a8a2b961b28e4053b05
