import { useEffect, useRef } from 'react'
import { handTracker } from '../vision/HandTracker'
import { handStateRef } from '../state/handState'
import { useAppStore } from '../state/store'

/**
 * Mirrored camera preview + landmark skeleton so you can see how your hand
 * maps onto the particle field.
 */
export function CameraPreview() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const permission = useAppStore((s) => s.permission)
  const showLandmarks = useAppStore((s) => s.settings.showLandmarks)

  useEffect(() => {
    if (permission !== 'granted') return
    const preview = videoRef.current
    const src = handTracker.getVideoElement()
    if (!preview || !src) return
    preview.srcObject = src.srcObject
    void preview.play().catch(() => {})
  }, [permission])

  useEffect(() => {
    if (permission !== 'granted' || !showLandmarks) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const connections: Array<[number, number]> = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [0, 9], [9, 10], [10, 11], [11, 12],
      [0, 13], [13, 14], [14, 15], [15, 16],
      [0, 17], [17, 18], [18, 19], [19, 20],
      [5, 9], [9, 13], [13, 17],
    ]

    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w < 2 || h < 2) return
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      ctx.clearRect(0, 0, w, h)

      for (const hand of [handStateRef.current.left, handStateRef.current.right]) {
        if (!hand.present || !hand.landmarks) continue
        const lm = hand.landmarks
        const stroke =
          hand.pose === 'fist'
            ? '#fb7185'
            : hand.pose === 'pinch'
              ? '#fbbf24'
              : '#5eead4'
        ctx.strokeStyle = stroke
        ctx.fillStyle = stroke
        ctx.lineWidth = 2

        for (const [a, b] of connections) {
          ctx.beginPath()
          ctx.moveTo(lm[a * 3]! * w, lm[a * 3 + 1]! * h)
          ctx.lineTo(lm[b * 3]! * w, lm[b * 3 + 1]! * h)
          ctx.stroke()
        }
        for (let i = 0; i < 21; i++) {
          ctx.beginPath()
          ctx.arc(lm[i * 3]! * w, lm[i * 3 + 1]! * h, 2.5, 0, Math.PI * 2)
          ctx.fill()
        }

        // Pose label
        ctx.font = '12px ui-monospace, monospace'
        ctx.fillStyle = '#e2e8f0'
        ctx.fillText(
          `${hand.pose}  open ${hand.openness.toFixed(2)}`,
          lm[0]! * w + 8,
          lm[1]! * h - 8,
        )
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [permission, showLandmarks])

  if (permission !== 'granted') return null

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 overflow-hidden rounded-xl border border-white/15 shadow-2xl">
      <div className="relative h-36 w-52 bg-black">
        <video
          ref={videoRef}
          className="h-full w-full scale-x-[-1] object-cover opacity-70"
          muted
          playsInline
          autoPlay
        />
        {showLandmarks && (
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
        )}
        <div className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/80">
          Hand preview
        </div>
        <div className="absolute bottom-2 left-2 right-2 text-[10px] leading-tight text-white/70">
          <span className="text-[#5eead4]">Teal</span> attract ·{' '}
          <span className="text-[#fb7185]">Pink</span> fist ·{' '}
          <span className="text-[#fbbf24]">Gold</span> pinch
        </div>
      </div>
    </div>
  )
}
