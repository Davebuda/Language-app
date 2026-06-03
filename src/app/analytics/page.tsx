'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BottomNav } from '@/components/layout/BottomNav'
import { useAuth } from '@/hooks/useAuth'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { createClient } from '@/lib/supabase/client'
import { hashUserId } from '@/lib/logEvents'

interface AnalyticsData {
  totalEvents: number | null
  topErrorTags: { tag: string; count: number }[]
  avgRetention: number | null
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  useFingerprint()
  const { fingerprint } = useFingerprintStore()
  const [data, setData] = useState<AnalyticsData>({
    totalEvents: null,
    topErrorTags: [],
    avgRetention: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalytics() {
      if (!user) { setLoading(false); return }
      const supabase = createClient()
      // learning_events_log is anonymized — rows carry anonymous_session_id
      // (a hash of the user id), not user_id. Scope every query to THIS user's
      // hash; without it the counts summed ALL learners' rows into a stat
      // labelled as the user's own.
      const anonId = await hashUserId(user.id)

      // Query 1: Total events (this user)
      const { count } = await supabase
        .from('learning_events_log')
        .select('*', { count: 'exact', head: true })
        .eq('anonymous_session_id', anonId)

      // Query 2: Top 5 error tags — fetch and aggregate client-side
      // (Supabase JS client does not support GROUP BY natively)
      const { data: errorRows } = await supabase
        .from('learning_events_log')
        .select('error_tag')
        .eq('anonymous_session_id', anonId)
        .not('error_tag', 'is', null)
        .limit(1000)

      const tagCounts = new Map<string, number>()
      if (errorRows) {
        for (const row of errorRows) {
          const tag = row.error_tag as string
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
        }
      }
      const topTags = [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }))

      // Query 3: Avg retention from local fingerprint (IndexedDB-backed store)
      // Retention = decayedScore / rawScore — signals how much mastery has held
      // after decay. Only computed for concepts with >5 attempts (enough signal).
      let avgRetention: number | null = null
      if (fingerprint) {
        // Exclude seeded/exposure-only concepts: rawScore still sitting at the
        // neutral 50 seed means the learner never truly practiced it (exposure
        // bumps attemptCount but not rawScore). Averaging their decayedScore/50
        // ratio in produced a meaningless ~100% that drowned the real signal.
        const entries = Object.values(fingerprint.conceptMastery ?? {}).filter(
          (m) => m.attemptCount > 5 && m.rawScore !== 50,
        )
        if (entries.length > 0) {
          const totalRetention = entries.reduce((sum, m) => {
            const retention = m.rawScore > 0 ? (m.decayedScore / m.rawScore) * 100 : 0
            return sum + retention
          }, 0)
          avgRetention = Math.round(totalRetention / entries.length)
        }
      }

      setData({ totalEvents: count ?? 0, topErrorTags: topTags, avgRetention })
      setLoading(false)
    }

    fetchAnalytics()
  }, [user, fingerprint])

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell relative z-10 flex w-full flex-1 flex-col gap-[6px] px-1.5 pb-28 pt-3">

        {/* Page header row */}
        <div className="flex items-center justify-between px-0.5 pb-1">
          <h1 className="font-display text-[1.1rem] font-extrabold tracking-[-0.02em] text-[var(--nc-text)]">
            Analyse
          </h1>
          <span className="nc-label">Læringsdata</span>
        </div>

        {!user && (
          <div className="nc-glass px-4 py-5 text-center">
            <p className="text-[0.82rem] text-[var(--nc-text-muted)]">
              Logg inn for å se analysen din.
            </p>
          </div>
        )}

        {user && loading && (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--nc-border)] border-t-[var(--nc-signal)]" />
          </div>
        )}

        {user && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="flex flex-col gap-[6px]"
          >
            {/* Lime focal — total events */}
            <div className="nc-signal-panel p-3.5">
              <div className="nc-label">Totalt hendelser</div>
              <div className="mt-1 font-display text-[2.8rem] font-extrabold leading-none tabular-nums text-[var(--nc-signal-fg)]">
                {data.totalEvents ?? 0}
              </div>
              <p className="mt-1 text-[0.72rem] text-[rgba(10,18,6,0.48)]">
                Øvelser, sjekker og eksponeringslogger
              </p>
            </div>

            {/* Cream stat strip — retention */}
            <div className="grid grid-cols-2 overflow-hidden rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)]">
              <div className="px-3 py-3 text-center">
                <div className="font-display text-[1.6rem] font-extrabold tabular-nums text-[#5A8A00]">
                  {data.avgRetention !== null ? `${data.avgRetention}%` : '—'}
                </div>
                <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--nc-cream-dim)]">Ferskhet</div>
              </div>
              <div className="relative px-3 py-3 text-center before:absolute before:left-0 before:top-[20%] before:h-[60%] before:w-px before:bg-[rgba(17,21,24,0.08)]">
                <div className="font-display text-[1.6rem] font-extrabold tabular-nums text-[var(--nc-cream-text)]">
                  {data.topErrorTags.length}
                </div>
                <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--nc-cream-dim)]">Feiltyper</div>
              </div>
            </div>

            {/* Dark panel — top error tags */}
            <div className="nc-glass overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--nc-border)] px-3 py-2">
                <span className="nc-label">Vanligste feiltyper</span>
              </div>
              {data.topErrorTags.length === 0 ? (
                <p className="px-3 py-4 text-[0.8rem] text-[var(--nc-text-dim)]">
                  Ingen feil registrert ennå.
                </p>
              ) : (
                <div className="flex flex-col">
                  {data.topErrorTags.map((item, i) => (
                    <div key={item.tag} className={`flex items-center justify-between px-3 py-2.5${i > 0 ? ' border-t border-[var(--nc-border-subtle)]' : ''}`}>
                      <span className="text-[0.82rem] text-[var(--nc-text)]">
                        <span className="tabular-nums text-[var(--nc-text-dim)]">{i + 1}.</span>{' '}
                        {item.tag}
                      </span>
                      <span className="rounded-full bg-[var(--nc-red-tint)] px-2.5 py-0.5 text-[0.6875rem] font-bold tabular-nums text-[var(--nc-red)]">
                        {item.count}×
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Retention note — cream */}
            <div className="nc-glass-cream px-3 py-2.5">
              <p className="text-[0.72rem] leading-[1.55] text-[var(--nc-cream-muted)]">
                Ferskhet = hvor nylig du har øvd (forfalt poengsum ÷ rå poengsum, konsepter med 5+ forsøk). Høy = nylig øvd; lav = klar for repetisjon.
              </p>
            </div>
          </motion.div>
        )}
      </main>

      <BottomNav active="profile" />
    </div>
  )
}
