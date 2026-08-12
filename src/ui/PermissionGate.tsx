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
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/95 p-6">
      <div className="panel max-w-md rounded-2xl p-8 text-center shadow-2xl">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Gesture Particles
        </p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight">Enable your camera</h1>
        <p className="mb-6 text-sm leading-relaxed text-[var(--muted)]">
          Hand tracking runs entirely on-device with MediaPipe. Video never leaves this browser
          tab — nothing is uploaded.
        </p>
        {permission === 'denied' && (
          <p className="mb-4 text-sm text-rose-300">
            Camera permission was blocked. Allow camera access in the browser site settings, then
            try again.
          </p>
        )}
        <button
          type="button"
          onClick={() => void request()}
          disabled={permission === 'requesting'}
          className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#042f2e] transition hover:brightness-110 disabled:opacity-60"
        >
          {permission === 'requesting' ? 'Requesting…' : 'Allow camera'}
        </button>
      </div>
    </div>
  )
}
