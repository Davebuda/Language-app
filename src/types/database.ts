// Auto-generated from Supabase — regenerate with: mcp__supabase__generate_typescript_types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      content_vocab_mentions: {
        Row: { content_id: string; content_type: string; created_at: string; end_char: number; id: string; start_char: number; surface_form: string; vocab_item_id: string }
        Insert: { content_id: string; content_type: string; created_at?: string; end_char: number; id?: string; start_char: number; surface_form: string; vocab_item_id: string }
        Update: { content_id?: string; content_type?: string; created_at?: string; end_char?: number; id?: string; start_char?: number; surface_form?: string; vocab_item_id?: string }
      }
      conversation_sessions: {
        Row: { cefr_level: string; created_at: string; duration_seconds: number | null; ended_at: string | null; error_count: number; id: string; mode: string; scenario_id: string | null; summary: string | null; topic: string; turn_count: number; user_id: string | null }
        Insert: { cefr_level: string; created_at?: string; duration_seconds?: number | null; ended_at?: string | null; error_count?: number; id?: string; mode?: string; scenario_id?: string | null; summary?: string | null; topic: string; turn_count?: number; user_id?: string | null }
        Update: { cefr_level?: string; created_at?: string; duration_seconds?: number | null; ended_at?: string | null; error_count?: number; id?: string; mode?: string; scenario_id?: string | null; summary?: string | null; topic?: string; turn_count?: number; user_id?: string | null }
      }
      conversation_turns: {
        Row: { concept_ids: string[]; content: string; corrected_content: string | null; created_at: string; error_tags: string[]; id: string; role: string; session_id: string; turn_index: number }
        Insert: { concept_ids?: string[]; content: string; corrected_content?: string | null; created_at?: string; error_tags?: string[]; id?: string; role: string; session_id: string; turn_index: number }
        Update: { concept_ids?: string[]; content?: string; corrected_content?: string | null; created_at?: string; error_tags?: string[]; id?: string; role?: string; session_id?: string; turn_index?: number }
      }
      fingerprint_sync: {
        Row: { data: Json; updated_at: string | null; user_id: string }
        Insert: { data: Json; updated_at?: string | null; user_id: string }
        Update: { data?: Json; updated_at?: string | null; user_id?: string }
      }
      learning_events: {
        Row: { concept_ids: string[]; created_at: string; error_tags: string[]; event_type: string; id: string; mode: string; payload: Json; session_id: string | null; user_id: string | null; vocab_item_ids: string[] }
        Insert: { concept_ids?: string[]; created_at?: string; error_tags?: string[]; event_type: string; id?: string; mode: string; payload?: Json; session_id?: string | null; user_id?: string | null; vocab_item_ids?: string[] }
        Update: { concept_ids?: string[]; created_at?: string; error_tags?: string[]; event_type?: string; id?: string; mode?: string; payload?: Json; session_id?: string | null; user_id?: string | null; vocab_item_ids?: string[] }
      }
      reading_attempts: {
        Row: { completed: boolean; completed_at: string | null; comprehension_score: number | null; created_at: string; duration_seconds: number | null; id: string; text_id: string; user_id: string | null; vocab_encounters: string[] }
        Insert: { completed?: boolean; completed_at?: string | null; comprehension_score?: number | null; created_at?: string; duration_seconds?: number | null; id?: string; text_id: string; user_id?: string | null; vocab_encounters?: string[] }
        Update: { completed?: boolean; completed_at?: string | null; comprehension_score?: number | null; created_at?: string; duration_seconds?: number | null; id?: string; text_id?: string; user_id?: string | null; vocab_encounters?: string[] }
      }
      reading_texts: {
        Row: { cefr_level: string; concept_ids: string[]; content: string; content_en: string | null; created_at: string; difficulty: number; estimated_minutes: number; genre: string; id: string; image_url: string | null; title: string; word_count: number }
        Insert: { cefr_level: string; concept_ids?: string[]; content: string; content_en?: string | null; created_at?: string; difficulty?: number; estimated_minutes?: number; genre?: string; id?: string; image_url?: string | null; title: string; word_count?: number }
        Update: { cefr_level?: string; concept_ids?: string[]; content?: string; content_en?: string | null; created_at?: string; difficulty?: number; estimated_minutes?: number; genre?: string; id?: string; image_url?: string | null; title?: string; word_count?: number }
      }
      scenarios: {
        Row: { cefr_level_max: string; cefr_level_min: string; character_role: string; created_at: string | null; id: string; opening_line: string | null; setting: string; target_concept_ids: string[]; target_vocab_cluster_ids: string[]; title: string }
        Insert: { cefr_level_max: string; cefr_level_min: string; character_role: string; created_at?: string | null; id?: string; opening_line?: string | null; setting: string; target_concept_ids?: string[]; target_vocab_cluster_ids?: string[]; title: string }
        Update: { cefr_level_max?: string; cefr_level_min?: string; character_role?: string; created_at?: string | null; id?: string; opening_line?: string | null; setting?: string; target_concept_ids?: string[]; target_vocab_cluster_ids?: string[]; title?: string }
      }
      sentences: {
        Row: { audio_url: string | null; cefr_level: string; concept_ids: string[]; created_at: string | null; difficulty: number; english: string; error_tags_detectable: string[]; exercise_types: string[]; id: string; norwegian: string; notes: string | null; scenario_id: string | null; vocab_clusters: string[] }
        Insert: { audio_url?: string | null; cefr_level: string; concept_ids?: string[]; created_at?: string | null; difficulty: number; english: string; error_tags_detectable?: string[]; exercise_types?: string[]; id: string; norwegian: string; notes?: string | null; scenario_id?: string | null; vocab_clusters?: string[] }
        Update: { audio_url?: string | null; cefr_level?: string; concept_ids?: string[]; created_at?: string | null; difficulty?: number; english?: string; error_tags_detectable?: string[]; exercise_types?: string[]; id?: string; norwegian?: string; notes?: string | null; scenario_id?: string | null; vocab_clusters?: string[] }
      }
      shadowing_clips: {
        Row: { accent: string; audio_url: string; cefr_level: string; concept_ids: string[]; created_at: string; duration_ms: number; id: string; norwegian: string; phonetic_hint: string | null }
        Insert: { accent?: string; audio_url: string; cefr_level: string; concept_ids?: string[]; created_at?: string; duration_ms?: number; id?: string; norwegian: string; phonetic_hint?: string | null }
        Update: { accent?: string; audio_url?: string; cefr_level?: string; concept_ids?: string[]; created_at?: string; duration_ms?: number; id?: string; norwegian?: string; phonetic_hint?: string | null }
      }
      user_vocab_srs: {
        Row: { created_at: string; difficulty: number; interval_days: number; lapses: number; last_reviewed_at: string | null; next_due_at: string; reps: number; source_modes: string[]; stability: number; user_id: string; vocab_item_id: string }
        Insert: { created_at?: string; difficulty?: number; interval_days?: number; lapses?: number; last_reviewed_at?: string | null; next_due_at?: string; reps?: number; source_modes?: string[]; stability?: number; user_id: string; vocab_item_id: string }
        Update: { created_at?: string; difficulty?: number; interval_days?: number; lapses?: number; last_reviewed_at?: string | null; next_due_at?: string; reps?: number; source_modes?: string[]; stability?: number; user_id?: string; vocab_item_id?: string }
      }
      vocab_clusters: {
        Row: { cefr_level: string; created_at: string | null; description: string | null; id: string; label: string; word_count: number }
        Insert: { cefr_level: string; created_at?: string | null; description?: string | null; id?: string; label: string; word_count?: number }
        Update: { cefr_level?: string; created_at?: string | null; description?: string | null; id?: string; label?: string; word_count?: number }
      }
      vocab_forms: {
        Row: { created_at: string; id: string; lemma: string; morph: Json; surface_form: string; vocab_item_id: string }
        Insert: { created_at?: string; id?: string; lemma: string; morph?: Json; surface_form: string; vocab_item_id: string }
        Update: { created_at?: string; id?: string; lemma?: string; morph?: Json; surface_form?: string; vocab_item_id?: string }
      }
      vocab_items: {
        Row: { audio_url: string | null; cefr_level: string; cluster_id: string | null; created_at: string | null; english: string; example_sentence_id: string | null; frequency: number; gender: string | null; id: string; norwegian: string; word_class: string }
        Insert: { audio_url?: string | null; cefr_level: string; cluster_id?: string | null; created_at?: string | null; english: string; example_sentence_id?: string | null; frequency: number; gender?: string | null; id?: string; norwegian: string; word_class: string }
        Update: { audio_url?: string | null; cefr_level?: string; cluster_id?: string | null; created_at?: string | null; english?: string; example_sentence_id?: string | null; frequency?: number; gender?: string | null; id?: string; norwegian?: string; word_class?: string }
      }
      waitlist: {
        Row: { created_at: string | null; email: string; id: string }
        Insert: { created_at?: string | null; email: string; id?: string }
        Update: { created_at?: string | null; email?: string; id?: string }
      }
      writing_submissions: {
        Row: { cefr_level: string | null; concept_ids_targeted: string[]; content: string; content_corrected: string | null; created_at: string; error_count: number; error_tags: string[]; feedback: Json; id: string; prompt_text: string | null; user_id: string | null; word_count: number }
        Insert: { cefr_level?: string | null; concept_ids_targeted?: string[]; content: string; content_corrected?: string | null; created_at?: string; error_count?: number; error_tags?: string[]; feedback?: Json; id?: string; prompt_text?: string | null; user_id?: string | null; word_count?: number }
        Update: { cefr_level?: string | null; concept_ids_targeted?: string[]; content?: string; content_corrected?: string | null; created_at?: string; error_count?: number; error_tags?: string[]; feedback?: Json; id?: string; prompt_text?: string | null; user_id?: string | null; word_count?: number }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
