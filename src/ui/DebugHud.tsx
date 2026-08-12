import { useEffect, useRef } from 'react'
import { handStateRef } from '../state/handState'
import { useAppStore } from '../state/store'
import { perfStats } from '../state/perfStats'

export function DebugHud() {
  const show = useAppStore((s) => s.settings.showDebugHud)
  const backend = useAppStore((s) => s.rendererBackend)
  const usingCpuFallback = useAppStore((s) => s.usingCpuFallback)
  const particleCount = useAppStore((s) => s.particleCount)
  const fpsRef = useRef<HTMLSpanElement>(null)
  const handRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show) return
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (fpsRef.current) fpsRef.current.textContent = String(perfStats.fps)
      const el = handRef.current
      if (!el) return
      const { left, right, twoHand } = handStateRef.current
      el.textContent = [
        `L ${left.present ? left.pose : '—'} open=${left.openness.toFixed(2)} pinch=${left.pinch.toFixed(2)}`,
        `R ${right.present ? right.pose : '—'} open=${right.openness.toFixed(2)} pinch=${right.pinch.toFixed(2)}`,
        `spread ${twoHand.active ? twoHand.spread.toFixed(2) : '—'}`,
      ].join('\n')
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [show])

  if (!show) return null

  return (
    <div className="panel absolute right-4 top-4 z-20 rounded-xl p-3 font-mono text-[11px] leading-5 text-[var(--muted)]">
      <div>
        FPS <span ref={fpsRef} className="text-white">
          60
        </span>
      </div>
      <div>
        Renderer <span className="text-white">{backend}</span>
      </div>
      <div>
        Sim <span className="text-white">{usingCpuFallback ? 'CPU' : 'GPU'}</span>
      </div>
      <div>
        Particles <span className="text-white">{particleCount}</span>
      </div>
      <div ref={handRef} className="mt-2 whitespace-pre text-[10px] text-[var(--accent-2)]" />
    </div>
  )
}
