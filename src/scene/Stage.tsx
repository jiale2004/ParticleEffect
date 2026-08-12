import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { useAppStore } from '../state/store'
import { ParticleLayer } from '../particles/ParticleLayer'
import { gestureEngine } from '../vision/GestureEngine'

/**
 * Prefer WebGL2 on macOS — WebGPU init + computeAsync often tanks FPS here.
 * Set VITE_FORCE_WEBGPU=1 to opt in later.
 */
async function createRenderer(props: ConstructorParameters<typeof THREE.WebGLRenderer>[0]) {
  const forceWebgpu = import.meta.env.VITE_FORCE_WEBGPU === '1'
  const webgpuAvailable = typeof navigator !== 'undefined' && !!navigator.gpu

  if (forceWebgpu && webgpuAvailable) {
    try {
      const { WebGPURenderer } = await import('three/webgpu')
      const renderer = new WebGPURenderer({
        ...(props as object),
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
      } as ConstructorParameters<typeof WebGPURenderer>[0])
      await renderer.init()
      renderer.toneMapping = THREE.NoToneMapping
      return {
        renderer,
        backend: 'webgpu' as const,
        webgpuAvailable: true,
        usingCpuFallback: false,
      }
    } catch (err) {
      console.warn('WebGPU init failed, falling back to WebGL2', err)
    }
  }

  const renderer = new THREE.WebGLRenderer({
    ...(props as object),
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  })
  renderer.toneMapping = THREE.NoToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x000000, 1)
  return {
    renderer,
    backend: 'webgl2' as const,
    webgpuAvailable,
    usingCpuFallback: true,
  }
}

function CameraBridge() {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    gestureEngine.setCamera(camera)
    return () => gestureEngine.setCamera(null)
  }, [camera])
  return null
}

function RendererReporter({
  info,
}: {
  info: {
    backend: 'webgpu' | 'webgl2'
    webgpuAvailable: boolean
    usingCpuFallback: boolean
  }
}) {
  const setRendererInfo = useAppStore((s) => s.setRendererInfo)
  useEffect(() => {
    setRendererInfo(info)
  }, [info, setRendererInfo])
  return null
}

function SceneLights() {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 2]} intensity={0.7} />
    </>
  )
}

export function Stage({ children }: { children?: ReactNode }) {
  const [rendererInfo, setLocalInfo] = useState<{
    backend: 'webgpu' | 'webgl2'
    webgpuAvailable: boolean
    usingCpuFallback: boolean
  } | null>(null)

  const permission = useAppStore((s) => s.permission)

  return (
    <div className="canvas-root">
      <Canvas
        camera={{ position: [0, 1.2, 6.5], fov: 50, near: 0.1, far: 40 }}
        dpr={1}
        flat
        frameloop={permission === 'granted' ? 'always' : 'demand'}
        performance={{ min: 0.5 }}
        gl={async (props) => {
          const result = await createRenderer(props)
          setLocalInfo({
            backend: result.backend,
            webgpuAvailable: result.webgpuAvailable,
            usingCpuFallback: result.usingCpuFallback,
          })
          return result.renderer
        }}
      >
        {rendererInfo && <RendererReporter info={rendererInfo} />}
        <CameraBridge />
        <SceneLights />
        {permission === 'granted' && <ParticleLayer />}
        {children}
      </Canvas>
    </div>
  )
}
