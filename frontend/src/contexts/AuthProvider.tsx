import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService } from '../services/auth.service'
import { clearStoredToken, getStoredToken, storeToken } from '../services/api'
import type { User } from '../types/auth'
import { AuthContext } from './auth-context'

const USER_KEY = 'securebank.user'

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as User
    if (!parsed?.id || !parsed?.email) return null
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [user, setUser] = useState<User | null>(() => readStoredUser())

  const logout = useCallback(() => {
    clearStoredToken()
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => logout()
    window.addEventListener('securebank:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('securebank:unauthorized', handleUnauthorized)
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login({ email, password })
    storeToken(response.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(response.user))
    setToken(response.access_token)
    setUser(response.user)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [user, token, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
