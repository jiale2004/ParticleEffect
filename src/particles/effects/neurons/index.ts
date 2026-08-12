import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  LineBasicMaterial,
  LineSegments,
  Points,
  PointsMaterial,
} from 'three'
import type { EffectContext, EffectInstance, ParticleEffect } from '../../types'
import { CpuSimulator } from '../../fallback/CpuSimulator'
import type { HandForceUniforms } from '../../../state/handState'

function buildEdges(positions: Float32Array, count: number, maxDist: number, maxEdges: number) {
  const edges: number[] = []
  const maxDist2 = maxDist * maxDist
  const window = Math.min(24, count)
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const ix = positions[i3]!
    const iy = positions[i3 + 1]!
    const iz = positions[i3 + 2]!
    let linked = 0
    const jMax = Math.min(count, i + 1 + window)
    for (let j = i + 1; j < jMax && linked < 2; j++) {
      const j3 = j * 3
      const dx = ix - positions[j3]!
      const dy = iy - positions[j3 + 1]!
      const dz = iz - positions[j3 + 2]!
      if (dx * dx + dy * dy + dz * dz < maxDist2) {
        edges.push(i, j)
        linked++
        if (edges.length / 2 >= maxEdges) return edges
      }
    }
  }
  return edges
}

function createNeurons(ctx: EffectContext): EffectInstance {
  const count = Math.min(ctx.count, 120)

  const sim = new CpuSimulator(
    count,
    {
      attract: 3.2,
      repel: 5.5,
      pinch: 7,
      wind: 0.05,
      wander: 0.15,
      radius: 2.5,
      bounds: 4.2,
      damping: 0.97,
    },
    3.2,
  )

  const c = new Color()
  for (let i = 0; i < count; i++) {
    c.setHSL(0.55 + Math.random() * 0.15, 0.8, 0.55 + Math.random() * 0.25)
    sim.buffers.colors[i * 3] = c.r
    sim.buffers.colors[i * 3 + 1] = c.g
    sim.buffers.colors[i * 3 + 2] = c.b
  }

  const nodeGeo = new BufferGeometry()
  nodeGeo.setAttribute('position', new BufferAttribute(sim.buffers.positions, 3))
  nodeGeo.setAttribute('color', new BufferAttribute(sim.buffers.colors, 3))

  const nodeMat = new PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const nodes = new Points(nodeGeo, nodeMat)
  nodes.frustumCulled = false
  nodes.visible = false

  let edgeList: number[] = []
  let edgeCount = 0
  const maxEdgeSlots = Math.floor(count * 2)
  const linePositions = new Float32Array(maxEdgeSlots * 2 * 3)
  const lineColors = new Float32Array(maxEdgeSlots * 2 * 3)
  const phases = new Float32Array(maxEdgeSlots)

  const lineGeo = new BufferGeometry()
  lineGeo.setAttribute(
    'position',
    new BufferAttribute(linePositions, 3).setUsage(DynamicDrawUsage),
  )
  lineGeo.setAttribute(
    'color',
    new BufferAttribute(lineColors, 3).setUsage(DynamicDrawUsage),
  )
  lineGeo.setDrawRange(0, 0)

  const lineMat = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const lines = new LineSegments(lineGeo, lineMat)
  lines.frustumCulled = false
  lines.visible = false

  const pulseColor = new Color(0xa5f3fc)
  const baseColor = new Color(0x1e3a5f)
  let frame = 0

  const rebuildEdges = () => {
    edgeList = buildEdges(sim.buffers.positions, count, 1.35, maxEdgeSlots)
    edgeCount = edgeList.length / 2
    for (let e = 0; e < edgeCount; e++) phases[e] = Math.random()
    lineGeo.setDrawRange(0, edgeCount * 2)
  }

  const updateEdges = (time: number, forces: HandForceUniforms) => {
    const pos = sim.buffers.positions
    let ex = 0
    let ey = 0
    let ez = 0
    let excited = false
    if (forces.leftPresent) {
      ex = forces.leftPalm[0]
      ey = forces.leftPalm[1]
      ez = forces.leftPalm[2]
      excited = true
    } else if (forces.rightPresent) {
      ex = forces.rightPalm[0]
      ey = forces.rightPalm[1]
      ez = forces.rightPalm[2]
      excited = true
    }

    for (let e = 0; e < edgeCount; e++) {
      const a = edgeList[e * 2]!
      const b = edgeList[e * 2 + 1]!
      const a3 = a * 3
      const b3 = b * 3
      const ax = pos[a3]!
      const ay = pos[a3 + 1]!
      const az = pos[a3 + 2]!
      const bx = pos[b3]!
      const by = pos[b3 + 1]!
      const bz = pos[b3 + 2]!

      const o = e * 6
      linePositions[o] = ax
      linePositions[o + 1] = ay
      linePositions[o + 2] = az
      linePositions[o + 3] = bx
      linePositions[o + 4] = by
      linePositions[o + 5] = bz

      const len = Math.hypot(ax - bx, ay - by, az - bz)
      const fade = Math.max(0, 1 - len / 1.8)
      const pulse = (Math.sin(time * 3.5 + phases[e]! * Math.PI * 2) * 0.5 + 0.5) * fade

      let exciteBoost = 0
      if (excited) {
        const d = Math.min(
          Math.hypot(ax - ex, ay - ey, az - ez),
          Math.hypot(bx - ex, by - ey, bz - ez),
        )
        exciteBoost = Math.max(0, 1 - d / 2.2) * 0.8
      }

      const intensity = Math.min(1, fade * 0.45 + pulse * 0.55 + exciteBoost)
      c.copy(baseColor).lerp(pulseColor, intensity)
      lineColors[o] = c.r
      lineColors[o + 1] = c.g
      lineColors[o + 2] = c.b
      lineColors[o + 3] = c.r
      lineColors[o + 4] = c.g
      lineColors[o + 5] = c.b
    }

    ;(lineGeo.getAttribute('position') as BufferAttribute).needsUpdate = true
    ;(lineGeo.getAttribute('color') as BufferAttribute).needsUpdate = true
  }

  return {
    roots: [nodes, lines],
    get summoned() {
      return sim.summoned
    },
    summon(origin) {
      if (sim.summoned) return
      sim.summonAt(origin, 0.5, 3)
      rebuildEdges()
      nodes.visible = true
      lines.visible = true
      ;(nodeGeo.getAttribute('position') as BufferAttribute).needsUpdate = true
      updateEdges(0, ctx.forces)
    },
    update(dt, forces) {
      if (!sim.summoned) return
      sim.step(dt, forces)
      ;(nodeGeo.getAttribute('position') as BufferAttribute).needsUpdate = true
      frame += 1
      if ((frame & 1) === 0) updateEdges(forces.time, forces)
    },
    dispose() {
      nodeGeo.dispose()
      nodeMat.dispose()
      lineGeo.dispose()
      lineMat.dispose()
    },
  }
}

export const neuronsEffect: ParticleEffect = {
  id: 'neurons',
  name: 'Neurons',
  maxCount: { webgpu: 120, fallback: 80 },
  gestureHints: [
    { pose: 'Open palm', description: 'Excite nearby neurons; pulses radiate outward' },
    { pose: 'Fist', description: 'Disrupt local clusters' },
    { pose: 'Pinch', description: 'Focus excitation at your fingertips' },
    { pose: 'Two-hand spread', description: 'Stretch or compress the network' },
  ],
  create: createNeurons,
}
