import { useAppStore } from '../state/store'

export function SettingsPanel() {
  const settings = useAppStore((s) => s.settings)
  const patch = useAppStore((s) => s.patchSettings)

  return (
    <div className="glass rise absolute bottom-5 right-5 z-20 w-52 rounded-2xl p-4 text-sm">
      <p className="kicker mb-3">Room</p>
      <label className="mb-3 flex items-center justify-between gap-2 text-[var(--muted)]">
        <span>Density</span>
        <input
          type="range"
          min={0.4}
          max={1}
          step={0.05}
          value={settings.particleCountScale}
          onChange={(e) => patch({ particleCountScale: Number(e.target.value) })}
          className="w-24 accent-white"
        />
      </label>
      <label className="mb-2 flex items-center justify-between gap-2 text-[var(--muted)]">
        <span>Skeleton</span>
        <input
          type="checkbox"
          checked={settings.showLandmarks}
          onChange={(e) => patch({ showLandmarks: e.target.checked })}
        />
      </label>
      <label className="flex items-center justify-between gap-2 text-[var(--muted)]">
        <span>Telemetry</span>
        <input
          type="checkbox"
          checked={settings.showDebugHud}
          onChange={(e) => patch({ showDebugHud: e.target.checked })}
        />
      </label>
    </div>
  )
}
