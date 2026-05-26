#!/usr/bin/env node
/**
 * Batch audio generation for NorskCoach sentences.
 * Uses edge-tts (Microsoft Edge Read Aloud API) to generate Norwegian TTS.
 *
 * Usage: node scripts/generate-audio.mjs
 *
 * Prerequisites: pip install edge-tts
 * Output: public/audio/sentences/{sentenceId}.mp3
 */

import { execSync } from 'child_process'
import { readFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const VOICE = 'nb-NO-PernilleNeural'
const OUTPUT_DIR = join(process.cwd(), 'public', 'audio', 'sentences')
const CONTENT_DIR = join(process.cwd(), 'content', 'sentences')
const PYTHON = process.env.PYTHON_PATH || 'python'

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

function cleanTextForTTS(text) {
  return text
    .replace(/_____\s*\([^)]+\)/g, '') // remove _____ (hint)
    .replace(/_{2,}/g, '')              // remove bare ___
    .replace(/\s{2,}/g, ' ')           // collapse whitespace
    .trim()
}

const levels = ['a1.json', 'a2.json', 'b1.json']
let generated = 0
let skipped = 0
let failed = 0

for (const file of levels) {
  const filePath = join(CONTENT_DIR, file)
  if (!existsSync(filePath)) { console.log(`Skipping ${file} — not found`); continue }

  const data = JSON.parse(readFileSync(filePath, 'utf-8'))
  const sentences = Array.isArray(data) ? data : data.sentences ?? []
  console.log(`Processing ${file}: ${sentences.length} sentences`)

  for (const sentence of sentences) {
    const id = sentence.id
    const raw = sentence.norwegian
    if (!id || !raw) continue

    const text = cleanTextForTTS(raw)
    if (!text) { skipped++; continue }

    const outPath = join(OUTPUT_DIR, `${id}.mp3`)
    if (existsSync(outPath)) { skipped++; continue }

    try {
      execSync(
        `"${PYTHON}" -m edge_tts --voice "${VOICE}" --text "${text.replace(/"/g, '\\"')}" --write-media "${outPath}"`,
        { stdio: 'pipe', timeout: 30000 }
      )
      generated++
      if (generated % 20 === 0) console.log(`  Generated ${generated} audio files...`)
    } catch (err) {
      console.error(`  Failed: ${id} — ${err.message?.slice(0, 80)}`)
      failed++
    }
  }
}

console.log(`\nDone. Generated: ${generated}, Skipped: ${skipped}, Failed: ${failed}`)
