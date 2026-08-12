import type { Camera } from 'three'
import { Vector3 } from 'three'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import {
  createHandFrameState,
  handStateRef,
  type HandPose,
  type HandSnapshot,
} from '../state/handState'
import {
  createPoseTracker,
  INDEX_TIP,
  landmarkXYZ,
  measureHandSize,
  measureOpenness,
  measurePinch,
  MIDDLE_MCP,
  updatePose,
  WRIST,
  type PoseTracker,
} from './gestures'
import { depthFromHandSize, imageToWorld, twoHandSpread } from './mapToWorld'
import { OneEuroFilter, OneEuroVec3 } from './oneEuro'

interface HandFilters {
  palm: OneEuroVec3
  index: OneEuroVec3
  openness: OneEuroFilter
  pinch: OneEuroFilter
  pose: PoseTracker
  prevPalm: [number, number, number]
  prevTime: number
  /** Persistent landmark buffer (avoids per-frame alloc) */
  landmarks: Float32Array
}

function createFilters(): HandFilters {
  return {
    palm: new OneEuroVec3(1.2, 0.02, 1.0),
    index: new OneEuroVec3(1.5, 0.03, 1.0),
    openness: new OneEuroFilter(1.0, 0.01, 1.0),
    pinch: new OneEuroFilter(1.2, 0.02, 1.0),
    pose: createPoseTracker(),
    prevPalm: [0, 0, 0],
    prevTime: 0,
    landmarks: new Float32Array(21 * 3),
  }
}

const _tmp = new Vector3()

function packLandmarksInto(
  lms: NormalizedLandmark[],
  mirrored: boolean,
  out: Float32Array,
): Float32Array {
  for (let i = 0; i < 21; i++) {
    const p = lms[i]!
    out[i * 3] = mirrored ? 1 - p.x : p.x
    out[i * 3 + 1] = p.y
    out[i * 3 + 2] = p.z
  }
  return out
}

function processHand(
  lms: NormalizedLandmark[],
  handedness: 'Left' | 'Right' | 'Unknown',
  filters: HandFilters,
  camera: Camera,
  tSec: number,
): HandSnapshot {
  const packed = packLandmarksInto(lms, true, filters.landmarks)
  const handSize = measureHandSize(packed)
  const rawOpen = measureOpenness(packed)
  const rawPinch = measurePinch(packed, handSize)
  const openness = filters.openness.filter(rawOpen, tSec)
  const pinch = filters.pinch.filter(rawPinch, tSec)
  const pose: HandPose = updatePose(filters.pose, openness, pinch)

  const [wx, wy] = landmarkXYZ(packed, WRIST)
  const [mx, my] = landmarkXYZ(packed, MIDDLE_MCP)
  const [ix, iy] = landmarkXYZ(packed, INDEX_TIP)

  const palmX = (wx + mx) * 0.5
  const palmY = (wy + my) * 0.5
  const planeZ = depthFromHandSize(handSize)

  imageToWorld(palmX, palmY, camera, planeZ, _tmp)
  const palmF = filters.palm.filter(_tmp.x, _tmp.y, _tmp.z, tSec)

  imageToWorld(ix, iy, camera, planeZ, _tmp)
  const indexF = filters.index.filter(_tmp.x, _tmp.y, _tmp.z, tSec)

  let velocity: [number, number, number] = [0, 0, 0]
  if (filters.prevTime > 0) {
    const dt = Math.max(1e-3, tSec - filters.prevTime)
    velocity = [
      (palmF[0] - filters.prevPalm[0]) / dt,
      (palmF[1] - filters.prevPalm[1]) / dt,
      (palmF[2] - filters.prevPalm[2]) / dt,
    ]
  }
  filters.prevPalm = palmF
  filters.prevTime = tSec

  const worldHandSize = Math.max(0.08, handSize * 2.2)

  return {
    present: true,
    handedness,
    palm: palmF,
    indexTip: indexF,
    velocity,
    pose,
    pinch,
    openness,
    landmarks: filters.landmarks,
    handSize: worldHandSize,
  }
}

function clearHand(filters: HandFilters): HandSnapshot {
  filters.palm.reset()
  filters.index.reset()
  filters.openness.reset()
  filters.pinch.reset()
  filters.pose = createPoseTracker()
  filters.prevTime = 0
  return {
    present: false,
    handedness: 'Unknown',
    palm: [0, 0, 0],
    indexTip: [0, 0, 0],
    velocity: [0, 0, 0],
    pose: 'unknown',
    pinch: 0,
    openness: 0,
    landmarks: null,
    handSize: 0.1,
  }
}

/**
 * Consumes MediaPipe results, writes smoothed world-space hand state into `handStateRef`.
 */
export class GestureEngine {
  private left = createFilters()
  private right = createFilters()
  private camera: Camera | null = null

  setCamera(camera: Camera | null) {
    this.camera = camera
  }

  reset() {
    handStateRef.current = createHandFrameState()
    this.left = createFilters()
    this.right = createFilters()
  }

  ingest(payload: {
    landmarks: NormalizedLandmark[][]
    handednesses: Array<Array<{ categoryName: string; score: number }>>
    timestamp: number
  } | null) {
    const camera = this.camera
    const state = handStateRef.current
    const tSec = (payload?.timestamp ?? performance.now()) * 0.001

    if (!payload || !camera || payload.landmarks.length === 0) {
      state.left = clearHand(this.left)
      state.right = clearHand(this.right)
      state.twoHand = { spread: 0, active: false }
      state.updatedAt = performance.now()
      state.videoTimestamp = payload?.timestamp ?? 0
      return
    }

    let leftSnap: HandSnapshot | null = null
    let rightSnap: HandSnapshot | null = null

    for (let i = 0; i < payload.landmarks.length; i++) {
      const lm = payload.landmarks[i]!
      const label = payload.handednesses[i]?.[0]?.categoryName ?? 'Unknown'
      // After mirroring the image, MediaPipe's Left/Right still refers to the person —
      // keep labels as reported for HUD clarity.
      const hand = label === 'Left' || label === 'Right' ? label : 'Unknown'
      const snap = processHand(lm, hand, hand === 'Right' ? this.right : this.left, camera, tSec)
      if (hand === 'Right') rightSnap = snap
      else leftSnap = snap
    }

    state.left = leftSnap ?? clearHand(this.left)
    state.right = rightSnap ?? clearHand(this.right)

    if (state.left.present && state.right.present) {
      const spread = twoHandSpread(
        state.left.palm,
        state.right.palm,
        state.left.handSize,
        state.right.handSize,
      )
      state.twoHand = { spread, active: true }
    } else {
      state.twoHand = { spread: 0, active: false }
    }

    state.updatedAt = performance.now()
    state.videoTimestamp = payload.timestamp
  }
}

export const gestureEngine = new GestureEngine()
