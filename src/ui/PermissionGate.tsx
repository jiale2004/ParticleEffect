import { useRef } from 'react'
import { handTracker } from '../vision/HandTracker'
import { gestureEngine } from '../vision/GestureEngine'
import { useAppStore } from '../state/store'

export function PermissionGate() {
  const permission = useAppStore((s) => s.permission)
  const setPermission = useAppStore((s) => s.setPermission)
  const unsubRef = useRef<(() => void) | null>(null)

  const request = async () => {
    setPermission('requesting')
    try {
      await handTracker.start()
      unsubRef.current?.()
      unsubRef.current = handTracker.subscribe((result) => gestureEngine.ingest(result))
      setPermission('granted')
    } catch (err) {
      console.error(err)
      setPermission('denied')
    }
  }

  if (permission === 'granted') return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-black p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(26,109,255,0.18),transparent_58%)]" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#1a6dff]/10 blur-3xl" />
      <div className="rise relative max-w-2xl text-center">
        <p className="kicker mb-8">Lumen</p>
        <div className="breathe mx-auto mb-10 h-24 w-24 rounded-full border border-white/15 shadow-[0_0_80px_rgba(74,163,255,0.35)]">
          <div className="mx-auto mt-[1.15rem] h-14 w-14 rounded-full bg-gradient-to-b from-[#9fe8ff] via-[#1a6dff] to-[#031a4a]" />
        </div>
        <h1
          className="mb-6 text-[clamp(2.8rem,7vw,5.6rem)] leading-[0.95] font-normal tracking-tight"
          style={{ fontFamily: 'var(--serif)' }}
        >
          Raise a hand.
          <br />
          Command the dark.
        </h1>
        <p className="mx-auto mb-10 max-w-md text-base leading-relaxed text-[var(--muted)]">
          Morpho. Synapse. Fireflies. Three living cathedrals unfold from your palm — on this
          machine only, never uploaded.
        </p>
        {permission === 'denied' && (
          <p className="mb-4 text-sm text-rose-300">
            Camera access was blocked. Allow it in site settings, then try again.
          </p>
        )}
        <button
          type="button"
          onClick={() => void request()}
          disabled={permission === 'requesting'}
          className="rounded-full bg-[var(--ink)] px-9 py-3.5 text-sm font-medium tracking-wide text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {permission === 'requesting' ? 'Opening the void…' : 'Enter the field'}
        </button>
      </div>
    </div>
  )
}
