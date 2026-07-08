import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { login as loginRequest } from '@/api/auth'
import { setAuthTokenGetter } from '@/api/http'
import type { AuthLoginInput } from '@/schemas/auth'
import type { AuthUser, UserRole } from '@/types/api'

interface AuthContextValue {
  user: AuthUser | null
  role: UserRole | 'any' | null
  signIn: (input: AuthLoginInput) => Promise<AuthUser>
  signOut: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setAuthTokenGetter(() => token)
  }, [token])

  useEffect(() => {
    setIsLoading(false)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isLoading,
      signIn: async (input) => {
        const response = await loginRequest(input)
        setUser(response.user)
        setToken(response.token)
        return response.user
      },
      signOut: () => {
        setUser(null)
        setToken(null)
      },
    }),
    [isLoading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}