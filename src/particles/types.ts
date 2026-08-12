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
  /** Shared hand force snapshot mutated each frame by the runtime */
  forces: HandForceUniforms
}

export interface EffectInstance {
  /** Called every frame before draw; may run compute or CPU step */
  update(dt: number, forces: HandForceUniforms): void
  /** Burst particles into existence at a world-space origin (palm) */
  summon(origin: [number, number, number]): void
  /** Whether particles have been summoned yet */
  readonly summoned: boolean
  /** Dispose GPU/CPU resources */
  dispose(): void
  /** Optional Three.js object roots to add to the scene */
  roots: import('three').Object3D[]
}

export interface ParticleEffect {
  id: string
  name: string
  maxCount: { webgpu: number; fallback: number }
  gestureHints: GestureHint[]
  create(ctx: EffectContext): EffectInstance
}
