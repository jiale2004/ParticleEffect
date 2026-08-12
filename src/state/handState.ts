export type HandPose = 'unknown' | 'open' | 'fist' | 'pinch'

export interface HandSnapshot {
  present: boolean
  handedness: 'Left' | 'Right' | 'Unknown'
  /** World-space palm center */
  palm: [number, number, number]
  /** World-space index tip */
  indexTip: [number, number, number]
  /** World-space velocity of palm */
  velocity: [number, number, number]
  pose: HandPose
  /** 0–1 pinch strength */
  pinch: number
  /** 0–1 openness */
  openness: number
  /** Normalized image-space landmarks (mirrored x), length 21*3 when present */
  landmarks: Float32Array | null
  /** Wrist-to-middle-knuckle size in image space */
  handSize: number
}

export interface TwoHandState {
  /** Distance between palms, normalized by average hand size (world) */
  spread: number
  active: boolean
}

export interface HandFrameState {
  left: HandSnapshot
  right: HandSnapshot
  twoHand: TwoHandState
  /** Performance.now() when last updated */
  updatedAt: number
  /** Camera frame timestamp used for MediaPipe */
  videoTimestamp: number
}

function emptyHand(): HandSnapshot {
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

export function createHandFrameState(): HandFrameState {
  return {
    left: emptyHand(),
    right: emptyHand(),
    twoHand: { spread: 0, active: false },
    updatedAt: 0,
    videoTimestamp: 0,
  }
}

/** Mutable shared state — vision writes, render loop reads. Never put in React state. */
export const handStateRef: { current: HandFrameState } = {
  current: createHandFrameState(),
}

/** Uniform-friendly packed hand forces for particle sims */
export interface HandForceUniforms {
  leftPalm: [number, number, number]
  rightPalm: [number, number, number]
  leftIndex: [number, number, number]
  rightIndex: [number, number, number]
  leftVel: [number, number, number]
  rightVel: [number, number, number]
  leftPresent: number
  rightPresent: number
  leftOpenness: number
  rightOpenness: number
  leftPinch: number
  rightPinch: number
  leftFist: number
  rightFist: number
  spread: number
  time: number
  dt: number
}

export function handForcesFromState(
  state: HandFrameState,
  time: number,
  dt: number,
): HandForceUniforms {
  const { left, right, twoHand } = state
  return {
    leftPalm: left.palm,
    rightPalm: right.palm,
    leftIndex: left.indexTip,
    rightIndex: right.indexTip,
    leftVel: left.velocity,
    rightVel: right.velocity,
    leftPresent: left.present ? 1 : 0,
    rightPresent: right.present ? 1 : 0,
    leftOpenness: left.openness,
    rightOpenness: right.openness,
    leftPinch: left.pinch,
    rightPinch: right.pinch,
    leftFist: left.pose === 'fist' ? 1 : 0,
    rightFist: right.pose === 'fist' ? 1 : 0,
    spread: twoHand.active ? twoHand.spread : 1,
    time,
    dt,
  }
}
