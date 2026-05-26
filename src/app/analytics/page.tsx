'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BottomNav } from '@/components/layout/BottomNav'
import { useAuth } from '@/hooks/useAuth'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { createClient } from '@/lib/supabase/client'

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

      // Query 1: Total events
      const { count } = await supabase
        .from('learning_events_log')
        .select('*', { count: 'exact', head: true })

      // Query 2: Top 5 error tags — fetch and aggregate client-side
      // (Supabase JS client does not support GROUP BY natively)
      const { data: errorRows } = await supabase
        .from('learning_events_log')
        .select('error_tag')
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
        const entries = Object.values(fingerprint.conceptMastery).filter(
          (m) => m.attemptCount > 5,
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
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-24 pt-5">
        <div className="mb-2">
          <h1 className="text-balance text-[1.375rem] font-extrabold text-[var(--nc-text)]">
            Analyse
          </h1>
          <p className="text-pretty mt-0.5 text-[0.8125rem] text-[var(--nc-text-muted)]">
            Læringsdata fra øktene dine
          </p>
        </div>

        {!user && (
          <div className="nc-glass p-5 text-center">
            <p className="text-[0.875rem] text-[var(--nc-text-muted)]">
              Logg inn for å se analysen din.
            </p>
          </div>
        )}

        {user && loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--nc-border)] border-t-[var(--nc-red)]" />
          </div>
        )}

        {user && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            {/* Card 1: Total Events */}
            <div className="nc-glass-elevated p-5">
              <div className="nc-label">Totalt hendelser</div>
              <div className="mt-2 text-[2.5rem] font-extrabold tabular-nums text-[var(--nc-text)]">
                {data.totalEvents ?? 0}
              </div>
              <p className="mt-1 text-[0.75rem] text-[var(--nc-text-dim)]">
                Øvelser, sjekker og eksponeringslogger
              </p>
            </div>

            {/* Card 2: Top Error Tags */}
            <div className="nc-glass-elevated p-5">
              <div className="nc-label">Vanligste feiltyper</div>
              {data.topErrorTags.length === 0 ? (
                <p className="mt-3 text-[0.8125rem] text-[var(--nc-text-dim)]">
                  Ingen feil registrert ennå.
                </p>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  {data.topErrorTags.map((item, i) => (
                    <div key={item.tag} className="flex items-center justify-between">
                      <span className="text-[0.8125rem] text-[var(--nc-text)]">
                        <span className="text-[var(--nc-text-dim)] tabular-nums">{i + 1}.</span>{' '}
                        {item.tag}
                      </span>
                      <span className="rounded-full bg-[var(--nc-red-tint)] px-2.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-[var(--nc-red)]">
                        {item.count}×
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 3: Average Retention */}
            <div className="nc-glass-elevated p-5">
              <div className="nc-label">Gjennomsnittlig bevaring</div>
              <div className="mt-2 text-[2.5rem] font-extrabold tabular-nums text-[var(--nc-text)]">
                {data.avgRetention !== null ? `${data.avgRetention}%` : '—'}
              </div>
              <p className="mt-1 text-[0.75rem] text-[var(--nc-text-dim)]">
                Forholdet mellom rå poengsum og forfalt poengsum for konsepter med 5+ forsøk
              </p>
            </div>
          </motion.div>
        )}
      </main>

      <BottomNav active="profile" />
    </div>
  )
}
