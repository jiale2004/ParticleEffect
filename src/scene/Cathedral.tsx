import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { handStateRef } from '../state/handState'
import { useAppStore, type EffectId } from '../state/store'

function makeRadialTexture(inner: string, mid: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, inner)
  g.addColorStop(0.38, mid)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

const ACCENT: Record<EffectId, string> = {
  butterflies: '#4aa3ff',
  neurons: '#7cf0c2',
  fireflies: '#ffc14a',
}

function Starfield() {
  const points = useMemo(() => {
    const count = 220
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 8 + Math.random() * 18
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7
      positions[i * 3 + 2] = r * Math.cos(phi) - 4
      const b = 0.45 + Math.random() * 0.55
      colors[i * 3] = b * 0.75
      colors[i * 3 + 1] = b * 0.85
      colors[i * 3 + 2] = b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [])

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    [],
  )

  const ref = useRef<THREE.Points>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.012
  })

  return <points ref={ref} geometry={points} material={mat} frustumCulled={false} />
}

function Nebula() {
  const tex = useMemo(() => makeRadialTexture('rgba(40,90,200,0.55)', 'rgba(20,40,120,0.18)'), [])
  const a = useRef<THREE.Sprite>(null)
  const b = useRef<THREE.Sprite>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (a.current) {
      a.current.position.x = Math.sin(t * 0.07) * 1.4
      a.current.material.opacity = 0.22 + Math.sin(t * 0.3) * 0.05
    }
    if (b.current) {
      b.current.position.x = Math.cos(t * 0.05) * -1.8
      b.current.material.opacity = 0.16 + Math.cos(t * 0.22) * 0.04
    }
  })

  return (
    <group>
      <sprite ref={a} position={[0, 0.4, -8]} scale={[14, 8, 1]}>
        <spriteMaterial
          map={tex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#4aa3ff"
          opacity={0.22}
        />
      </sprite>
      <sprite ref={b} position={[-1.5, -0.8, -10]} scale={[16, 10, 1]}>
        <spriteMaterial
          map={tex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#7b5cff"
          opacity={0.16}
        />
      </sprite>
    </group>
  )
}

function PalmCorona() {
  const sprite = useRef<THREE.Sprite>(null)
  const selected = useAppStore((s) => s.selectedEffect)
  const tex = useMemo(() => makeRadialTexture('rgba(255,255,255,0.95)', 'rgba(255,255,255,0.2)'), [])

  useFrame(() => {
    const s = sprite.current
    if (!s) return
    const { left, right } = handStateRef.current
    const hand = left.present ? left : right
    if (!hand.present) {
      s.visible = false
      return
    }
    s.visible = true
    s.position.set(hand.palm[0], hand.palm[1], hand.palm[2])
    const poseBoost = hand.pose === 'fist' ? 1.6 : hand.pose === 'pinch' ? 0.7 : 1.15
    const scale = 1.4 + hand.openness * 2.2 * poseBoost
    s.scale.set(scale, scale, 1)
    const hex = ACCENT[selected]
    ;(s.material as THREE.SpriteMaterial).color.set(hex)
    ;(s.material as THREE.SpriteMaterial).opacity = 0.22 + hand.openness * 0.18
  })

  return (
    <sprite ref={sprite} visible={false}>
      <spriteMaterial
        map={tex}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={ACCENT[selected]}
        opacity={0.28}
      />
    </sprite>
  )
}

/** Cheap cathedral: starfield, nebula wash, and a palm-born corona. */
export function Cathedral() {
  return (
    <group>
      <Starfield />
      <Nebula />
      <PalmCorona />
    </group>
  )
}
