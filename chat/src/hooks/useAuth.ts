/**
 * Hook para gerenciar autenticação
 * Fornece estado e métodos de autenticação para componentes React
 */

import { useState, useEffect, useCallback } from 'react';
import { authService, User, Permission, LoginCredentials, RegisterData, AuthResponse } from '../services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoginLoading: boolean;
  permissions: Permission[];
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAccess: (resource: string, action: string) => boolean;
}

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isLoginLoading: false,
    permissions: []
  });

  /**
   * Verifica autenticação atual
   */
  const checkAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const isAuth = await authService.isAuthenticated();
      const user = authService.getCurrentUser();
      const permissions = authService.getPermissions();

      setState({
        user,
        isAuthenticated: isAuth,
        isLoading: false,
        isLoginLoading: false,
        permissions
      });

    } catch (error) {
      console.error('[useAuth] Erro ao verificar autenticação:', error);
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        permissions: []
      }));
    }
  }, []);

  /**
   * Realiza login
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      setState(prev => ({ ...prev, isLoginLoading: true }));
      
      const response = await authService.login(credentials);
      
      if (response.success && response.user) {
        setState(prev => ({
          ...prev,
          user: response.user || null,
          isAuthenticated: true,
          isLoading: false,
          isLoginLoading: false,
          permissions: response.permissions || []
        }));
      } else {
        setState(prev => ({ ...prev, isLoginLoading: false }));
      }

      return response;

    } catch (error) {
      console.error('[useAuth] Erro no login:', error);
      setState(prev => ({ ...prev, isLoginLoading: false }));
      
      return {
        success: false,
        message: 'Erro interno do sistema'
      };
    }
  }, []);

  /**
   * Realiza logout
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('[useAuth] Erro no logout:', error);
    } finally {
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        permissions: []
      }));
    }
  }, []);

  /**
   * Registra novo usuário
   */
  const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authService.register(data);
      
      setState(prev => ({ ...prev, isLoading: false }));
      
      return response;

    } catch (error) {
      console.error('[useAuth] Erro no registro:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      
      return {
        success: false,
        message: 'Erro interno do sistema'
      };
    }
  }, []);

  /**
   * Verifica se usuário tem permissão específica
   */
  const hasPermission = useCallback((permission: string): boolean => {
    return authService.hasPermission(permission);
  }, [state.permissions]);

  /**
   * Verifica se usuário pode acessar recurso
   */
  const canAccess = useCallback((resource: string, action: string): boolean => {
    return authService.canAccess(resource, action);
  }, [state.permissions]);

  // Verificar autenticação na inicialização
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    login,
    register,
    logout,
    checkAuth,
    hasPermission,
    canAccess
  };
}