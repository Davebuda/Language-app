'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiService } from '@/ai'
import { AIStatusBadge } from '@/components/ai/AIStatusBadge'

// ── Evaluation task definitions ────────────────────────────────────────────

interface EvalTask {
  id: string
  category: 'generate' | 'explain' | 'detect' | 'conversation' | 'review'
  description: string
  run: () => Promise<string>
}

const TASKS: EvalTask[] = [
  // ── Content generation (fill-in-blank) ───────────────────────────────
  {
    id: 'gen-fib-a1',
    category: 'generate',
    description: 'Generate fill-in-blank (A1, noun-gender)',
    run: async () => {
      const result = await aiService.generateContent({ conceptId: 'noun-gender', exerciseType: 'fill-in-blank', level: 'A1', purpose: 'new-material' })
      return JSON.stringify(result, null, 2)
    },
  },
  {
    id: 'gen-fib-a2',
    category: 'generate',
    description: 'Generate fill-in-blank (A2, v2-word-order)',
    run: async () => {
      const result = await aiService.generateContent({ conceptId: 'v2-word-order', exerciseType: 'fill-in-blank', level: 'A2', purpose: 'new-material' })
      return JSON.stringify(result, null, 2)
    },
  },
  {
    id: 'gen-trans-a1',
    category: 'generate',
    description: 'Generate translation-to-norwegian (A1)',
    run: async () => {
      const result = await aiService.generateContent({ conceptId: 'present-tense-regular', exerciseType: 'translation-to-norwegian', level: 'A1', purpose: 'new-material', scenario: 'food' })
      return JSON.stringify(result, null, 2)
    },
  },
  {
    id: 'gen-trans-a2',
    category: 'generate',
    description: 'Generate translation-to-norwegian (A2)',
    run: async () => {
      const result = await aiService.generateContent({ conceptId: 'adjective-agreement', exerciseType: 'translation-to-norwegian', level: 'A2', purpose: 'remediation' })
      return JSON.stringify(result, null, 2)
    },
  },
  {
    id: 'gen-word-order',
    category: 'generate',
    description: 'Generate word-order exercise (A2, v2-word-order)',
    run: async () => {
      const result = await aiService.generateContent({ conceptId: 'v2-word-order', exerciseType: 'word-order', level: 'A2', purpose: 'new-material' })
      return JSON.stringify(result, null, 2)
    },
  },

  // ── Mistake explanations ──────────────────────────────────────────────
  {
    id: 'explain-word-order',
    category: 'explain',
    description: 'Explain word-order error (I morgen jeg går → I morgen går jeg)',
    run: async () => {
      const result = await aiService.explainMistake({ wrong: 'I morgen jeg går på skolen.', correct: 'I morgen går jeg på skolen.', errorTag: 'word-order', conceptId: 'v2-word-order', level: 'A2' })
      return result.text
    },
  },
  {
    id: 'explain-gender',
    category: 'explain',
    description: 'Explain noun-gender error (en hus → et hus)',
    run: async () => {
      const result = await aiService.explainMistake({ wrong: 'en hus', correct: 'et hus', errorTag: 'noun-gender', conceptId: 'noun-gender', level: 'A1' })
      return result.text
    },
  },
  {
    id: 'explain-modal',
    category: 'explain',
    description: 'Explain modal-verb error (jeg kan å snakke → jeg kan snakke)',
    run: async () => {
      const result = await aiService.explainMistake({ wrong: 'Jeg kan å snakke norsk.', correct: 'Jeg kan snakke norsk.', errorTag: 'modal-verb', conceptId: 'common-modal-verbs', level: 'A2', errorCount: 3 })
      return result.text
    },
  },
  {
    id: 'explain-negation',
    category: 'explain',
    description: 'Explain negation-placement error (ikke jeg → jeg ikke)',
    run: async () => {
      const result = await aiService.explainMistake({ wrong: 'Ikke jeg liker det.', correct: 'Jeg liker ikke det.', errorTag: 'negation-placement', conceptId: 'negation', level: 'A2' })
      return result.text
    },
  },
  {
    id: 'explain-adjective',
    category: 'explain',
    description: 'Explain adjective-agreement error (et stor hus → et stort hus)',
    run: async () => {
      const result = await aiService.explainMistake({ wrong: 'et stor hus', correct: 'et stort hus', errorTag: 'adjective-agreement', conceptId: 'adjective-agreement', level: 'A2' })
      return result.text
    },
  },

  // ── Error detection ───────────────────────────────────────────────────
  {
    id: 'detect-correct',
    category: 'detect',
    description: 'Detect errors in grammatically correct text',
    run: async () => {
      const result = await aiService.detectErrors('Jeg liker å spise middag med familien min om kvelden.', 'A1')
      return JSON.stringify(result, null, 2)
    },
  },
  {
    id: 'detect-word-order',
    category: 'detect',
    description: 'Detect V2 word-order error',
    run: async () => {
      const result = await aiService.detectErrors('I dag jeg jobber hjemme fordi det regner.', 'A2')
      return JSON.stringify(result, null, 2)
    },
  },
  {
    id: 'detect-multiple',
    category: 'detect',
    description: 'Detect multiple errors in learner text',
    run: async () => {
      const result = await aiService.detectErrors('Jeg har en stor hus og en bil rød.', 'A1')
      return JSON.stringify(result, null, 2)
    },
  },

  // ── Conversation turns ────────────────────────────────────────────────
  {
    id: 'conv-opening-a1',
    category: 'conversation',
    description: 'Conversation opening (A1, food topic)',
    run: async () => {
      const result = await aiService.conversationTurn([], 'A1', 'food')
      return result.tutorResponse
    },
  },
  {
    id: 'conv-response-a2',
    category: 'conversation',
    description: 'Conversation response to user message (A2)',
    run: async () => {
      const result = await aiService.conversationTurn(
        [{ role: 'tutor', content: 'Hei! La oss snakke om mat. Hva liker du best å spise?' }, { role: 'user', content: 'Jeg liker veldig pizza og pasta.' }],
        'A2', 'food'
      )
      return `${result.tutorResponse}${result.correction ? `\n\nCORRECTION: ${JSON.stringify(result.correction)}` : ''}`
    },
  },
  {
    id: 'conv-correction',
    category: 'conversation',
    description: 'Conversation response when user makes a grammar error',
    run: async () => {
      const result = await aiService.conversationTurn(
        [{ role: 'tutor', content: 'Hva gjør du i dag?' }, { role: 'user', content: 'I dag jeg går på butikken.' }],
        'A2', 'daily-routine'
      )
      return `${result.tutorResponse}${result.correction ? `\n\nCORRECTION: ${JSON.stringify(result.correction)}` : ''}`
    },
  },

  // ── Writing review ────────────────────────────────────────────────────
  {
    id: 'review-good',
    category: 'review',
    description: 'Review well-written A1 text',
    run: async () => {
      const result = await aiService.reviewWriting({ userText: 'Jeg heter Emma. Jeg er student og bor i Oslo. Jeg liker å lese bøker og gå på tur.', prompt: 'Beskriv deg selv', level: 'A1' })
      return JSON.stringify({ praise: result.praise, errors: result.errors, suggestion: result.suggestion }, null, 2)
    },
  },
  {
    id: 'review-errors',
    category: 'review',
    description: 'Review A2 text with errors',
    run: async () => {
      const result = await aiService.reviewWriting({ userText: 'I dag jeg gikk til jobben. Der jobbet jeg med et stor prosjekt. Kollegaene min er veldig hyggelig.', prompt: 'Beskriv arbeidsdagen din', level: 'A2' })
      return JSON.stringify({ praise: result.praise, errors: result.errors, suggestion: result.suggestion }, null, 2)
    },
  },
  {
    id: 'review-complex',
    category: 'review',
    description: 'Review B1-level text with subtle errors',
    run: async () => {
      const result = await aiService.reviewWriting({ userText: 'Selv om det er kaldt ute, liker jeg å gå tur i skogen. Det hjelper meg til å tenke klart og jeg føler meg bedre etterpå.', prompt: 'Friluftsliv', level: 'B1' })
      return JSON.stringify({ praise: result.praise, errors: result.errors, suggestion: result.suggestion }, null, 2)
    },
  },
]

// ── Types ──────────────────────────────────────────────────────────────────

interface RunResult {
  taskId: string
  run: number
  output: string
  durationMs: number
  error?: string
}

const CATEGORY_COLORS: Record<EvalTask['category'], string> = {
  generate: 'bg-[rgba(220,38,38,0.15)] text-[var(--nc-red)]',
  explain:  'bg-[rgba(255,255,255,0.08)] text-[var(--nc-text-muted)]',
  detect:   'bg-[rgba(74,222,128,0.12)] text-[var(--nc-green)]',
  conversation: 'bg-[rgba(255,255,255,0.06)] text-[var(--nc-text-muted)]',
  review:   'bg-[rgba(255,255,255,0.05)] text-[var(--nc-text-dim)]',
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function EvalPage() {
  const [results, setResults] = useState<RunResult[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)

  const RUNS_PER_TASK = 3

  async function runAll() {
    setRunning(true)
    setResults([])
    setProgress(0)
    const total = TASKS.length * RUNS_PER_TASK
    let done = 0

    for (const task of TASKS) {
      for (let run = 1; run <= RUNS_PER_TASK; run++) {
        const start = Date.now()
        try {
          const output = await task.run()
          setResults((prev) => [...prev, { taskId: task.id, run, output, durationMs: Date.now() - start }])
        } catch (err) {
          setResults((prev) => [...prev, { taskId: task.id, run, output: '', durationMs: Date.now() - start, error: String(err) }])
        }
        done++
        setProgress(Math.round((done / total) * 100))
        // Small pause between runs to avoid WASM contention
        await new Promise((r) => setTimeout(r, 200))
      }
    }

    setRunning(false)
  }

  function downloadResults() {
    const blob = new Blob([JSON.stringify({ tasks: TASKS.map((t) => ({ id: t.id, category: t.category, description: t.description })), results }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `norskcoach-eval-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const taskResults = (taskId: string) => results.filter((r) => r.taskId === taskId)
  const successRate = results.length > 0
    ? Math.round((results.filter((r) => !r.error).length / results.length) * 100)
    : 0

  return (
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <div className="relative z-10 mx-auto w-full max-w-3xl space-y-5 px-5 py-6">

        {/* Header */}
        <div className="nc-glass-elevated p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="nc-label">Norwegian AI Evaluation</div>
              <h1 className="mt-2 font-display text-[1.8rem] font-semibold text-[var(--nc-text)]">
                Model quality harness
              </h1>
              <p className="mt-2 text-[13px] text-[var(--nc-text-muted)]">
                {TASKS.length} tasks × {RUNS_PER_TASK} runs each. Requires the AI model to be loaded.
              </p>
            </div>
            <AIStatusBadge />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={runAll}
              disabled={running}
              className="nc-button-primary px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {running ? `Running… ${progress}%` : 'Run evaluation'}
            </button>
            {results.length > 0 && (
              <button
                onClick={downloadResults}
                className="nc-button-dark px-5 py-2.5 text-sm font-semibold"
              >
                Download JSON
              </button>
            )}
          </div>

          {running && (
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--nc-border)]">
              <motion.div
                className="h-full w-full origin-left rounded-full bg-[var(--nc-red)]"
                animate={{ scaleX: progress / 100 }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>

        {/* Summary */}
        {results.length > 0 && !running && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Tasks completed', value: `${results.filter((r) => !r.error).length} / ${results.length}` },
              { label: 'Success rate', value: `${successRate}%` },
              { label: 'Avg duration', value: `${Math.round(results.reduce((s, r) => s + r.durationMs, 0) / results.length)}ms` },
            ].map((s) => (
              <div key={s.label} className="nc-glass px-3 py-3 text-center">
                <div className="font-display text-[1.4rem] font-semibold text-[var(--nc-red)]">{s.value}</div>
                <div className="mt-1 text-[10px] font-medium text-[var(--nc-text-dim)]">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Task list */}
        <div className="flex flex-col gap-2">
          {TASKS.map((task) => {
            const runs = taskResults(task.id)
            const isOpen = selectedTask === task.id
            const hasError = runs.some((r) => r.error)

            return (
              <div key={task.id} className="nc-glass overflow-hidden">
                <button
                  className="flex w-full items-center gap-3 p-4 text-left"
                  onClick={() => setSelectedTask(isOpen ? null : task.id)}
                >
                  <span className={`rounded-[0.6rem] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CATEGORY_COLORS[task.category]}`}>
                    {task.category}
                  </span>
                  <span className="flex-1 text-[13px] font-medium text-[var(--nc-text)]">{task.description}</span>
                  {runs.length > 0 && (
                    <span className={`text-[11px] font-semibold ${hasError ? 'text-red-400' : 'text-[var(--nc-text-dim)]'}`}>
                      {hasError ? '✗ error' : `✓ ${runs.length}×`}
                    </span>
                  )}
                  {runs.length > 0 && (
                    <span className="text-[11px] text-[var(--nc-text-dim)]">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isOpen && runs.length > 0 && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 border-t border-[var(--nc-border)] px-4 pb-4 pt-3">
                        {runs.map((run) => (
                          <div key={run.run}>
                            <div className="mb-1 flex items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--nc-text-dim)]">
                                Run {run.run}
                              </span>
                              <span className="text-[10px] text-[var(--nc-text-dim)]">{run.durationMs}ms</span>
                              {run.error && <span className="text-[10px] text-red-400">ERROR</span>}
                            </div>
                            <pre className="nc-glass-cream overflow-x-auto whitespace-pre-wrap p-3 text-[12px] leading-relaxed text-[var(--nc-text)]">
                              {run.error ?? run.output}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {results.length === 0 && !running && (
          <div className="nc-glass p-8 text-center">
            <p className="text-sm text-[var(--nc-text-muted)]">
              Load the AI model first (it appears in the status badge above), then run the evaluation.
              Results are shown per task and can be downloaded as JSON for manual rating.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
