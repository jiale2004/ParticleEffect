# Gesture Particles

Webcam-driven GPU particle effects controlled by hand gestures. Built with Vite, React 19, React Three Fiber, Three.js WebGPU, MediaPipe Hands, Zustand, Leva, and Tailwind.

## Quick start

```bash
npm install
npm run dev
```

Open the local URL (usually `http://localhost:5173`), allow camera access, then pick an effect.

```bash
npm run build    # production build
npm run preview  # preview the build
```

## How it works

1. **Vision** — MediaPipe `HandLandmarker` runs at ~30 Hz on a hidden video element. The model is vendored at `public/models/hand_landmarker.task`.
2. **Gestures** — One Euro filtering, pose classification (open / fist / pinch) with hysteresis, two-hand spread, and world-space mapping into a mutable `handStateRef` (no React re-renders on tracking).
3. **Particles** — Effects register through `EffectRegistry`. Dust uses a WebGPU TSL compute harness when available; butterflies and neurons use the shared CPU force model (and always work on the WebGL2 fallback path).
4. **Fallback** — If `navigator.gpu` is missing or WebGPU init fails, the app uses WebGL2 + `CpuSimulator` at reduced particle counts. An FPS watchdog auto-reduces count when frames drop.

## Gestures

| Gesture | Effect |
| --- | --- |
| Open palm | Attract / gather / excite |
| Fist | Repel / scatter |
| Pinch | Grab and drag a local clump |
| Two-hand spread | Expand or compress the field |

## Browser support

- **Best:** Chrome / Edge 113+ with WebGPU enabled (default on desktop).
- **Fallback:** Any recent Chromium/Firefox/Safari with WebGL2 — CPU particle sim at lower counts.
- **Camera:** `getUserMedia` requires a **secure context**. `localhost` is fine; deployed sites need **HTTPS**.

## Privacy

All camera frames are processed on-device. Nothing is uploaded. MediaPipe WASM and the hand model are served from this app (`public/mediapipe`, `public/models`).

## Project layout

```
src/
  scene/Stage.tsx          Canvas + WebGPU/WebGL2 factory
  vision/                  HandTracker, gestures, One Euro, world mapping
  particles/               EffectRegistry, forces, effects, CpuSimulator
  state/                   zustand UI store + mutable handStateRef
  ui/                      PermissionGate, EffectPicker, GestureLegend, DebugHud
```

## Pinned stack

See `package.json` for pinned `three`, `@react-three/fiber`, `@react-three/drei`, and `@mediapipe/tasks-vision` versions. TSL / WebGPU still move between Three releases — bump carefully.
