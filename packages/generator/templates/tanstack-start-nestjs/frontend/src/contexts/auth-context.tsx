import React, { ReactNode } from 'react'

interface AuthContextType {
  user: null | { id: string; email: string }
  isLoading: boolean
}

const AuthContext = React.createContext<AuthContextType>({ user: null, isLoading: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: null, isLoading: false }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return React.useContext(AuthContext)
}
