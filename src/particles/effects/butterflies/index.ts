import {
  AdditiveBlending,
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
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three'
import type { EffectContext, EffectInstance, ParticleEffect } from '../../types'
import { CpuSimulator } from '../../fallback/CpuSimulator'

function createWingGeometry() {
  const shape = new Shape()
  shape.moveTo(0, 0.02)
  shape.bezierCurveTo(0.22, 0.42, 0.62, 0.36, 0.72, 0.04)
  shape.bezierCurveTo(0.76, -0.14, 0.4, -0.24, 0.16, -0.1)
  shape.bezierCurveTo(0.34, -0.46, 0.08, -0.54, 0, -0.2)
  shape.bezierCurveTo(-0.08, -0.54, -0.34, -0.46, -0.16, -0.1)
  shape.bezierCurveTo(-0.4, -0.24, -0.76, -0.14, -0.72, 0.04)
  shape.bezierCurveTo(-0.62, 0.36, -0.22, 0.42, 0, 0.02)

  const geometry = new ShapeGeometry(shape, 8)
  geometry.scale(0.78, 0.78, 0.78)

  const pos = geometry.attributes.position!
  const colors = new Float32Array(pos.count * 3)
  const navy = new Color('#031a4a')
  const cobalt = new Color('#1a6dff')
  const ice = new Color('#c4f2ff')

  for (let i = 0; i < pos.count; i++) {
    const x = Math.abs(pos.getX(i))
    const y = pos.getY(i)
    const t = Math.min(1, x / 0.5)
    const tip = Math.min(1, Math.max(0, (y + 0.35) / 0.55))
    const col = navy.clone().lerp(cobalt, t).lerp(ice, tip * 0.6)
    colors[i * 3] = col.r
    colors[i * 3 + 1] = col.g
    colors[i * 3 + 2] = col.b
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  return geometry
}

function createButterflies(ctx: EffectContext): EffectInstance {
  const count = Math.min(Math.max(ctx.count, 48), 110)

  const sim = new CpuSimulator(
    count,
    {
      attract: 11,
      repel: 15,
      pinch: 16,
      wind: 0.22,
      wander: 0.7,
      bob: 2.4,
      radius: 4.2,
      bounds: 7.2,
      damping: 0.935,
    },
    4,
  )

  const geometry = createWingGeometry()
  const material = new MeshBasicMaterial({
    color: 0xffffff,
    side: DoubleSide,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    vertexColors: true,
    blending: AdditiveBlending,
  })

  const mesh = new InstancedMesh(geometry, material, count)
  mesh.instanceMatrix.setUsage(DynamicDrawUsage)
  mesh.frustumCulled = false
  mesh.visible = false
  mesh.count = 0

  const tints = new Float32Array(count * 3)
  const c = new Color()
  for (let i = 0; i < count; i++) {
    c.setHSL(0.55 + Math.random() * 0.08, 0.78, 0.58 + Math.random() * 0.2)
    tints[i * 3] = c.r
    tints[i * 3 + 1] = c.g
    tints[i * 3 + 2] = c.b
  }
  mesh.instanceColor = new InstancedBufferAttribute(tints, 3)

  const glowGeo = new PlaneGeometry(1.15, 0.7)
  const glowMat = new MeshBasicMaterial({
    color: 0x4aa3ff,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  })
  const glow = new InstancedMesh(glowGeo, glowMat, count)
  glow.instanceMatrix.setUsage(DynamicDrawUsage)
  glow.frustumCulled = false
  glow.visible = false
  glow.count = 0

  const dummy = new Object3D()
  const glowDummy = new Object3D()
  const quat = new Quaternion()
  const forward = new Vector3(0, 0, 1)
  const dir = new Vector3()
  const flat = new Vector3()

  const updateMatrices = (time: number) => {
    const { positions, velocities, phases } = sim.buffers
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const phase = phases[i]!
      const flap = Math.sin(time * 13 + phase)

      dir.set(velocities[i3]!, velocities[i3 + 1]!, velocities[i3 + 2]!)
      flat.set(dir.x, 0, dir.z)
      if (flat.lengthSq() < 1e-6) flat.set(0, 0, 1)
      else flat.normalize()

      dummy.position.set(positions[i3]!, positions[i3 + 1]!, positions[i3 + 2]!)
      dummy.scale.set(0.85 + Math.abs(flap) * 0.5, 1.05, 1)
      quat.setFromUnitVectors(forward, flat)
      dummy.quaternion.copy(quat)
      dummy.rotateX(-0.38)
      dummy.rotateZ(flap * 0.45)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      glowDummy.position.copy(dummy.position)
      glowDummy.quaternion.copy(dummy.quaternion)
      glowDummy.scale.set(1.8 + Math.abs(flap) * 0.4, 1.5, 1)
      glowDummy.updateMatrix()
      glow.setMatrixAt(i, glowDummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    glow.instanceMatrix.needsUpdate = true
  }

  return {
    roots: [glow, mesh],
    get summoned() {
      return sim.summoned
    },
    summon(origin) {
      if (sim.summoned) return
      sim.summonAt(origin, 0.85, 6.2)
      mesh.count = count
      glow.count = count
      mesh.visible = true
      glow.visible = true
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
      glowGeo.dispose()
      glowMat.dispose()
      glow.dispose()
    },
  }
}

export const butterfliesEffect: ParticleEffect = {
  id: 'butterflies',
  name: 'Morpho',
  epithet: 'A cathedral of blue wings',
  accent: '#4aa3ff',
  maxCount: { webgpu: 110, fallback: 72 },
  gestureHints: [
    { pose: 'Open palm', description: 'A flock gathers around your hand' },
    { pose: 'Fist', description: 'They explode into the void' },
    { pose: 'Pinch', description: 'A few hang on your fingertips' },
  ],
  create: createButterflies,
}
