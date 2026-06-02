// Loader/index for the B2 vocab track content (Slice 3.3).
import vocabRaw from '../../content/vocab/b2-clusters.json'
import type { VocabContent, VocabWord, VocabCluster, VocabSentence } from '@/types/vocab'

const content = vocabRaw as unknown as VocabContent

export const VOCAB_CONTENT: VocabContent = content
export const VOCAB_WORDS: VocabWord[] = content.words
export const VOCAB_CLUSTERS: VocabCluster[] = content.clusters

export const VOCAB_WORD_BY_ID = new Map(content.words.map((w) => [w.id, w]))
export const VOCAB_CLUSTER_BY_ID = new Map(content.clusters.map((c) => [c.id, c]))

/** |cluster.wordIds| — the per-cluster denominator for vocabularyMastery. */
export function clusterTotalWords(clusterId: string): number {
  return VOCAB_CLUSTER_BY_ID.get(clusterId)?.wordIds.length ?? 0
}

/** A carrier sentence for a word (first that exercises it), for the success reveal. */
export function carrierFor(wordId: string): VocabSentence | undefined {
  return content.sentences.find((s) => s.wordIds.includes(wordId))
}
