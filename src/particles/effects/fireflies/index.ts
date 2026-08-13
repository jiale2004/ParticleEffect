import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
} from 'three'
import type { EffectContext, EffectInstance, ParticleEffect } from '../../types'
import { CpuSimulator } from '../../fallback/CpuSimulator'

function createFireflies(ctx: EffectContext): EffectInstance {
  const count = Math.min(ctx.count, 520)
  const sim = new CpuSimulator(
    count,
    {
      attract: 8.5,
      repel: 14,
      pinch: 15,
      wind: 0.2,
      wander: 0.65,
      bob: 1.1,
      radius: 3.8,
      bounds: 7.4,
      damping: 0.958,
    },
    4,
  )

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(sim.buffers.positions, 3))
  geometry.setAttribute('color', new BufferAttribute(sim.buffers.colors, 3))

  const material = new PointsMaterial({
    size: 0.13,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: AdditiveBlending,
    sizeAttenuation: true,
  })

  const points = new Points(geometry, material)
  points.frustumCulled = false
  points.visible = false

  const ember = new Color('#ff7a1a')
  const gold = new Color('#ffd56a')
  const cream = new Color('#fff4c8')
  const c = new Color()
  for (let i = 0; i < count; i++) {
    const t = Math.random()
    c.copy(ember).lerp(gold, t).lerp(cream, t * t * 0.45)
    sim.buffers.colors[i * 3] = c.r
    sim.buffers.colors[i * 3 + 1] = c.g
    sim.buffers.colors[i * 3 + 2] = c.b
  }
  ;(geometry.getAttribute('color') as BufferAttribute).needsUpdate = true

  let blink = 0
  const colorAttr = geometry.getAttribute('color') as BufferAttribute

  return {
    roots: [points],
    get summoned() {
      return sim.summoned
    },
    summon(origin) {
      if (sim.summoned) return
      sim.summonAt(origin, 0.5, 7.5)
      points.visible = true
      colorAttr.needsUpdate = true
      ;(geometry.getAttribute('position') as BufferAttribute).needsUpdate = true
    },
    update(dt, forces) {
      if (!sim.summoned) return
      sim.step(dt, forces)
      blink += dt
      // Occasional twinkle without rewriting every particle
      if (blink > 0.12) {
        blink = 0
        const n = Math.min(12, count)
        for (let k = 0; k < n; k++) {
          const i = Math.floor(Math.random() * count)
          const pulse = 0.65 + Math.random() * 0.45
          const i3 = i * 3
          colorAttr.setX(i, Math.min(1, (sim.buffers.colors[i3] ?? 1) * pulse))
          colorAttr.setY(i, Math.min(1, (sim.buffers.colors[i3 + 1] ?? 1) * pulse))
          colorAttr.setZ(i, Math.min(1, (sim.buffers.colors[i3 + 2] ?? 1) * pulse))
        }
        colorAttr.needsUpdate = true
      }
      ;(geometry.getAttribute('position') as BufferAttribute).needsUpdate = true
    },
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}

export const firefliesEffect: ParticleEffect = {
  id: 'fireflies',
  name: 'Fireflies',
  epithet: 'A living constellation',
  accent: '#ffc14a',
  maxCount: { webgpu: 520, fallback: 360 },
  gestureHints: [
    { pose: 'Open palm', description: 'They drift in and lantern around you' },
    { pose: 'Fist', description: 'They burst outward like sparks' },
    { pose: 'Pinch', description: 'A small swarm hangs on your fingers' },
  ],
  create: createFireflies,
}
