import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PostProcessing } from 'three/webgpu'
import { pass } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { useAppStore } from '../state/store'

/**
 * TSL bloom display node — WebGPU path only.
 * Uses a positive-priority useFrame so R3F yields rendering to this pass.
 */
export function BloomPass() {
  const { gl, scene, camera } = useThree()
  const ppRef = useRef<PostProcessing | null>(null)
  const enabled = useAppStore((s) => s.settings.bloomEnabled)

  useEffect(() => {
    if (!('computeAsync' in gl) || !enabled) {
      ppRef.current = null
      return
    }

    try {
      const pp = new PostProcessing(gl as never)
      const scenePass = pass(scene, camera)
      const sceneColor = scenePass.getTextureNode('output')
      const bloomPass = bloom(sceneColor, 0.35, 0.45, 0.18)
      pp.outputNode = sceneColor.add(bloomPass)
      ppRef.current = pp
    } catch (err) {
      console.warn('Bloom init failed', err)
      ppRef.current = null
    }

    return () => {
      ppRef.current = null
    }
  }, [gl, scene, camera, enabled])

  useFrame(() => {
    if (ppRef.current) {
      ppRef.current.render()
    } else {
      gl.render(scene, camera)
    }
  }, 1)

  return null
}
