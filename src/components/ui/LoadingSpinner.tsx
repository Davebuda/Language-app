'use client'

export function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[var(--nc-red)] animate-spin"
          role="status"
          aria-label="Laster"
        />
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--nc-text-muted)', fontFamily: "'Schibsted Grotesk', sans-serif" }}
        >
          Laster...
        </span>
      </div>
    </div>
  )
}
