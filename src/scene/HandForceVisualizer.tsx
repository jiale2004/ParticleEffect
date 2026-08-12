import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { handStateRef, type HandPose } from '../state/handState'

function poseColor(pose: HandPose, openness: number, pinch: number): string {
  if (pose === 'fist') return '#fb7185' // repel
  if (pose === 'pinch' || pinch > 0.55) return '#fbbf24' // grab
  if (pose === 'open' || openness > 0.55) return '#5eead4' // attract
  return '#94a3b8'
}

function HandGizmo({
  side,
}: {
  side: 'left' | 'right'
}) {
  const group = useRef<THREE.Group>(null)
  const palm = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const tip = useRef<THREE.Mesh>(null)
  const beam = useRef<THREE.Mesh>(null)

  const mats = useMemo(
    () => ({
      palm: new THREE.MeshBasicMaterial({
        color: '#5eead4',
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
      ring: new THREE.MeshBasicMaterial({
        color: '#5eead4',
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      tip: new THREE.MeshBasicMaterial({
        color: '#fbbf24',
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
      beam: new THREE.MeshBasicMaterial({
        color: '#7dd3fc',
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    }),
    [],
  )

  useFrame(() => {
    const hand = handStateRef.current[side]
    const g = group.current
    if (!g) return

    if (!hand.present) {
      g.visible = false
      return
    }
    g.visible = true

    const color = poseColor(hand.pose, hand.openness, hand.pinch)
    mats.palm.color.set(color)
    mats.ring.color.set(color)
    mats.beam.color.set(color)

    if (palm.current) {
      palm.current.position.set(hand.palm[0], hand.palm[1], hand.palm[2])
      const s = 0.12 + hand.openness * 0.1
      palm.current.scale.setScalar(s)
    }

    if (ring.current) {
      ring.current.position.set(hand.palm[0], hand.palm[1], hand.palm[2])
      // Force radius visualization (~2.5–3.2 world units falloff)
      const radius = hand.pose === 'fist' ? 3.0 : hand.pinch > 0.5 ? 1.6 : 2.6
      ring.current.scale.set(radius, radius, radius)
      mats.ring.opacity = 0.18 + hand.openness * 0.2 + hand.pinch * 0.15
    }

    if (tip.current) {
      tip.current.visible = hand.pinch > 0.35 || hand.pose === 'pinch'
      tip.current.position.set(hand.indexTip[0], hand.indexTip[1], hand.indexTip[2])
    }

    if (beam.current && tip.current?.visible) {
      beam.current.visible = true
      const ax = hand.palm[0]
      const ay = hand.palm[1]
      const az = hand.palm[2]
      const bx = hand.indexTip[0]
      const by = hand.indexTip[1]
      const bz = hand.indexTip[2]
      const mx = (ax + bx) * 0.5
      const my = (ay + by) * 0.5
      const mz = (az + bz) * 0.5
      const len = Math.hypot(bx - ax, by - ay, bz - az) || 0.01
      beam.current.position.set(mx, my, mz)
      beam.current.scale.set(0.02, len, 0.02)
      beam.current.lookAt(bx, by, bz)
      beam.current.rotateX(Math.PI / 2)
    } else if (beam.current) {
      beam.current.visible = false
    }
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={palm} material={mats.palm}>
        <sphereGeometry args={[1, 16, 16]} />
      </mesh>
      <mesh ref={ring} material={mats.ring} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 1, 48]} />
      </mesh>
      <mesh ref={tip} material={mats.tip} visible={false}>
        <sphereGeometry args={[0.06, 12, 12]} />
      </mesh>
      <mesh ref={beam} material={mats.beam} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
      </mesh>
    </group>
  )
}

/** World-space palm / force-field / pinch tip so hand → particle control is visible. */
export function HandForceVisualizer() {
  return (
    <group>
      <HandGizmo side="left" />
      <HandGizmo side="right" />
    </group>
  )
}
