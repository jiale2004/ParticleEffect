import type { HandForceUniforms } from '../state/handState'

/** Shared CPU force model consumed by CpuSimulator and effect code. */

function attractRepel(
  px: number,
  py: number,
  pz: number,
  tx: number,
  ty: number,
  tz: number,
  strength: number,
  radius: number,
  out: [number, number, number],
) {
  const dx = tx - px
  const dy = ty - py
  const dz = tz - pz
  const d2 = dx * dx + dy * dy + dz * dz
  const r2 = radius * radius
  if (d2 > r2 || d2 < 1e-8) {
    out[0] = 0
    out[1] = 0
    out[2] = 0
    return
  }
  const d = Math.sqrt(d2)
  const falloff = 1 - d / radius
  const s = (strength * falloff * falloff) / d
  out[0] = dx * s
  out[1] = dy * s
  out[2] = dz * s
}

const _f = [0, 0, 0] as [number, number, number]

/**
 * Accumulate hand forces onto a particle at (px,py,pz).
 * Mutates vx,vy,vz in place (passed as a mutable tuple).
 */
export function applyHandForces(
  px: number,
  py: number,
  pz: number,
  vel: [number, number, number],
  forces: HandForceUniforms,
  opts: {
    attract: number
    repel: number
    pinch: number
    wind: number
    radius: number
  },
) {
  const hands = [
    {
      present: forces.leftPresent,
      palm: forces.leftPalm,
      index: forces.leftIndex,
      vel: forces.leftVel,
      openness: forces.leftOpenness,
      pinch: forces.leftPinch,
      fist: forces.leftFist,
    },
    {
      present: forces.rightPresent,
      palm: forces.rightPalm,
      index: forces.rightIndex,
      vel: forces.rightVel,
      openness: forces.rightOpenness,
      pinch: forces.rightPinch,
      fist: forces.rightFist,
    },
  ] as const

  for (const h of hands) {
    if (!h.present) continue

    // Open palm attracts
    const attract = opts.attract * h.openness * (1 - h.fist)
    attractRepel(px, py, pz, h.palm[0], h.palm[1], h.palm[2], attract, opts.radius, _f)
    vel[0] += _f[0]
    vel[1] += _f[1]
    vel[2] += _f[2]

    // Fist repels
    const repel = -opts.repel * h.fist
    attractRepel(px, py, pz, h.palm[0], h.palm[1], h.palm[2], repel, opts.radius * 1.2, _f)
    vel[0] += _f[0]
    vel[1] += _f[1]
    vel[2] += _f[2]

    // Pinch springs toward index tip
    if (h.pinch > 0.4) {
      attractRepel(
        px,
        py,
        pz,
        h.index[0],
        h.index[1],
        h.index[2],
        opts.pinch * h.pinch,
        opts.radius * 0.7,
        _f,
      )
      vel[0] += _f[0]
      vel[1] += _f[1]
      vel[2] += _f[2]
    }

    // Hand velocity as wind
    vel[0] += h.vel[0] * opts.wind
    vel[1] += h.vel[1] * opts.wind
    vel[2] += h.vel[2] * opts.wind
  }

  // Two-hand spread scales velocity outward from origin
  const spread = forces.spread
  if (spread > 1.05) {
    const push = (spread - 1) * 0.35
    vel[0] += px * push * 0.02
    vel[1] += py * push * 0.02
    vel[2] += pz * push * 0.02
  } else if (spread > 0 && spread < 0.85) {
    const pull = (0.85 - spread) * 0.4
    vel[0] -= px * pull * 0.02
    vel[1] -= py * pull * 0.02
    vel[2] -= pz * pull * 0.02
  }
}

/** Curl-ish noise wander for organic flight */
export function curlNoise3(
  x: number,
  y: number,
  z: number,
  t: number,
): [number, number, number] {
  const n1 = Math.sin(x * 0.7 + t * 0.4) * Math.cos(y * 0.5 - t * 0.3)
  const n2 = Math.sin(y * 0.6 + t * 0.35) * Math.cos(z * 0.55 + t * 0.25)
  const n3 = Math.sin(z * 0.65 - t * 0.2) * Math.cos(x * 0.45 + t * 0.3)
  return [n2 - n3, n3 - n1, n1 - n2]
}
