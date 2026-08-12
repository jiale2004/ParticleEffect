import { useControls } from 'leva'
import { useEffect } from 'react'
import { useAppStore } from '../state/store'

/** Dev-only tuning knobs mirrored into the zustand store. */
export function DevLeva() {
  const patch = useAppStore((s) => s.patchSettings)
  const values = useControls('Particles', {
    particleCountScale: { value: 1, min: 0.35, max: 1.0, step: 0.05 },
    targetFps: { value: 45, min: 30, max: 60, step: 1 },
    bloomEnabled: false,
    showDebugHud: true,
    showLandmarks: false,
  })

  useEffect(() => {
    patch({
      particleCountScale: values.particleCountScale,
      targetFps: values.targetFps,
      bloomEnabled: values.bloomEnabled,
      showDebugHud: values.showDebugHud,
      showLandmarks: values.showLandmarks,
    })
  }, [values, patch])

  return null
}
