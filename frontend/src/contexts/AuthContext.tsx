import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User, Dairy, AuthTokens } from '@/types'

interface AuthState {
  user: User | null
  dairy: Dairy | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  isCustomer: boolean
  loading: boolean
  dairyId: string | null
  login: (tokens: AuthTokens, user: User, dairy?: Dairy) => void
  logout: () => void
  updateDairy: (dairy: Dairy) => void
}

const AuthContext = createContext<AuthState | null>(null)

function loadFromStorage(): Partial<AuthState> {
  try {
    const user = localStorage.getItem('user')
    const dairy = localStorage.getItem('dairy')
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    return {
      user: user ? JSON.parse(user) : null,
      dairy: dairy ? JSON.parse(dairy) : null,
      accessToken,
      refreshToken,
    }
  } catch {
    return {}
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const stored = loadFromStorage()

  const [user, setUser] = useState<User | null>(stored.user || null)
  const [dairy, setDairy] = useState<Dairy | null>(stored.dairy || null)
  const [accessToken, setAccessToken] = useState<string | null>(stored.accessToken || null)
  const [refreshToken, setRefreshToken] = useState<string | null>(stored.refreshToken || null)

  const isAuthenticated = !!user && !!accessToken
  const isAdmin = user?.role === 'admin'
  const isCustomer = user?.role === 'customer'
  const dairyId = user?.dairyId || dairy?._id || null

  const login = useCallback((tokens: AuthTokens, newUser: User, newDairy?: Dairy) => {
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    if (newDairy) localStorage.setItem('dairy', JSON.stringify(newDairy))

    setAccessToken(tokens.accessToken)
    setRefreshToken(tokens.refreshToken)
    setUser(newUser)
    if (newDairy) setDairy(newDairy)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('dairy')
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
    setDairy(null)
  }, [])

  const updateDairy = useCallback((newDairy: Dairy) => {
    localStorage.setItem('dairy', JSON.stringify(newDairy))
    setDairy(newDairy)
  }, [])

  // Keep refreshToken in sync
  useEffect(() => {
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
  }, [refreshToken])

  return (
    <AuthContext.Provider
      value={{
        user,
        dairy,
        accessToken,
        refreshToken,
        isAuthenticated,
        isAdmin,
        isCustomer,
        loading: false,
        dairyId,
        login,
        logout,
        updateDairy,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
