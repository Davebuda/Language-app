'use client'

import { useEffect, useId, useState } from 'react'

interface ScoreCircleProps {
  accuracy: number
  size?: number
}

export function ScoreCircle({ accuracy, size = 100 }: ScoreCircleProps) {
  const [animated, setAnimated] = useState(0)
  const gradientId = useId().replace(/:/g, '')
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animated / 100) * circumference

  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(accuracy), 80)
    return () => clearTimeout(timeout)
  }, [accuracy])

  return (
    <svg width={size} height={size}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c7b8ff" />
          <stop offset="100%" stopColor="#ad9fff" />
        </linearGradient>
      </defs>

      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(23,23,29,0.09)"
        strokeWidth={8}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      <text
        x={size / 2}
        y={size / 2 - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700 }}
        fontSize={size * 0.22}
        fill="#17171d"
      >
        {accuracy}
      </text>
      <text
        x={size / 2}
        y={size / 2 + size * 0.17}
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-sans), sans-serif', fontWeight: 500 }}
        fontSize={size * 0.095}
        fill="rgba(23,23,29,0.42)"
      >
        accuracy
      </text>
    </svg>
  )
}
