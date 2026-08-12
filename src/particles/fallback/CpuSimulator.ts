import type { HandForceUniforms } from '../../state/handState'
import { applyHandForces, curlNoise3 } from '../forces'

export interface CpuParticleBuffers {
  positions: Float32Array
  velocities: Float32Array
  phases: Float32Array
  colors: Float32Array
  count: number
}

export function createCpuBuffers(
  count: number,
  spread = 3,
  dormant = false,
): CpuParticleBuffers {
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    if (dormant) {
      positions[i3] = 0
      positions[i3 + 1] = 0
      positions[i3 + 2] = 0
    } else {
      positions[i3] = (Math.random() - 0.5) * spread * 2
      positions[i3 + 1] = (Math.random() - 0.5) * spread * 2
      positions[i3 + 2] = (Math.random() - 0.5) * spread * 2
      velocities[i3] = (Math.random() - 0.5) * 0.2
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.2
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.2
    }
    phases[i] = Math.random() * Math.PI * 2
    colors[i3] = 0.4 + Math.random() * 0.6
    colors[i3 + 1] = 0.6 + Math.random() * 0.4
    colors[i3 + 2] = 0.8 + Math.random() * 0.2
  }

  return { positions, velocities, phases, colors, count }
}

export interface CpuSimOptions {
  damping?: number
  attract?: number
  repel?: number
  pinch?: number
  wind?: number
  radius?: number
  wander?: number
  bounds?: number
  bob?: number
}

/**
 * Lightweight CPU particle simulator. Keeps work per frame tiny for 60 FPS.
 */
export class CpuSimulator {
  readonly buffers: CpuParticleBuffers
  private opts: Required<CpuSimOptions>
  private velScratch: [number, number, number] = [0, 0, 0]
  private frame = 0
  summoned = false

  constructor(count: number, opts: CpuSimOptions = {}, _spread = 3) {
    this.buffers = createCpuBuffers(count, _spread, true)
    this.opts = {
      damping: opts.damping ?? 0.96,
      attract: opts.attract ?? 4.5,
      repel: opts.repel ?? 7,
      pinch: opts.pinch ?? 8,
      wind: opts.wind ?? 0.08,
      radius: opts.radius ?? 2.4,
      wander: opts.wander ?? 0.35,
      bounds: opts.bounds ?? 5,
      bob: opts.bob ?? 0,
    }
  }

  summonAt(origin: [number, number, number], radius = 0.35, burst = 4.5) {
    const { positions, velocities, phases, count } = this.buffers
    const [ox, oy, oz] = origin
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const phase = phases[i]!
      const t = i / Math.max(1, count - 1)
      const incl = Math.acos(1 - 2 * t)
      const azim = phase + i * 2.399963
      const r = Math.random() * radius
      const sx = Math.sin(incl) * Math.cos(azim)
      const sy = Math.cos(incl)
      const sz = Math.sin(incl) * Math.sin(azim)
      positions[i3] = ox + sx * r
      positions[i3 + 1] = oy + sy * r
      positions[i3 + 2] = oz + sz * r
      const speed = burst * (0.55 + Math.random() * 0.9)
      velocities[i3] = sx * speed
      velocities[i3 + 1] = sy * speed
      velocities[i3 + 2] = sz * speed
    }
    this.summoned = true
  }

  step(dt: number, forces: HandForceUniforms) {
    if (!this.summoned) return

    this.frame += 1
    const { positions, velocities, phases, count } = this.buffers
    const { damping, attract, repel, pinch, wind, radius, wander, bounds, bob } =
      this.opts
    const clampedDt = Math.min(0.033, Math.max(0.001, dt))
    const t = forces.time
    // Apply expensive wander only every other frame.
    const doWander = wander > 0 && (this.frame & 1) === 0

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      let px = positions[i3]!
      let py = positions[i3 + 1]!
      let pz = positions[i3 + 2]!
      this.velScratch[0] = velocities[i3]!
      this.velScratch[1] = velocities[i3 + 1]!
      this.velScratch[2] = velocities[i3 + 2]!

      if (doWander) {
        const n = curlNoise3(px * 0.4, py * 0.4, pz * 0.4, t + phases[i]!)
        const w = wander * clampedDt * 2
        this.velScratch[0] += n[0] * w
        this.velScratch[1] += n[1] * w
        this.velScratch[2] += n[2] * w
      }

      if (bob > 0) {
        this.velScratch[1] += Math.sin(t * 2.2 + phases[i]!) * bob * clampedDt
      }

      applyHandForces(px, py, pz, this.velScratch, forces, {
        attract,
        repel,
        pinch,
        wind,
        radius,
      })

      this.velScratch[0] *= damping
      this.velScratch[1] *= damping
      this.velScratch[2] *= damping

      px += this.velScratch[0] * clampedDt
      py += this.velScratch[1] * clampedDt
      pz += this.velScratch[2] * clampedDt

      const lim = bounds
      if (px > lim || px < -lim) this.velScratch[0] *= -0.5
      if (py > lim || py < -lim) this.velScratch[1] *= -0.5
      if (pz > lim || pz < -lim) this.velScratch[2] *= -0.5
      px = Math.min(lim, Math.max(-lim, px))
      py = Math.min(lim, Math.max(-lim, py))
      pz = Math.min(lim, Math.max(-lim, pz))

      positions[i3] = px
      positions[i3 + 1] = py
      positions[i3 + 2] = pz
      velocities[i3] = this.velScratch[0]
      velocities[i3 + 1] = this.velScratch[1]
      velocities[i3 + 2] = this.velScratch[2]
    }
  }

  resize(count: number) {
    if (count === this.buffers.count) return
    const next = createCpuBuffers(count, 3, !this.summoned)
    const copy = Math.min(this.buffers.count, count) * 3
    next.positions.set(this.buffers.positions.subarray(0, copy))
    next.velocities.set(this.buffers.velocities.subarray(0, copy))
    Object.assign(this.buffers, next)
  }
}
