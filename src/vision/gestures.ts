import type { HandPose } from '../state/handState'

const TIP = [4, 8, 12, 16, 20] as const
const PIP = [3, 6, 10, 14, 18] as const
const MCP = [2, 5, 9, 13, 17] as const
const WRIST = 0
const MIDDLE_MCP = 9
const INDEX_TIP = 8
const THUMB_TIP = 4

function dist(
  lm: ArrayLike<number>,
  a: number,
  b: number,
): number {
  const ax = lm[a * 3]!
  const ay = lm[a * 3 + 1]!
  const az = lm[a * 3 + 2]!
  const bx = lm[b * 3]!
  const by = lm[b * 3 + 1]!
  const bz = lm[b * 3 + 2]!
  const dx = ax - bx
  const dy = ay - by
  const dz = az - bz
  return Math.hypot(dx, dy, dz)
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function measureHandSize(lm: ArrayLike<number>): number {
  return Math.max(1e-4, dist(lm, WRIST, MIDDLE_MCP))
}

/** Pinch strength 0–1 from thumb–index tip distance / hand size */
export function measurePinch(lm: ArrayLike<number>, handSize: number): number {
  const d = dist(lm, THUMB_TIP, INDEX_TIP) / handSize
  // closer => higher pinch; ~0.3 hand-size is firm pinch, ~0.9 is open
  return 1 - smoothstep(0.25, 0.85, d)
}

/** Average finger extension (tip-wrist / mcp-wrist) */
export function measureOpenness(lm: ArrayLike<number>): number {
  let sum = 0
  for (let i = 1; i < 5; i++) {
    const tip = TIP[i]!
    const mcp = MCP[i]!
    const tipLen = dist(lm, tip, WRIST)
    const mcpLen = Math.max(1e-4, dist(lm, mcp, WRIST))
    sum += tipLen / mcpLen
  }
  const avg = sum / 4
  // curled ~0.6–1.0, extended ~1.6–2.2
  return smoothstep(0.85, 1.75, avg)
}

export interface PoseTracker {
  pose: HandPose
  confirm: number
  opennessEnterFist: number
  opennessExitFist: number
  pinchEnter: number
  pinchExit: number
}

export function createPoseTracker(): PoseTracker {
  return {
    pose: 'unknown',
    confirm: 0,
    opennessEnterFist: 0.28,
    opennessExitFist: 0.42,
    pinchEnter: 0.72,
    pinchExit: 0.55,
  }
}

/**
 * Hysteresis + 3-frame confirmation pose classifier.
 */
export function updatePose(
  tracker: PoseTracker,
  openness: number,
  pinch: number,
): HandPose {
  let candidate: HandPose = 'open'
  if (pinch >= tracker.pinchEnter || (tracker.pose === 'pinch' && pinch >= tracker.pinchExit)) {
    candidate = 'pinch'
  } else if (
    openness <= tracker.opennessEnterFist ||
    (tracker.pose === 'fist' && openness <= tracker.opennessExitFist)
  ) {
    candidate = 'fist'
  } else {
    candidate = 'open'
  }

  if (candidate === tracker.pose) {
    tracker.confirm = 0
    return tracker.pose
  }

  tracker.confirm += 1
  if (tracker.confirm >= 3) {
    tracker.pose = candidate
    tracker.confirm = 0
  }
  return tracker.pose
}

export function landmarkXYZ(lm: ArrayLike<number>, index: number): [number, number, number] {
  return [lm[index * 3]!, lm[index * 3 + 1]!, lm[index * 3 + 2]!]
}

export { TIP, PIP, MCP, WRIST, MIDDLE_MCP, INDEX_TIP, THUMB_TIP }
