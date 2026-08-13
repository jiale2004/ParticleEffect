import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { useAppStore } from '../state/store'
import { ParticleLayer } from '../particles/ParticleLayer'
import { gestureEngine } from '../vision/GestureEngine'
import { Cathedral } from './Cathedral'

async function createRenderer(props: ConstructorParameters<typeof THREE.WebGLRenderer>[0]) {
  const webgpuAvailable = typeof navigator !== 'undefined' && !!navigator.gpu
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
        camera={{ position: [0, 0.15, 7.4], fov: 56, near: 0.1, far: 60 }}
        dpr={1}
        flat
        frameloop={permission === 'granted' ? 'always' : 'demand'}
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
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 10, 28]} />
        <ambientLight intensity={0.85} />
        <Cathedral />
        {permission === 'granted' && <ParticleLayer />}
        {children}
      </Canvas>
    </div>
  )
}
