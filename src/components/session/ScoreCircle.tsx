'use client'

import { useEffect, useState } from 'react'

interface ScoreCircleProps {
  accuracy: number // 0–100
  size?: number
}

export function ScoreCircle({ accuracy, size = 100 }: ScoreCircleProps) {
  const [animated, setAnimated] = useState(0)
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animated / 100) * circumference

  useEffect(() => {
    const t = setTimeout(() => setAnimated(accuracy), 80)
    return () => clearTimeout(t)
  }, [accuracy])

  return (
    <svg width={size} height={size}>
      {/* Dark track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={8}
      />
      {/* Green progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#c8ff00"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      {/* Score number — white */}
      <text
        x={size / 2}
        y={size / 2 - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900 }}
        fontSize={size * 0.22}
        fill="#ffffff"
      >
        {accuracy}
      </text>
      {/* Percent sign — muted */}
      <text
        x={size / 2}
        y={size / 2 + size * 0.17}
        textAnchor="middle"
        style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}
        fontSize={size * 0.1}
        fill="rgba(255,255,255,0.4)"
      >
        %
      </text>
    </svg>
  )
}
