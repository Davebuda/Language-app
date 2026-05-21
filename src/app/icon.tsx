import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: '#FF3333',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: '-0.04em',
      }}
    >
      N
    </div>,
    { width: 32, height: 32 },
  )
}
