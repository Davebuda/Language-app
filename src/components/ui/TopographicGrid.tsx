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
    const state = { paused: false }

    // Concentric terrain rings — RINGS total, SEGS vertices each
    const RINGS = 26
    const SEGS  = 200

    // Stable orbital params — recomputed on resize, not per-frame
    const orb = { scale: 0, r1: 0, r2: 0 }

    function resize() {
      if (!canvas) return
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      orb.scale = Math.min(canvas.width, canvas.height)
      orb.r1    = orb.scale * 0.060
      orb.r2    = orb.scale * 0.100
    }

    function draw(elapsed: number) {
      if (!canvas || !ctx) return
      const t = elapsed * 0.001 * 0.42
      const { width: W, height: H } = canvas
      ctx.clearRect(0, 0, W, H)

      const scale = Math.min(W, H)

      // ── Topographic terrain rings ────────────────────────────────────────
      const cx = W * 0.70
      const cy = H * 0.58
      const rMin = scale * 0.04
      const rMax = scale * 0.62

      ctx.lineCap  = 'round'
      ctx.lineJoin = 'round'

      for (let k = 0; k < RINGS; k++) {
        const p     = Math.pow(k / (RINGS - 1), 0.72)
        const r     = rMin + p * (rMax - rMin)
        const rx    = r * 1.52
        const ry    = r * 0.78
        const alpha = Math.max(0, 0.14 - p * 0.12)
        if (alpha < 0.004) continue

        const nAmp = scale * 0.020 * (1 - p * 0.55)
        ctx.strokeStyle = `rgba(17,24,32,${(alpha * 0.42).toFixed(3)})`
        ctx.lineWidth   = 0.55
        ctx.beginPath()

        for (let seg = 0; seg <= SEGS; seg++) {
          const a = (seg / SEGS) * Math.PI * 2
          const noise =
            Math.sin(a * 2.3 + k * 0.52 + t * 0.95)        * nAmp +
            Math.sin(a * 5.1 + k * 0.88 + t * 0.58 + 1.31) * nAmp * 0.44 +
            Math.sin(a * 9.4 + k * 0.34 + t * 0.32 + 2.65) * nAmp * 0.21
          const x = cx + (rx + noise)        * Math.cos(a)
          const y = cy + (ry + noise * 0.52) * Math.sin(a)
          if (seg === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.closePath()
        ctx.stroke()
      }

      // ── Orbital system ───────────────────────────────────────────────────
      // Centre sits above the terrain peak, upper-right zone
      const ox = W * 0.74
      const oy = H * 0.26

      // Orbit path rings
      ;[orb.r1, orb.r2].forEach(r => {
        ctx.beginPath()
        ctx.arc(ox, oy, r, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(17,24,32,0.10)'
        ctx.lineWidth   = 0.6
        ctx.stroke()
      })

      // [orbit radius, speed rad/s, phase, ball radius, alpha]
      type Ball = [number, number, number, number, number]
      const BALLS: Ball[] = [
        [orb.r2, 0.26, 0.00, orb.scale * 0.0095, 0.90],  // large, outer, slowest
        [orb.r1, 0.58, 1.85, orb.scale * 0.0052, 0.75],  // medium, inner
        [orb.r2, 0.40, 3.60, orb.scale * 0.0030, 0.55],  // small, outer, offset phase
      ]

      BALLS.forEach(([orbit, speed, phase, bRadius, alpha]) => {
        const angle = t * speed + phase
        const bx = ox + orbit * Math.cos(angle)
        const by = oy + orbit * Math.sin(angle)
        ctx.beginPath()
        ctx.arc(bx, by, bRadius, 0, Math.PI * 2)
        ctx.fillStyle =
          alpha > 0.8
            ? 'rgba(215,255,92,0.88)'
            : alpha > 0.7
              ? 'rgba(17,24,32,0.64)'
              : 'rgba(17,24,32,0.34)'
        ctx.fill()
      })
    }

    function loop(now: number) {
      draw(now - startTime)
      animId = requestAnimationFrame(loop)
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && state.paused) {
        state.paused = false
        animId = requestAnimationFrame(loop)
      } else if (!entry.isIntersecting && !state.paused) {
        state.paused = true
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
