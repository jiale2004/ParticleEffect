import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

export type LandmarkListener = (result: {
  landmarks: NormalizedLandmark[][]
  handednesses: Array<Array<{ categoryName: string; score: number }>>
  timestamp: number
} | null) => void

/** 12 Hz tracking — gestures stay usable, main thread stays free for 60 FPS render. */
const DETECT_INTERVAL_MS = 1000 / 12

/**
 * Camera + MediaPipe HandLandmarker pipeline.
 * `start()/stop()/subscribe()` shaped so a Web Worker migration stays contained.
 */
export class HandTracker {
  private video: HTMLVideoElement | null = null
  private landmarker: HandLandmarker | null = null
  private stream: MediaStream | null = null
  private raf = 0
  private running = false
  private lastDetect = 0
  private listeners = new Set<LandmarkListener>()
  private initPromise: Promise<void> | null = null

  subscribe(listener: LandmarkListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.video
  }

  async start(): Promise<HTMLVideoElement> {
    if (this.running && this.video) return this.video
    await this.ensureLandmarker()

    const video = document.createElement('video')
    video.setAttribute('playsinline', 'true')
    video.muted = true
    video.playsInline = true
    video.style.position = 'fixed'
    video.style.width = '1px'
    video.style.height = '1px'
    video.style.opacity = '0'
    video.style.pointerEvents = 'none'
    document.body.appendChild(video)

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: 320 },
        height: { ideal: 240 },
        frameRate: { ideal: 15, max: 20 },
      },
    })

    video.srcObject = stream
    await video.play()

    this.video = video
    this.stream = stream
    this.running = true
    this.lastDetect = 0
    this.loop()
    return video
  }

  stop() {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0

    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null

    if (this.video) {
      this.video.srcObject = null
      this.video.remove()
      this.video = null
    }

    this.emit(null)
  }

  dispose() {
    this.stop()
    this.landmarker?.close()
    this.landmarker = null
    this.listeners.clear()
  }

  private async ensureLandmarker() {
    if (this.landmarker) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
      // CPU delegate is more predictable on macOS for 60 FPS (GPU can hitch).
      this.landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: '/models/hand_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.7,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      })
    })()

    return this.initPromise
  }

  private loop = () => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.loop)

    const video = this.video
    const landmarker = this.landmarker
    if (!video || !landmarker || video.readyState < 2) return

    const now = performance.now()
    if (now - this.lastDetect < DETECT_INTERVAL_MS) return
    this.lastDetect = now

    let result: HandLandmarkerResult
    try {
      result = landmarker.detectForVideo(video, now)
    } catch {
      return
    }

    this.emit({
      landmarks: result.landmarks,
      handednesses: result.handednesses as Array<
        Array<{ categoryName: string; score: number }>
      >,
      timestamp: now,
    })
  }

  private emit(
    payload: {
      landmarks: NormalizedLandmark[][]
      handednesses: Array<Array<{ categoryName: string; score: number }>>
      timestamp: number
    } | null,
  ) {
    for (const listener of this.listeners) listener(payload)
  }
}

export const handTracker = new HandTracker()
