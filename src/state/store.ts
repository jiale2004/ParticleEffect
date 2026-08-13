import { create } from 'zustand'

export type EffectId = 'butterflies' | 'neurons' | 'fireflies'
export type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied'
export type RendererBackend = 'webgpu' | 'webgl2'

export interface AppSettings {
  particleCountScale: number
  showDebugHud: boolean
  showLandmarks: boolean
  targetFps: number
}

interface AppState {
  selectedEffect: EffectId
  permission: PermissionStatus
  rendererBackend: RendererBackend
  webgpuAvailable: boolean
  usingCpuFallback: boolean
  particleCount: number
  fps: number
  awakened: boolean
  settings: AppSettings
  setSelectedEffect: (id: EffectId) => void
  setPermission: (status: PermissionStatus) => void
  setRendererInfo: (info: {
    backend: RendererBackend
    webgpuAvailable: boolean
    usingCpuFallback: boolean
  }) => void
  setParticleCount: (count: number) => void
  setFps: (fps: number) => void
  setAwakened: (awakened: boolean) => void
  patchSettings: (patch: Partial<AppSettings>) => void
}

export const DEFAULT_COUNTS: Record<EffectId, { webgpu: number; fallback: number }> = {
  butterflies: { webgpu: 110, fallback: 72 },
  neurons: { webgpu: 130, fallback: 88 },
  fireflies: { webgpu: 520, fallback: 360 },
}

function countFor(id: EffectId, usingCpuFallback: boolean, scale: number) {
  const caps = DEFAULT_COUNTS[id]
  const base = usingCpuFallback ? caps.fallback : caps.webgpu
  return Math.max(36, Math.floor(base * scale))
}

export const useAppStore = create<AppState>((set) => ({
  selectedEffect: 'butterflies',
  permission: 'idle',
  rendererBackend: 'webgl2',
  webgpuAvailable: typeof navigator !== 'undefined' && !!navigator.gpu,
  usingCpuFallback: true,
  particleCount: DEFAULT_COUNTS.butterflies.fallback,
  fps: 60,
  awakened: false,
  settings: {
    particleCountScale: 1,
    showDebugHud: false,
    showLandmarks: true,
    targetFps: 60,
  },
  setSelectedEffect: (id) =>
    set((s) => ({
      selectedEffect: id,
      particleCount: countFor(id, s.usingCpuFallback, s.settings.particleCountScale),
      awakened: false,
    })),
  setPermission: (permission) => set({ permission }),
  setRendererInfo: ({ backend, webgpuAvailable, usingCpuFallback }) =>
    set((s) => ({
      rendererBackend: backend,
      webgpuAvailable,
      usingCpuFallback,
      particleCount: countFor(s.selectedEffect, usingCpuFallback, s.settings.particleCountScale),
    })),
  setParticleCount: (particleCount) => set({ particleCount }),
  setFps: (fps) => set({ fps }),
  setAwakened: (awakened) => set({ awakened }),
  patchSettings: (patch) =>
    set((s) => {
      const settings = { ...s.settings, ...patch }
      return {
        settings,
        particleCount: countFor(s.selectedEffect, s.usingCpuFallback, settings.particleCountScale),
      }
    }),
}))
