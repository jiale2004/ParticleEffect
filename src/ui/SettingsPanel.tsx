import { useAppStore } from '../state/store'

export function SettingsPanel() {
  const settings = useAppStore((s) => s.settings)
  const patch = useAppStore((s) => s.patchSettings)

  return (
    <div className="panel absolute bottom-4 right-4 z-20 w-56 rounded-xl p-4 text-sm">
      <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Settings</p>
      <label className="mb-3 flex items-center justify-between gap-2">
        <span>Count scale</span>
        <input
          type="range"
          min={0.35}
          max={1}
          step={0.05}
          value={settings.particleCountScale}
          onChange={(e) => patch({ particleCountScale: Number(e.target.value) })}
          className="w-24"
        />
      </label>
      <label className="mb-2 flex items-center justify-between gap-2">
        <span>Debug HUD</span>
        <input
          type="checkbox"
          checked={settings.showDebugHud}
          onChange={(e) => patch({ showDebugHud: e.target.checked })}
        />
      </label>
      <label className="mb-2 flex items-center justify-between gap-2">
        <span>Landmarks</span>
        <input
          type="checkbox"
          checked={settings.showLandmarks}
          onChange={(e) => patch({ showLandmarks: e.target.checked })}
        />
      </label>
      <label className="flex items-center justify-between gap-2">
        <span>Bloom</span>
        <input
          type="checkbox"
          checked={settings.bloomEnabled}
          onChange={(e) => patch({ bloomEnabled: e.target.checked })}
        />
      </label>
    </div>
  )
}
