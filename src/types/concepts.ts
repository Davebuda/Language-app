import type { CEFRLevel } from './fingerprint';
import type { ErrorTag } from './taxonomy';

export interface ConceptNode {
  id: string;
  label: string;           // Human-readable label
  description: string;     // One sentence explaining what this concept is
  cefrLevel: CEFRLevel;
  prerequisites: string[]; // IDs of concepts that must be mastered first
  masteryThreshold: number; // 0–100, score needed to mark as mastered (usually 80)
  minAttempts: number;     // Minimum attempts before mastery can be achieved (usually 15-20)
  minDays: number;         // Practice must span at least this many calendar days
  errorTags: ErrorTag[];   // Which error types this concept relates to (for linking errors to concepts)
  vocabularyClusters?: string[]; // Related vocabulary clusters
}

export interface ConceptGraph {
  version: string;
  language: string;
  concepts: ConceptNode[];
}

// Utility: Get all concepts whose prerequisites are all mastered
export function getUnlockedConcepts(
  graph: ConceptGraph,
  masteredConceptIds: Set<string>
): ConceptNode[] {
  return graph.concepts.filter(
    (c) =>
      !masteredConceptIds.has(c.id) &&
      c.prerequisites.every((prereqId) => masteredConceptIds.has(prereqId))
  );
}

// Utility: Get all directly unlockable concepts (one step ahead)
export function getNextUnlockable(
  graph: ConceptGraph,
  masteredConceptIds: Set<string>,
  inProgressIds: Set<string>
): ConceptNode[] {
  return getUnlockedConcepts(graph, masteredConceptIds).filter(
    (c) => !inProgressIds.has(c.id)
  );
}
