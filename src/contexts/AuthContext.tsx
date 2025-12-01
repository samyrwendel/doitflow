import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  username: string
  fullName?: string
  isAdmin: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verificar token salvo no localStorage ao inicializar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedToken = localStorage.getItem('auth-token')
        const savedUser = localStorage.getItem('user-data')

        if (savedToken && savedUser) {
          // Verificar se o token ainda é válido
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            setToken(savedToken)
            setUser(data.user)
          } else {
            // Token inválido, limpar dados
            localStorage.removeItem('auth-token')
            localStorage.removeItem('user-data')
            localStorage.removeItem('llm-api-keys') // Limpar API keys também
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error)
        // Em caso de erro, limpar dados por segurança
        localStorage.removeItem('auth-token')
        localStorage.removeItem('user-data')
        localStorage.removeItem('llm-api-keys')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          login(data.token, data.user)
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Erro no login:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const login = (newToken: string, userData: User) => {
    setToken(newToken)
    setUser(userData)
    
    // Salvar no localStorage
    localStorage.setItem('auth-token', newToken)
    localStorage.setItem('user-data', JSON.stringify(userData))
  }

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {})
    }

    // Não adicionar Content-Type se estiver enviando FormData
    // O browser adiciona automaticamente com o boundary correto
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    // Se receber 401, fazer logout automático
    if (response.status === 401) {
      logout()
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    return response
  }

  const logout = async () => {
    try {
      // Notificar o servidor sobre o logout
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    } finally {
      // Limpar estado local
      setToken(null)
      setUser(null)
      
      // Limpar localStorage
      localStorage.removeItem('auth-token')
      localStorage.removeItem('user-data')
      localStorage.removeItem('llm-api-keys')
    }
  }

  const value: AuthContextType = {
    user,
    token,
    login: handleLogin,
    logout,
    isLoading,
    authenticatedFetch
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

// Hook para fazer requisições autenticadas
export const useAuthenticatedFetch = () => {
  const { token, logout } = useAuth()

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    // Se receber 401, fazer logout automático
    if (response.status === 401) {
      logout()
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    return response
  }

  return authenticatedFetch
}