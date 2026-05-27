'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="nb">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          backgroundColor: '#0a0a0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Schibsted Grotesk', sans-serif",
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem',
            padding: '2.5rem 2rem',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 106, 85, 0.12)',
              border: '1px solid rgba(255, 106, 85, 0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '1.25rem',
            }}
          >
            !
          </div>
          <h1
            style={{
              color: '#f5f7f3',
              fontSize: '1.25rem',
              fontWeight: 700,
              margin: '0 0 0.75rem',
            }}
          >
            Noe gikk galt
          </h1>
          <p
            style={{
              color: 'rgba(245, 247, 243, 0.62)',
              fontSize: '0.9rem',
              lineHeight: '1.6',
              margin: '0 0 2rem',
            }}
          >
            En feil oppstod. Prøv å laste siden på nytt.
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: '#ff6a55',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.9rem',
              padding: '0.625rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Schibsted Grotesk', sans-serif",
              minHeight: '44px',
              minWidth: '140px',
            }}
          >
            Prøv igjen
          </button>
        </div>
      </body>
    </html>
  )
}
