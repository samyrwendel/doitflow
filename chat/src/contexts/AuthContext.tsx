/**
 * Contexto de autenticação para gerenciar estado global
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, User, Permission } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: Permission[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  /**
   * Atualiza o estado de autenticação
   */
  const refreshAuth = async () => {
    try {
      setIsLoading(true);
      
      const isAuth = await authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();
      const userPermissions = authService.getPermissions();

      setUser(currentUser);
      setIsAuthenticated(isAuth);
      setPermissions(userPermissions);

    } catch (error) {
      console.error('[AuthContext] Erro ao atualizar autenticação:', error);
      setUser(null);
      setIsAuthenticated(false);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Realiza login
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login({ email, password });
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        setPermissions(response.permissions || []);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[AuthContext] Erro no login:', error);
      return false;
    }
  };

  /**
   * Realiza logout
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('[AuthContext] Erro no logout:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setPermissions([]);
      
      // Limpar eventos do sessionStorage ao fazer logout
      sessionStorage.removeItem('tupperware-events');
    }
  };

  // Verificar autenticação na inicialização
  useEffect(() => {
    refreshAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    permissions,
    login,
    logout,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para usar o contexto de autenticação
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuthContext deve ser usado dentro de um AuthProvider');
  }
  
  return context;
}