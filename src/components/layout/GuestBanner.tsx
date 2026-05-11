'use client'

export function GuestBanner() {
  return (
    <div className="flex items-center justify-between rounded-xl bg-nc-repair-bg border border-nc-repair-border px-3 py-2 text-[11px]">
      <span className="text-nc-green/70">
        👤 Fremgangen din lagres lokalt.
      </span>
      <button className="font-bold text-nc-green">
        Logg inn →
      </button>
    </div>
  )
}
