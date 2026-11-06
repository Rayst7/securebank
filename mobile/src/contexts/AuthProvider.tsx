import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService } from '../services/auth.service'
import {
  clearStoredToken,
  getStoredToken,
  setUnauthorizedHandler,
  storeToken,
} from '../services/api'
import { getItem, removeItem, setItem } from '../services/storage'
import type { User } from '../types/auth'
import { AuthContext } from './auth-context'

const USER_KEY = 'securebank.user'

function parseStoredUser(raw: string | null): User | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as User
    if (!parsed?.id || !parsed?.email) return null
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [restoring, setRestoring] = useState(true)

  const clearSession = useCallback(async () => {
    await Promise.all([clearStoredToken(), removeItem(USER_KEY)])
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    let active = true

    const restore = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          getStoredToken(),
          getItem(USER_KEY),
        ])

        if (!active) return

        const parsedUser = parseStoredUser(storedUser)

        if (storedToken && parsedUser) {
          setToken(storedToken)
          setUser(parsedUser)
        } else {
          await Promise.all([clearStoredToken(), removeItem(USER_KEY)])
        }
      } finally {
        if (active) setRestoring(false)
      }
    }

    void restore()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearSession()
    })

    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login({ email, password })

    await Promise.all([
      storeToken(response.access_token),
      setItem(USER_KEY, JSON.stringify(response.user)),
    ])

    setToken(response.access_token)
    setUser(response.user)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      restoring,
      login,
      logout: clearSession,
    }),
    [user, token, restoring, login, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
