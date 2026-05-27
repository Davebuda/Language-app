#!/usr/bin/env node
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { readFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const VOICE = 'nb-NO-PernilleNeural'
const OUTPUT_DIR = join(process.cwd(), 'public', 'audio', 'sentences')
const CONTENT_DIR = join(process.cwd(), 'content', 'sentences')

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

function cleanTextForTTS(text) {
  return text
    .replace(/_____\s*\([^)]+\)/g, '')
    .replace(/_{2,}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const levels = process.argv[2] ? [process.argv[2]] : ['a1.json', 'a2.json', 'b1.json', 'b2.json']
let generated = 0
let skipped = 0
let failed = 0

const tts = new MsEdgeTTS()
await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

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
      const stream = tts.toStream(text)
      const ws = (await import('fs')).createWriteStream(outPath)
      stream.audioStream.pipe(ws)
      await new Promise((resolve, reject) => { ws.on('finish', resolve); ws.on('error', reject) })
      generated++
      if (generated % 20 === 0) console.log(`  Generated ${generated} audio files...`)
    } catch (err) {
      console.error(`  Failed: ${id} — ${err.message?.slice(0, 80)}`)
      failed++
    }
  }
}

console.log(`\nDone. Generated: ${generated}, Skipped: ${skipped}, Failed: ${failed}`)
