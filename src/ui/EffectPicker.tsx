import { EffectRegistry } from '../particles/EffectRegistry'
import { useAppStore, type EffectId } from '../state/store'

export function EffectPicker() {
  const selected = useAppStore((s) => s.selectedEffect)
  const setSelected = useAppStore((s) => s.setSelectedEffect)
  const effects = EffectRegistry.list()

  return (
    <div className="panel absolute left-4 top-4 z-20 flex gap-2 rounded-xl p-2">
      {effects.map((effect) => {
        const id = effect.id as EffectId
        const active = selected === id
        return (
          <button
            key={effect.id}
            type="button"
            onClick={() => setSelected(id)}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              active
                ? 'bg-white/15 text-white'
                : 'text-[var(--muted)] hover:bg-white/5 hover:text-white'
            }`}
          >
            {effect.name}
          </button>
        )
      })}
    </div>
  )
}
