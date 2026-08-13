import { useAppStore } from '../state/store'
import { EffectRegistry } from '../particles/EffectRegistry'

export function AwaitHand() {
  const permission = useAppStore((s) => s.permission)
  const awakened = useAppStore((s) => s.awakened)
  const selected = useAppStore((s) => s.selectedEffect)
  const effect = EffectRegistry.get(selected)

  if (permission !== 'granted' || awakened) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center">
      <div className="text-center">
        <div className="breathe mx-auto mb-7 h-20 w-20 rounded-full border border-white/20 shadow-[0_0_60px_rgba(74,163,255,0.25)]" />
        <p className="kicker mb-4">The field is listening</p>
        <p
          className="text-[clamp(2rem,5vw,3.6rem)] leading-none"
          style={{ fontFamily: 'var(--serif)' }}
        >
          Show your hand
        </p>
        <p className="mt-4 text-sm tracking-wide text-[var(--muted)]">
          {effect?.epithet ?? 'The void is waiting'}
        </p>
      </div>
    </div>
  )
}
