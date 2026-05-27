'use client'

import { useEffect, useState } from 'react'

interface ScoreCircleProps {
  accuracy: number
  size?: number
  tone?: 'dark' | 'light'
}

export function ScoreCircle({ accuracy, size = 172, tone = 'dark' }: ScoreCircleProps) {
  const [animated, setAnimated] = useState(0)
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animated / 100) * circumference
  const textColor = tone === 'light' ? 'var(--nc-cream-text)' : 'var(--nc-text)'
  const subTextColor = tone === 'light' ? 'var(--nc-cream-muted)' : 'var(--nc-text-muted)'
  const trackColor = tone === 'light' ? 'rgba(6,16,23,0.10)' : 'var(--nc-border)'
  const fillColor = tone === 'light' ? 'rgba(247,251,245,0.96)' : 'white'

  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(accuracy), 80)
    return () => clearTimeout(timeout)
  }, [accuracy])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={(size - 28) / 2}
        fill={fillColor}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={8}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--nc-signal)"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      <text
        x={size / 2}
        y={size / 2 - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 800 }}
        fontSize={size * 0.24}
        fill={textColor}
      >
        {accuracy}
      </text>
      <text
        x={size / 2}
        y={size / 2 + size * 0.17}
        textAnchor="middle"
        style={{ fontFamily: 'var(--font-body), sans-serif', fontWeight: 500 }}
        fontSize={size * 0.085}
        fill={subTextColor}
      >
        accuracy
      </text>
    </svg>
  )
}
