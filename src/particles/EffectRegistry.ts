import type { ParticleEffect } from './types'
import { dustEffect } from './effects/dust'
import { butterfliesEffect } from './effects/butterflies'
import { neuronsEffect } from './effects/neurons'

const effects: ParticleEffect[] = [dustEffect, butterfliesEffect, neuronsEffect]

export const EffectRegistry = {
  list(): ParticleEffect[] {
    return effects
  },
  get(id: string): ParticleEffect | undefined {
    return effects.find((e) => e.id === id)
  },
  register(effect: ParticleEffect) {
    const idx = effects.findIndex((e) => e.id === effect.id)
    if (idx >= 0) effects[idx] = effect
    else effects.push(effect)
  },
}

export type { ParticleEffect, EffectInstance, EffectContext, GestureHint } from './types'
