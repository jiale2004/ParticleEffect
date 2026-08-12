/**
 * TSL compute harness for the dust effect (WebGPU-only).
 * Mirrors the CPU force model in forces.ts at a reduced feature set.
 */
import {
  Fn,
  float,
  vec3,
  instanceIndex,
  instancedArray,
  uniform,
  sin,
  cos,
  time as tslTime,
  If,
} from 'three/tsl'
import type { HandForceUniforms } from '../state/handState'

export function createDustCompute(count: number) {
  const positionArray = instancedArray(count, 'vec3')
  const velocityArray = instancedArray(count, 'vec3')

  const uDt = uniform(1 / 60)
  const uLeftPalm = uniform(vec3(0, 0, 0))
  const uRightPalm = uniform(vec3(0, 0, 0))
  const uLeftPresent = uniform(0)
  const uRightPresent = uniform(0)
  const uLeftOpen = uniform(0)
  const uRightOpen = uniform(0)
  const uLeftFist = uniform(0)
  const uRightFist = uniform(0)
  const uSpread = uniform(1)

  const init = Fn(() => {
    positionArray.element(instanceIndex).assign(vec3(0, 0, 0))
    velocityArray.element(instanceIndex).assign(vec3(0, 0, 0))
  })().compute(count)

  const update = Fn(() => {
    const pos = positionArray.element(instanceIndex)
    const vel = velocityArray.element(instanceIndex)
    const t = tslTime
    const i = float(instanceIndex)

    // First frames after summon: burst outward from palm using seed from index
    const seed = i.mul(0.13)
    const burstDir = vec3(sin(seed), cos(seed.mul(1.7)), sin(seed.mul(2.3)))
    const nearZero = pos.length().lessThan(0.02)
    // If still at origin and a hand is present, kick outward from left palm
    If(nearZero, () => {
      pos.assign(uLeftPalm.add(burstDir.mul(0.15)))
      vel.assign(burstDir.mul(4.5))
    })

    const n = vec3(
      sin(pos.y.mul(0.5).add(t.mul(0.4))).sub(sin(pos.z.mul(0.55).add(t.mul(0.25)))),
      sin(pos.z.mul(0.5).add(t.mul(0.35))).sub(sin(pos.x.mul(0.45).add(t.mul(0.3)))),
      sin(pos.x.mul(0.5).add(t.mul(0.3))).sub(sin(pos.y.mul(0.5).add(t.mul(0.2)))),
    )
    vel.addAssign(n.mul(0.35).mul(uDt))

    // Left attract / repel
    const ld = uLeftPalm.sub(pos)
    const llen = ld.length().max(0.001)
    const lfall = float(1).sub(llen.div(2.5)).max(0)
    const lstr = uLeftOpen.mul(4.5).mul(uLeftPresent).add(uLeftFist.mul(-7).mul(uLeftPresent))
    vel.addAssign(ld.div(llen).mul(lstr).mul(lfall).mul(lfall))

    // Right attract / repel
    const rd = uRightPalm.sub(pos)
    const rlen = rd.length().max(0.001)
    const rfall = float(1).sub(rlen.div(2.5)).max(0)
    const rstr = uRightOpen.mul(4.5).mul(uRightPresent).add(uRightFist.mul(-7).mul(uRightPresent))
    vel.addAssign(rd.div(rlen).mul(rstr).mul(rfall).mul(rfall))

    vel.addAssign(pos.mul(uSpread.sub(1).mul(0.02)))
    vel.mulAssign(0.965)
    pos.addAssign(vel.mul(uDt))
  })().compute(count)

  return {
    positionArray,
    velocityArray,
    init,
    update,
    writeUniforms(forces: HandForceUniforms, dt: number) {
      uDt.value = dt
      ;(uLeftPalm.value as unknown as { set: (x: number, y: number, z: number) => void }).set(
        forces.leftPalm[0],
        forces.leftPalm[1],
        forces.leftPalm[2],
      )
      ;(uRightPalm.value as unknown as { set: (x: number, y: number, z: number) => void }).set(
        forces.rightPalm[0],
        forces.rightPalm[1],
        forces.rightPalm[2],
      )
      uLeftPresent.value = forces.leftPresent
      uRightPresent.value = forces.rightPresent
      uLeftOpen.value = forces.leftOpenness
      uRightOpen.value = forces.rightOpenness
      uLeftFist.value = forces.leftFist
      uRightFist.value = forces.rightFist
      uSpread.value = forces.spread || 1
    },
  }
}

export type DustComputeHarness = ReturnType<typeof createDustCompute>
