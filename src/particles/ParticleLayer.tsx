import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectRegistry } from './EffectRegistry'
import type { EffectInstance } from './types'
import {
  handForcesFromState,
  handStateRef,
  type HandForceUniforms,
} from '../state/handState'
import { useAppStore } from '../state/store'
import { perfStats } from '../state/perfStats'

export function ParticleLayer() {
  const groupRef = useRef<THREE.Group>(null)
  const instanceRef = useRef<EffectInstance | null>(null)
  const forcesRef = useRef<HandForceUniforms>(
    handForcesFromState(handStateRef.current, 0, 1 / 60),
  )
  const timeRef = useRef(0)
  const fpsAccum = useRef({ frames: 0, time: 0 })
  const { gl } = useThree()

  const selectedEffect = useAppStore((s) => s.selectedEffect)
  const particleCount = useAppStore((s) => s.particleCount)
  const usingCpuFallback = useAppStore((s) => s.usingCpuFallback)

  const effectKey = useMemo(
    () => `${selectedEffect}:${usingCpuFallback ? 'cpu' : 'gpu'}`,
    [selectedEffect, usingCpuFallback],
  )

  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    instanceRef.current?.dispose()
    for (const child of [...group.children]) {
      group.remove(child)
    }
    instanceRef.current = null

    const effect = EffectRegistry.get(selectedEffect)
    if (!effect) return

    const webgpu = !usingCpuFallback && 'computeAsync' in gl
    const caps = webgpu ? effect.maxCount.webgpu : effect.maxCount.fallback
    const count = Math.min(particleCount, caps)
    const instance = effect.create({
      count,
      webgpu: false, // force CPU sims — stable 60 FPS on Mac
      renderer: null,
      forces: forcesRef.current,
    })
    instanceRef.current = instance
    group.visible = false
    for (const root of instance.roots) {
      root.visible = false
      group.add(root)
    }

    return () => {
      instance.dispose()
      for (const root of instance.roots) group.remove(root)
      if (instanceRef.current === instance) instanceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectKey, selectedEffect, usingCpuFallback, gl])

  useFrame((_, dt) => {
    const safeDt = Math.min(0.033, Math.max(0, dt))
    timeRef.current += safeDt
    const state = handStateRef.current
    const forces = handForcesFromState(state, timeRef.current, safeDt)
    forcesRef.current = forces

    const present = state.left.present || state.right.present
    const instance = instanceRef.current
    const group = groupRef.current

    if (instance && present && !instance.summoned) {
      const origin = state.left.present ? state.left.palm : state.right.palm
      instance.summon(origin)
      if (group) group.visible = true
      for (const root of instance.roots) root.visible = true
    }

    if (instance?.summoned) {
      instance.update(safeDt, forces)
    }

    const acc = fpsAccum.current
    acc.frames += 1
    acc.time += safeDt
    if (acc.time >= 0.5) {
      perfStats.fps = Math.round(acc.frames / acc.time)
      perfStats.frameMs = (acc.time / acc.frames) * 1000
      acc.frames = 0
      acc.time = 0
    }
  })

  return <group ref={groupRef} />
}
