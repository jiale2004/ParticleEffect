import type { WebGPURenderer } from 'three/webgpu'
import type { HandForceUniforms } from '../state/handState'

export interface GestureHint {
  pose: string
  description: string
}

export interface EffectContext {
  count: number
  webgpu: boolean
  renderer: WebGPURenderer | null
  forces: HandForceUniforms
}

export interface EffectInstance {
  update(dt: number, forces: HandForceUniforms): void
  summon(origin: [number, number, number]): void
  readonly summoned: boolean
  dispose(): void
  roots: import('three').Object3D[]
}

export interface ParticleEffect {
  id: string
  name: string
  epithet: string
  accent: string
  maxCount: { webgpu: number; fallback: number }
  gestureHints: GestureHint[]
  create(ctx: EffectContext): EffectInstance
}
