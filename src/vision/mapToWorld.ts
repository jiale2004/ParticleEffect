import type { Camera, Vector3 } from 'three'
import { Vector3 as V3 } from 'three'

const _ndc = new V3()
const _world = new V3()

/**
 * Map mirrored image-normalized landmark (x,y in 0–1, MediaPipe style) to world
 * on the z = planeZ plane using the active camera.
 */
export function imageToWorld(
  xMirrored: number,
  y: number,
  camera: Camera,
  planeZ = 0,
  out: Vector3 = _world,
): Vector3 {
  // MediaPipe: origin top-left, y down. NDC: origin center, y up.
  const ndcX = xMirrored * 2 - 1
  const ndcY = -(y * 2 - 1)
  _ndc.set(ndcX, ndcY, 0.5)
  _ndc.unproject(camera)

  const dir = _ndc.sub(camera.position).normalize()
  const camZ = camera.position.z
  const t = Math.abs(dir.z) > 1e-5 ? (planeZ - camZ) / dir.z : 0
  return out.copy(camera.position).addScaledVector(dir, t)
}

/** Depth proxy from hand size: larger hand in image => closer to camera (smaller z). */
export function depthFromHandSize(handSize: number, baseSize = 0.18): number {
  const ratio = Math.min(2.5, Math.max(0.4, handSize / baseSize))
  // base plane at z=0; closer hands pull toward camera (+z if camera at +z looking -z)
  return (1 - ratio) * 1.2
}

export function twoHandSpread(
  leftPalm: [number, number, number],
  rightPalm: [number, number, number],
  leftSize: number,
  rightSize: number,
): number {
  const dx = leftPalm[0] - rightPalm[0]
  const dy = leftPalm[1] - rightPalm[1]
  const dz = leftPalm[2] - rightPalm[2]
  const dist = Math.hypot(dx, dy, dz)
  const norm = Math.max(0.15, (leftSize + rightSize) * 0.5 * 8)
  return dist / norm
}
