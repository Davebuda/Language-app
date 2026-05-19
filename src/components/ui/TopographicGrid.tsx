'use client'

import { useEffect, useRef } from 'react'

export function TopographicGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animId = 0
    const startTime = performance.now()
    const s = { paused: false }  // mutable pause flag for IntersectionObserver

    const ROWS = 38
    const COLS = 30
    const SEGS = 90

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    // u,v are 0-1 normalised coords; returns y-offset in px
    function disp(u: number, v: number, t: number): number {
      // Pulse: sharp surges that momentarily amplify the folds
      const pulse = 1.0
        + 0.85 * Math.pow(Math.max(0, Math.sin(t * 1.4)),       2)
        + 0.55 * Math.pow(Math.max(0, Math.sin(t * 2.3 + 1.57)), 2)
      const amp = canvas.width * 0.072 * pulse
      const env = Math.sin(u * Math.PI) * Math.sin(v * Math.PI)
      return (
        env *
        (Math.sin(u * 4.8  + v * 3.5 + t * 1.00)        * amp +
         Math.sin(u * 9.5  + v * 5.8 + t * 0.70 + 1.23) * amp * 0.52 +
         Math.sin(u * 3.8  + v * 9.2 + t * 0.45 + 2.71) * amp * 0.38 +
         Math.sin(u * 14.0 + v * 6.4 + t * 1.10 + 0.55) * amp * 0.20)
      )
    }

    function draw(elapsed: number) {
      const t = elapsed * 0.001 * 1.1
      const { width: W, height: H } = canvas
      ctx.clearRect(0, 0, W, H)
      ctx.lineWidth = 0.5

      // Horizontal lines
      for (let r = 0; r <= ROWS; r++) {
        const v = r / ROWS
        const alpha = 0.045 + 0.027 * Math.abs(Math.sin(r * 0.41 + 0.8))
        ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`
        ctx.beginPath()
        for (let seg = 0; seg <= SEGS; seg++) {
          const u = seg / SEGS
          const x = u * W
          const y = v * H + disp(u, v, t)
          seg === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      // Vertical lines
      for (let c = 0; c <= COLS; c++) {
        const u = c / COLS
        const alpha = 0.032 + 0.019 * Math.abs(Math.sin(c * 0.37 + 0.5))
        ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`
        ctx.beginPath()
        for (let seg = 0; seg <= SEGS; seg++) {
          const v = seg / SEGS
          const x = u * W
          const y = v * H + disp(u, v, t)
          seg === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }

    function loop(now: number) {
      draw(now - startTime)
      animId = requestAnimationFrame(loop)
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && s.paused) {
        s.paused = false
        animId = requestAnimationFrame(loop)
      } else if (!entry.isIntersecting && !s.paused) {
        s.paused = true
        cancelAnimationFrame(animId)
      }
    })
    observer.observe(canvas)

    resize()
    window.addEventListener('resize', resize)

    if (prefersReducedMotion) {
      draw(0)
    } else {
      animId = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      observer.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 h-full w-full"
      aria-hidden="true"
    />
  )
}
