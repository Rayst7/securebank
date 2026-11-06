import { createContext } from 'react'
import type { User } from '../types/auth'

export interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  /** true mientras se lee la sesión guardada en SecureStore. */
  restoring: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
