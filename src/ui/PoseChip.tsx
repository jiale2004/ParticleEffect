import { useEffect, useRef } from 'react'
import { handStateRef } from '../state/handState'
import { useAppStore } from '../state/store'

const LABELS: Record<string, string> = {
  open: 'open',
  fist: 'fist',
  pinch: 'pinch',
  unknown: '…',
}

export function PoseChip() {
  const permission = useAppStore((s) => s.permission)
  const labelRef = useRef<HTMLSpanElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (permission !== 'granted') return
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const { left, right } = handStateRef.current
      const hand = left.present ? left : right
      if (labelRef.current) {
        labelRef.current.textContent = hand.present ? LABELS[hand.pose] ?? hand.pose : 'searching'
      }
      if (wrapRef.current) {
        wrapRef.current.style.opacity = hand.present ? '1' : '0.45'
      }
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [permission])

  if (permission !== 'granted') return null

  return (
    <div
      ref={wrapRef}
      className="glass rise pointer-events-none absolute left-5 top-5 z-20 rounded-full px-3 py-1.5 text-xs tracking-wide text-[var(--ink)]"
    >
      hand <span ref={labelRef} className="ml-1 text-[var(--muted)]">searching</span>
    </div>
  )
}
