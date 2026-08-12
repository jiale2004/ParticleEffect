import { EffectRegistry } from '../particles/EffectRegistry'
import { useAppStore } from '../state/store'

export function GestureLegend() {
  const selected = useAppStore((s) => s.selectedEffect)
  const effect = EffectRegistry.get(selected)
  if (!effect) return null

  return (
    <div className="panel absolute bottom-4 left-4 z-20 max-w-xs rounded-xl p-4">
      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Gestures</p>
      <ul className="space-y-2 text-sm">
        {effect.gestureHints.map((hint) => (
          <li key={hint.pose}>
            <span className="font-medium text-[var(--accent)]">{hint.pose}</span>
            <span className="text-[var(--muted)]"> — {hint.description}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
        Privacy: all camera frames stay on-device. No video is uploaded.
      </p>
    </div>
  )
}
