/**
 * Serviço de Autenticação
 * Gerencia login, logout, sessões e permissões de usuários
 */

import { nocodbService } from './nocodbService';

// Interfaces
export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  avatar_url?: string;
  phone?: string;
  company?: string;
}

export interface UserSession {
  id: number;
  user_id: number;
  session_token: string;
  expires_at: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  company?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  permissions?: Permission[];
}

/**
 * Classe principal do serviço de autenticação
 */
export class AuthService {
  private currentUser: User | null = null;
  private currentToken: string | null = null;
  private permissions: Permission[] = [];

  constructor() {
    this.loadStoredSession();
  }

  /**
   * Realiza login do usuário
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Buscar usuário por email
      const users = await nocodbService.findWhere<User>('users', `(email,eq,${credentials.email})`);
      
      if (users.length === 0) {
        return {
          success: false,
          message: 'Email não encontrado'
        };
      }

      const user = users[0];

      if (!user.is_active) {
        return {
          success: false,
          message: 'Usuário inativo'
        };
      }

      // Verificar senha (em produção, usar bcrypt)
      const isValidPassword = await this.verifyPassword(credentials.password, user.password_hash);
      
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Senha incorreta'
        };
      }

      // Criar sessão
      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas

      await nocodbService.create<UserSession>('user_sessions', {
        user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent
      });

      // Atualizar último login
      await nocodbService.update('users', user.id, {
        last_login: new Date().toISOString()
      });

      // Carregar permissões
      const permissions = await this.loadUserPermissions(user.id);

      // Armazenar sessão
      this.currentUser = user;
      this.currentToken = sessionToken;
      this.permissions = permissions;
      this.storeSession(user, sessionToken);

      return {
        success: true,
        user,
        token: sessionToken,
        permissions,
        message: 'Login realizado com sucesso'
      };

    } catch (error) {
      console.error('[Auth Service] Erro no login:', error);
      return {
        success: false,
        message: 'Erro interno do servidor'
      };
    }
  }

  /**
   * Registra novo usuário
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Verificar se email já existe
      const existingUsers = await nocodbService.findWhere<User>('users', `(email,eq,${data.email})`);
      
      if (existingUsers.length > 0) {
        return {
          success: false,
          message: 'Email já está em uso'
        };
      }

      // Hash da senha (em produção, usar bcrypt)
      const passwordHash = await this.hashPassword(data.password);

      // Criar usuário
      const newUser = await nocodbService.create<User>('users', {
        email: data.email,
        password_hash: passwordHash,
        name: data.name,
        phone: data.phone,
        company: data.company,
        role: 'user', // Usuário padrão
        is_active: true
      });

      // Atribuir permissões básicas
      await this.assignBasicPermissions(newUser.id);

      return {
        success: true,
        user: newUser,
        message: 'Usuário criado com sucesso'
      };

    } catch (error) {
      console.error('[Auth Service] Erro no registro:', error);
      return {
        success: false,
        message: 'Erro ao criar usuário'
      };
    }
  }

  /**
   * Realiza logout do usuário
   */
  async logout(): Promise<void> {
    try {
      if (this.currentToken) {
        try {
          // Remover sessão do banco
          const sessions = await nocodbService.findWhere<UserSession>('user_sessions', `(session_token,eq,${this.currentToken})`);
          
          if (sessions.length > 0) {
            await nocodbService.delete('user_sessions', sessions[0].id);
          }
        } catch (dbError) {
          // Log do erro mas não impede o logout local
          console.warn('[Auth Service] Erro ao remover sessão do banco (continuando logout local):', dbError);
        }
      }

      // Limpar dados locais sempre, independente do erro do banco
      this.currentUser = null;
      this.currentToken = null;
      this.permissions = [];
      this.clearStoredSession();

      console.log('[Auth Service] Logout realizado com sucesso');

    } catch (error) {
      console.error('[Auth Service] Erro no logout:', error);
      // Mesmo com erro, limpar dados locais para garantir logout
      this.currentUser = null;
      this.currentToken = null;
      this.permissions = [];
      this.clearStoredSession();
    }
  }

  /**
   * Verifica se usuário está autenticado
   */
  async isAuthenticated(): Promise<boolean> {
    if (!this.currentToken || !this.currentUser) {
      return false;
    }

    try {
      // Verificar se sessão ainda é válida
      const sessions = await nocodbService.findWhere<UserSession>('user_sessions', `(session_token,eq,${this.currentToken})`);
      
      if (sessions.length === 0) {
        this.logout();
        return false;
      }

      const session = sessions[0];
      const now = new Date();
      const expiresAt = new Date(session.expires_at);

      if (now > expiresAt) {
        this.logout();
        return false;
      }

      return true;

    } catch (error) {
      console.error('[Auth Service] Erro ao verificar autenticação:', error);
      return false;
    }
  }

  /**
   * Obtém usuário atual
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Obtém token atual
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Obtém permissões do usuário atual
   */
  getPermissions(): Permission[] {
    return this.permissions;
  }

  /**
   * Verifica se usuário tem permissão específica
   */
  hasPermission(permissionName: string): boolean {
    return this.permissions.some(p => p.name === permissionName);
  }

  /**
   * Verifica se usuário pode acessar recurso
   */
  canAccess(resource: string, action: string): boolean {
    return this.permissions.some(p => p.resource === resource && p.action === action);
  }

  /**
   * Carrega permissões do usuário
   */
  private async loadUserPermissions(userId: number): Promise<Permission[]> {
    try {
      // Buscar permissões através da tabela de relacionamento
      const userPermissions = await nocodbService.findWhere<{permission_id: number}>('user_permissions', `(user_id,eq,${userId})`);
      
      const permissions: Permission[] = [];
      
      for (const up of userPermissions) {
        const permission = await nocodbService.findById<Permission>('permissions', up.permission_id);
        if (permission) {
          permissions.push(permission);
        }
      }

      return permissions;

    } catch (error) {
      console.error('[Auth Service] Erro ao carregar permissões:', error);
      return [];
    }
  }

  /**
   * Atribui permissões básicas para novo usuário
   */
  private async assignBasicPermissions(userId: number): Promise<void> {
    try {
      const basicPermissions = ['view_messages', 'send_messages', 'view_instances'];
      
      for (const permName of basicPermissions) {
        const permissions = await nocodbService.findWhere<Permission>('permissions', `(name,eq,${permName})`);
        
        if (permissions.length > 0) {
          await nocodbService.create('user_permissions', {
            user_id: userId,
            permission_id: permissions[0].id
          });
        }
      }

    } catch (error) {
      console.error('[Auth Service] Erro ao atribuir permissões básicas:', error);
    }
  }

  /**
   * Gera token de sessão
   */
  private generateSessionToken(): string {
    return crypto.randomUUID() + '-' + Date.now().toString(36);
  }

  /**
   * Hash da senha (simplificado - em produção usar bcrypt)
   */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt_secreto');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifica senha
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }

  /**
   * Obtém IP do cliente (simplificado)
   */
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return '127.0.0.1';
    }
  }

  /**
   * Armazena sessão no localStorage
   */
  private storeSession(user: User, token: string): void {
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_token', token);
  }

  /**
   * Carrega sessão do localStorage
   */
  private loadStoredSession(): void {
    try {
      const storedUser = localStorage.getItem('auth_user');
      const storedToken = localStorage.getItem('auth_token');

      if (storedUser && storedToken) {
        this.currentUser = JSON.parse(storedUser);
        this.currentToken = storedToken;
      }
    } catch (error) {
      console.error('[Auth Service] Erro ao carregar sessão:', error);
      this.clearStoredSession();
    }
  }

  /**
   * Remove sessão do localStorage
   */
  private clearStoredSession(): void {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  }
}

// Instância singleton do serviço
export const authService = new AuthService();