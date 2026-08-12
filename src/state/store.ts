import { create } from 'zustand'

export type EffectId = 'dust' | 'butterflies' | 'neurons'
export type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied'
export type RendererBackend = 'webgpu' | 'webgl2'

export interface AppSettings {
  particleCountScale: number
  showDebugHud: boolean
  showLandmarks: boolean
  bloomEnabled: boolean
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
  patchSettings: (patch: Partial<AppSettings>) => void
}

/** Tuned for ~60 FPS on macOS integrated GPUs. */
export const DEFAULT_COUNTS: Record<EffectId, { webgpu: number; fallback: number }> = {
  dust: { webgpu: 800, fallback: 400 },
  butterflies: { webgpu: 80, fallback: 60 },
  neurons: { webgpu: 120, fallback: 80 },
}

function countFor(
  id: EffectId,
  usingCpuFallback: boolean,
  scale: number,
) {
  const caps = DEFAULT_COUNTS[id]
  const base = usingCpuFallback ? caps.fallback : caps.webgpu
  return Math.max(40, Math.floor(base * scale))
}

export const useAppStore = create<AppState>((set) => ({
  selectedEffect: 'dust',
  permission: 'idle',
  rendererBackend: 'webgl2',
  webgpuAvailable: typeof navigator !== 'undefined' && !!navigator.gpu,
  usingCpuFallback: true,
  particleCount: DEFAULT_COUNTS.dust.fallback,
  fps: 60,
  settings: {
    particleCountScale: 1,
    showDebugHud: true,
    showLandmarks: true,
    bloomEnabled: false,
    targetFps: 60,
  },
  setSelectedEffect: (id) =>
    set((s) => ({
      selectedEffect: id,
      particleCount: countFor(id, s.usingCpuFallback, s.settings.particleCountScale),
    })),
  setPermission: (permission) => set({ permission }),
  setRendererInfo: ({ backend, webgpuAvailable, usingCpuFallback }) =>
    set((s) => ({
      rendererBackend: backend,
      webgpuAvailable,
      usingCpuFallback,
      particleCount: countFor(
        s.selectedEffect,
        usingCpuFallback,
        s.settings.particleCountScale,
      ),
    })),
  setParticleCount: (particleCount) => set({ particleCount }),
  setFps: (fps) => set({ fps }),
  patchSettings: (patch) =>
    set((s) => {
      const settings = { ...s.settings, ...patch }
      return {
        settings,
        particleCount: countFor(
          s.selectedEffect,
          s.usingCpuFallback,
          settings.particleCountScale,
        ),
      }
    }),
}))
