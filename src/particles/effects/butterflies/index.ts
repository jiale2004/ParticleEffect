import {
  BufferAttribute,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three'
import type { EffectContext, EffectInstance, ParticleEffect } from '../../types'
import { CpuSimulator } from '../../fallback/CpuSimulator'

/**
 * Butterflies as double-sided planes with a blue wing gradient.
 */
function createButterflies(ctx: EffectContext): EffectInstance {
  const count = Math.min(Math.max(ctx.count, 40), 80)

  const sim = new CpuSimulator(
    count,
    {
      attract: 9,
      repel: 12,
      pinch: 14,
      wind: 0.15,
      wander: 0.55,
      bob: 1.6,
      radius: 3.2,
      bounds: 5,
      damping: 0.93,
    },
    3.5,
  )

  const geometry = new PlaneGeometry(0.38, 0.24)
  const posCount = geometry.attributes.position!.count
  const wingColors = new Float32Array(posCount * 3)
  const deep = new Color('#0b3d91')
  const mid = new Color('#1d6fe8')
  const light = new Color('#7dd3fc')
  for (let i = 0; i < posCount; i++) {
    const x = geometry.attributes.position!.getX(i)
    const y = geometry.attributes.position!.getY(i)
    const t = (x + 0.19) / 0.38
    const tip = (y + 0.12) / 0.24
    const col = deep.clone().lerp(mid, Math.min(1, Math.max(0, t))).lerp(light, tip * 0.45)
    wingColors[i * 3] = col.r
    wingColors[i * 3 + 1] = col.g
    wingColors[i * 3 + 2] = col.b
  }
  geometry.setAttribute('color', new BufferAttribute(wingColors, 3))

  const material = new MeshBasicMaterial({
    color: 0xffffff,
    side: DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    vertexColors: true,
  })

  const mesh = new InstancedMesh(geometry, material, count)
  mesh.instanceMatrix.setUsage(DynamicDrawUsage)
  mesh.frustumCulled = false
  mesh.visible = false
  mesh.count = 0

  // Soft per-butterfly tint within the blue family (multiplies vertex gradient)
  const colors = new Float32Array(count * 3)
  const c = new Color()
  for (let i = 0; i < count; i++) {
    const hue = 0.55 + Math.random() * 0.08
    c.setHSL(hue, 0.7 + Math.random() * 0.2, 0.55 + Math.random() * 0.2)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  const colorAttr = new InstancedBufferAttribute(colors, 3)
  colorAttr.setUsage(DynamicDrawUsage)
  mesh.instanceColor = colorAttr

  const dummy = new Object3D()
  const quat = new Quaternion()
  const forward = new Vector3(0, 0, 1)
  const dir = new Vector3()
  const flat = new Vector3()
  const flapSpeed = 16

  const updateMatrices = (time: number) => {
    const { positions, velocities, phases } = sim.buffers
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const phase = phases[i]!
      const flap = Math.sin(time * flapSpeed + phase)

      dir.set(velocities[i3]!, velocities[i3 + 1]!, velocities[i3 + 2]!)
      flat.set(dir.x, 0, dir.z)
      if (flat.lengthSq() < 1e-6) flat.set(0, 0, 1)
      else flat.normalize()

      dummy.position.set(positions[i3]!, positions[i3 + 1]!, positions[i3 + 2]!)
      dummy.scale.set(0.75 + Math.abs(flap) * 0.55, 1, 1)
      quat.setFromUnitVectors(forward, flat)
      dummy.quaternion.copy(quat)
      dummy.rotateX(-0.35)
      dummy.rotateZ(flap * 0.4)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  return {
    roots: [mesh],
    get summoned() {
      return sim.summoned
    },
    summon(origin) {
      if (sim.summoned) return
      sim.summonAt(origin, 0.5, 3.5)
      mesh.count = count
      mesh.visible = true
      updateMatrices(0)
    },
    update(dt, forces) {
      if (!sim.summoned) return
      sim.step(dt, forces)
      updateMatrices(forces.time)
    },
    dispose() {
      geometry.dispose()
      material.dispose()
      mesh.dispose()
    },
  }
}

export const butterfliesEffect: ParticleEffect = {
  id: 'butterflies',
  name: 'Butterflies',
  maxCount: { webgpu: 80, fallback: 60 },
  gestureHints: [
    { pose: 'Open palm', description: 'Butterflies gather and hover at your hand' },
    { pose: 'Fist', description: 'Scatter into the air' },
    { pose: 'Pinch', description: 'Draw a small swarm to your fingertips' },
    { pose: 'Two-hand spread', description: 'Widen or tighten the flock' },
  ],
  create: createButterflies,
}
