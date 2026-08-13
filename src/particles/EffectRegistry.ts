import type { ParticleEffect } from './types'
import { butterfliesEffect } from './effects/butterflies'
import { neuronsEffect } from './effects/neurons'
import { firefliesEffect } from './effects/fireflies'

const effects: ParticleEffect[] = [butterfliesEffect, neuronsEffect, firefliesEffect]

export const EffectRegistry = {
  list(): ParticleEffect[] {
    return effects
  },
  get(id: string): ParticleEffect | undefined {
    return effects.find((e) => e.id === id)
  },
}

export type { ParticleEffect, EffectInstance, EffectContext, GestureHint } from './types'
