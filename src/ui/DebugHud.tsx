import { useEffect, useRef } from 'react'
import { handStateRef } from '../state/handState'
import { useAppStore } from '../state/store'
import { perfStats } from '../state/perfStats'

export function DebugHud() {
  const show = useAppStore((s) => s.settings.showDebugHud)
  const particleCount = useAppStore((s) => s.particleCount)
  const fpsRef = useRef<HTMLSpanElement>(null)
  const poseRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!show) return
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (fpsRef.current) fpsRef.current.textContent = String(perfStats.fps)
      const el = poseRef.current
      if (!el) return
      const { left, right } = handStateRef.current
      const hand = left.present ? left : right
      el.textContent = hand.present ? `${hand.pose}  ${hand.openness.toFixed(2)}` : 'waiting'
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [show])

  if (!show) return null

  return (
    <div className="glass absolute right-5 top-5 z-20 rounded-xl px-3 py-2 font-mono text-[11px] leading-5 text-[var(--muted)]">
      <div>
        fps <span ref={fpsRef} className="text-[var(--ink)]">60</span>
        <span className="mx-2 opacity-30">·</span>
        n <span className="text-[var(--ink)]">{particleCount}</span>
      </div>
      <div>
        pose <span ref={poseRef} className="text-[var(--ink)]">waiting</span>
      </div>
    </div>
  )
}
