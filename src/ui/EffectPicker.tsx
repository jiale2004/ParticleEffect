import { EffectRegistry } from '../particles/EffectRegistry'
import { useAppStore, type EffectId } from '../state/store'

export function EffectPicker() {
  const selected = useAppStore((s) => s.selectedEffect)
  const setSelected = useAppStore((s) => s.setSelectedEffect)
  const effects = EffectRegistry.list()

  return (
    <div className="glass rise absolute left-1/2 top-5 z-20 flex -translate-x-1/2 gap-1 rounded-full p-1.5">
      {effects.map((effect) => {
        const id = effect.id as EffectId
        const active = selected === id
        return (
          <button
            key={effect.id}
            type="button"
            onClick={() => setSelected(id)}
            className={`rounded-full px-4 py-2 text-sm transition ${
              active ? 'text-black' : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
            style={active ? { background: effect.accent } : undefined}
          >
            {effect.name}
          </button>
        )
      })}
    </div>
  )
}
