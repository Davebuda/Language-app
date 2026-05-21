'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const emailSchema = z.string().email()

export async function submitWaitlist(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const result = emailSchema.safeParse(email)
  if (!result.success) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('waitlist')
      .insert({ email: result.data })

    if (error) {
      if (error.code === '23505') return { success: true }
      return { success: false, error: 'Something went wrong. Please try again.' }
    }

    return { success: true }
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
