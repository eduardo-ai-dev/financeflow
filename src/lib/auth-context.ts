import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

export interface SignUpResult {
  error: Error | null
  user: User | null
  requiresEmailConfirmation: boolean
}

export interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  signInWithPassword: (params: { email: string; password: string }) => Promise<{ error: Error | null }>
  signUp: (params: { email: string; password: string; fullName: string }) => Promise<SignUpResult>
  signOut: () => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

