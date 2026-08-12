import { useEffect, useRef } from 'react'
import { handStateRef } from '../state/handState'
import { useAppStore } from '../state/store'

/**
 * Full-screen MediaPipe-style 21-landmark hand skeleton (original visualization).
 */
export function LandmarkOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const show = useAppStore((s) => s.settings.showLandmarks)
  const permission = useAppStore((s) => s.permission)

  useEffect(() => {
    if (!show || permission !== 'granted') return
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
        const stroke = hand.handedness === 'Right' ? '#5eead4' : '#7dd3fc'
        ctx.strokeStyle = stroke
        ctx.fillStyle = stroke
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        for (const [a, b] of connections) {
          ctx.beginPath()
          ctx.moveTo(lm[a * 3]! * w, lm[a * 3 + 1]! * h)
          ctx.lineTo(lm[b * 3]! * w, lm[b * 3 + 1]! * h)
          ctx.stroke()
        }
        for (let i = 0; i < 21; i++) {
          ctx.beginPath()
          ctx.arc(lm[i * 3]! * w, lm[i * 3 + 1]! * h, i === 0 ? 5 : 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [show, permission])

  if (!show || permission !== 'granted') return null

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      aria-hidden
    />
  )
}
