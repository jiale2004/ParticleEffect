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

/** Always CPU Points — tiny, stable 60 FPS path. */
function createDust(ctx: EffectContext): EffectInstance {
  const count = Math.min(ctx.count, 500)
  const sim = new CpuSimulator(
    count,
    {
      attract: 8,
      repel: 10,
      pinch: 12,
      wind: 0.14,
      wander: 0.3,
      radius: 3.0,
      bounds: 5.5,
      damping: 0.96,
    },
    4,
  )

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(sim.buffers.positions, 3))
  geometry.setAttribute('color', new BufferAttribute(sim.buffers.colors, 3))

  const material = new PointsMaterial({
    size: 0.07,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: AdditiveBlending,
    sizeAttenuation: true,
  })

  const points = new Points(geometry, material)
  points.frustumCulled = false
  points.visible = false

  const c = new Color()
  for (let i = 0; i < count; i++) {
    c.setHSL(0.08 + Math.random() * 0.12, 0.55, 0.55 + Math.random() * 0.3)
    sim.buffers.colors[i * 3] = c.r
    sim.buffers.colors[i * 3 + 1] = c.g
    sim.buffers.colors[i * 3 + 2] = c.b
  }
  ;(geometry.getAttribute('color') as BufferAttribute).needsUpdate = true

  return {
    roots: [points],
    get summoned() {
      return sim.summoned
    },
    summon(origin) {
      if (sim.summoned) return
      sim.summonAt(origin, 0.35, 4.5)
      points.visible = true
      ;(geometry.getAttribute('position') as BufferAttribute).needsUpdate = true
    },
    update(dt, forces) {
      if (!sim.summoned) return
      sim.step(dt, forces)
      ;(geometry.getAttribute('position') as BufferAttribute).needsUpdate = true
    },
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}

export const dustEffect: ParticleEffect = {
  id: 'dust',
  name: 'Dust',
  maxCount: { webgpu: 800, fallback: 400 },
  gestureHints: [
    { pose: 'Open palm', description: 'Attract dust toward your hand' },
    { pose: 'Fist', description: 'Scatter particles outward' },
    { pose: 'Pinch', description: 'Grab and drag a local clump' },
    { pose: 'Two-hand spread', description: 'Expand or compress the field' },
  ],
  create: createDust,
}
