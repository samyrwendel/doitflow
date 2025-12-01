/**
 * Serviço para gerenciar sessões de usuário
 */

import { nocodbService } from './nocodbService';

export interface SessionData {
  id: number;
  user_id: number;
  token: string;
  ip_address: string;
  user_agent: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateSessionData {
  user_id: number;
  token: string;
  ip_address: string;
  user_agent: string;
  expires_at: string;
}

export interface SessionInfo {
  id: number;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
  is_current: boolean;
  is_active: boolean;
}

class SessionService {
  private readonly tableName = 'user_sessions';

  /**
   * Cria uma nova sessão
   */
  async createSession(sessionData: CreateSessionData): Promise<SessionData | null> {
    try {
      const response = await nocodbService.create<SessionData>(this.tableName, {
        ...sessionData,
        is_active: true
      });

      return response;
    } catch (error) {
      console.error('[SessionService] Erro ao criar sessão:', error);
      return null;
    }
  }

  /**
   * Busca sessão por token
   */
  async getSessionByToken(token: string): Promise<SessionData | null> {
    try {
      const sessions = await nocodbService.findWhere<SessionData>(
        this.tableName, 
        `(token,eq,${token})~and(is_active,eq,true)`
      );

      if (sessions && sessions.length > 0) {
        return sessions[0];
      }

      return null;
    } catch (error) {
      console.error('[SessionService] Erro ao buscar sessão por token:', error);
      return null;
    }
  }

  /**
   * Valida se uma sessão é válida
   */
  async validateSession(token: string): Promise<boolean> {
    try {
      const session = await this.getSessionByToken(token);
      
      if (!session || !session.is_active) {
        return false;
      }

      // Verificar se a sessão não expirou
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      
      if (now > expiresAt) {
        // Sessão expirada, desativar
        await this.deactivateSession(session.id);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[SessionService] Erro ao validar sessão:', error);
      return false;
    }
  }

  /**
   * Atualiza o tempo de expiração de uma sessão
   */
  async refreshSession(token: string, newExpiresAt: string): Promise<boolean> {
    try {
      const session = await this.getSessionByToken(token);
      
      if (!session) {
        return false;
      }

      await nocodbService.update(this.tableName, session.id, {
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('[SessionService] Erro ao atualizar sessão:', error);
      return false;
    }
  }

  /**
   * Desativa uma sessão específica
   */
  async deactivateSession(sessionId: number): Promise<boolean> {
    try {
      await nocodbService.update(this.tableName, sessionId, {
        is_active: false,
        updated_at: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('[SessionService] Erro ao desativar sessão:', error);
      return false;
    }
  }

  /**
   * Desativa sessão por token
   */
  async deactivateSessionByToken(token: string): Promise<boolean> {
    try {
      const session = await this.getSessionByToken(token);
      
      if (!session) {
        return false;
      }

      return await this.deactivateSession(session.id);
    } catch (error) {
      console.error('[SessionService] Erro ao desativar sessão por token:', error);
      return false;
    }
  }

  /**
   * Desativa todas as sessões de um usuário
   */
  async deactivateAllUserSessions(userId: number): Promise<boolean> {
    try {
      const sessions = await nocodbService.findWhere<SessionData>(
        this.tableName, 
        `(user_id,eq,${userId})~and(is_active,eq,true)`
      );

      if (!sessions || sessions.length === 0) {
        return true; // Não há sessões ativas
      }
      
      for (const session of sessions) {
        await this.deactivateSession(session.id);
      }

      return true;
    } catch (error) {
      console.error('[SessionService] Erro ao desativar todas as sessões do usuário:', error);
      return false;
    }
  }

  /**
   * Lista sessões ativas de um usuário
   */
  async getUserActiveSessions(userId: number, currentToken?: string): Promise<SessionInfo[]> {
    try {
      const sessions = await nocodbService.findWhere<SessionData>(
        this.tableName, 
        `(user_id,eq,${userId})~and(is_active,eq,true)`
      );

      if (!sessions || sessions.length === 0) {
        return [];
      }
      
      return sessions.map(session => ({
        id: session.id,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        created_at: session.created_at,
        expires_at: session.expires_at,
        is_current: session.token === currentToken,
        is_active: session.is_active
      }));
    } catch (error) {
      console.error('[SessionService] Erro ao listar sessões do usuário:', error);
      return [];
    }
  }

  /**
   * Remove sessões expiradas
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date().toISOString();
      
      // Buscar sessões ativas
      const sessions = await nocodbService.findWhere<SessionData>(
        this.tableName, 
        `(is_active,eq,true)`
      );

      if (!sessions || sessions.length === 0) {
        return 0;
      }

      let cleanedCount = 0;

      for (const session of sessions) {
        if (new Date(session.expires_at) < new Date(now)) {
          await this.deactivateSession(session.id);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('[SessionService] Erro ao limpar sessões expiradas:', error);
      return 0;
    }
  }

  /**
   * Gera um token de sessão único
   */
  generateSessionToken(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    const extra = Math.random().toString(36).substring(2);
    
    return `${timestamp}_${random}_${extra}`;
  }

  /**
   * Calcula data de expiração da sessão
   */
  calculateExpirationDate(hours: number = 24): string {
    const now = new Date();
    now.setHours(now.getHours() + hours);
    return now.toISOString();
  }

  /**
   * Obtém informações do cliente
   */
  getClientInfo(): { ip: string; userAgent: string } {
    // Em ambiente de desenvolvimento, usar valores padrão
    const ip = '127.0.0.1'; // Em produção, obter do request
    const userAgent = navigator.userAgent || 'Unknown';
    
    return { ip, userAgent };
  }
}

export const sessionService = new SessionService();