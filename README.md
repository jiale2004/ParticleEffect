# Lumen

A dark-room particle field that wakes when you raise a hand. Webcam gestures drive three living effects — Morpho, Synapse, Fireflies — entirely on-device.

## Run

```bash
npm install
npm run dev
```

Allow the camera, then show a hand. The field stays black until it sees you.

```bash
npm run build
npm run preview
```

## Gestures

| Pose | What happens |
| --- | --- |
| Open palm | Attract, gather, excite |
| Fist | Scatter |
| Pinch | Grab a local clump |

A 21-point skeleton overlay tracks your hand over the field. Toggle it from Room.

## Effects

- **Morpho** — iridescent blue butterflies that flock to your palm
- **Synapse** — a neural lattice with travelling pulses
- **Fireflies** — a warm constellation that blooms from your hand

## Notes

- Camera frames never leave the browser. MediaPipe WASM and the hand model live under `public/`.
- Tuned for ~60 FPS on Mac (WebGL2 + a small CPU sim). `getUserMedia` needs HTTPS outside localhost.
