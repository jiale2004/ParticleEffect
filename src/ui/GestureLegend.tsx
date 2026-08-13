import { EffectRegistry } from '../particles/EffectRegistry'
import { useAppStore } from '../state/store'

export function GestureLegend() {
  const selected = useAppStore((s) => s.selectedEffect)
  const effect = EffectRegistry.get(selected)
  if (!effect) return null

  return (
    <div className="glass rise absolute bottom-5 left-5 z-20 max-w-[19rem] rounded-2xl p-6">
      <p className="kicker mb-2">{effect.name}</p>
      <p className="mb-5 text-2xl leading-snug" style={{ fontFamily: 'var(--serif)' }}>
        {effect.epithet}
      </p>
      <ul className="space-y-2 text-sm">
        {effect.gestureHints.map((hint) => (
          <li key={hint.pose} className="leading-snug">
            <span className="text-[var(--ink)]">{hint.pose}</span>
            <span className="text-[var(--muted)]"> — {hint.description}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
