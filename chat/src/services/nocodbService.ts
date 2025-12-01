interface NocoDBConfig {
  server: string;
  projectId: string;
  token: string;
}

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  session_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface LogEntry {
  id?: string;
  level: 'info' | 'warn' | 'error' | 'success';
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
  details?: string;
}

interface BacklogItem {
  id?: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at?: string;
}

class NocoDBService {
  private config: NocoDBConfig;
  private baseUrl: string;
  // Table IDs from NocoDB
  private tableIds = {
    chat_messages: 'm4h0lrwoknoggo9',
    log_entries: 'mauu7kukmkdceqv',
    backlog_items: 'ma5926lg94aepfg',
    users: 'm8pfz3olldo1aa4',
    user_sessions: 'mkjtcedk8odkyah'
  };

  constructor() {
    this.config = {
      server: import.meta.env.VITE_NOCODB_SERVER || '',
      projectId: import.meta.env.VITE_NOCODB_PROJECT_ID || '',
      token: import.meta.env.VITE_NOCODB_TOKEN || ''
    };
    // URL base correta para API v1 do NocoDB incluindo project_id
    this.baseUrl = `${this.config.server}api/v1/db/data/noco/${this.config.projectId}`;
  }

  private getTableId(tableName: string): string {
    return this.tableIds[tableName as keyof typeof this.tableIds] || tableName;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    // Verificar se as configurações estão definidas
    if (!this.config.server || !this.config.token || !this.config.projectId) {
      throw new Error('Configurações do NocoDB não estão completas');
    }
    
    // URL simples para API v2 do NocoDB
    const url = `${this.baseUrl}/${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'xc-token': this.config.token,
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`NocoDB HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('NocoDB request failed:', error);
      throw error;
    }
  }

  // Chat Messages
  async saveChatMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const tableId = this.getTableId('chat_messages');
    
    // Mapear campos da interface para a estrutura da tabela NocoDB usando nomes corretos das colunas
    const messageForDB = {
      'Session ID': message.session_id || 'default-session',
      'Message': message.content || '', // content -> Message
      'Sender': message.role || 'user', // role -> Sender
      'Timestamp': message.timestamp || new Date().toISOString(),
      'Metadata': {
        role: message.role,
        content: message.content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
    
    try {
      const data = await this.makeRequest(tableId, {
        method: 'POST',
        body: JSON.stringify(messageForDB)
      });
      // Mapear resposta de volta para a interface ChatMessage
      return {
        id: data.id,
        role: data.sender,
        content: data.message,
        timestamp: data.timestamp,
        session_id: data.session_id
      };
    } catch (error) {
      console.error('Erro ao salvar mensagem no NocoDB:', error);
      // Retornar mensagem com ID local se falhar
      return {
        ...message,
        id: Date.now().toString()
      };
    }
  }

  async getChatMessages(sessionId?: string): Promise<ChatMessage[]> {
    const tableId = this.getTableId('chat_messages');
    let endpoint = tableId;
    if (sessionId) {
      // Usar formato correto de filtro para API v1 do NocoDB com nome correto da coluna
      endpoint += `?where=(Session ID,eq,${encodeURIComponent(sessionId)})`;
    }
    const data = await this.makeRequest(endpoint);
    const messages = Array.isArray(data?.list) ? data.list : [];
    // Mapear campos da tabela para a interface ChatMessage usando nomes corretos das colunas
    return messages.map((msg: any) => ({
      id: msg.ID,
      role: msg.Sender,
      content: msg.Message,
      timestamp: msg.Timestamp,
      session_id: msg['Session ID']
    }));
  }

  async deleteChatMessage(id: string): Promise<void> {
    const tableId = this.getTableId('chat_messages');
    await this.makeRequest(`${tableId}/${id}`, {
      method: 'DELETE'
    });
  }

  // Log Entries
  async saveLogEntry(log: Omit<LogEntry, 'id'>): Promise<LogEntry> {
    const tableId = this.getTableId('log_entries');
    const data = await this.makeRequest(tableId, {
      method: 'POST',
      body: JSON.stringify(log)
    });
    return data;
  }

  async getLogEntries(level?: string): Promise<LogEntry[]> {
    const tableId = this.getTableId('log_entries');
    let endpoint = `${tableId}?sort=-timestamp`;
    if (level) {
      // Usar formato correto de filtro para API v1 do NocoDB
      endpoint += `&where=(level,eq,${encodeURIComponent(level)})`;
    }
    const data = await this.makeRequest(endpoint);
    return Array.isArray(data?.list) ? data.list : [];
  }

  async clearLogs(): Promise<void> {
    // Get all log IDs first
    const logs = await this.getLogEntries();
    const tableId = this.getTableId('log_entries');
    for (const log of logs) {
      if (log.id) {
        await this.makeRequest(`${tableId}/${log.id}`, {
          method: 'DELETE'
        });
      }
    }
  }

  // Backlog Items
  async saveBacklogItem(item: Omit<BacklogItem, 'id'>): Promise<BacklogItem> {
    const tableId = this.getTableId('backlog_items');
    const data = await this.makeRequest(tableId, {
      method: 'POST',
      body: JSON.stringify(item)
    });
    return data;
  }

  async getBacklogItems(): Promise<BacklogItem[]> {
    const tableId = this.getTableId('backlog_items');
    const data = await this.makeRequest(`${tableId}?sort=-created_at`);
    return Array.isArray(data?.list) ? data.list : [];
  }

  async updateBacklogItem(id: string, updates: Partial<BacklogItem>): Promise<BacklogItem> {
    const tableId = this.getTableId('backlog_items');
    const data = await this.makeRequest(`${tableId}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString()
      })
    });
    return data;
  }

  async deleteBacklogItem(id: string): Promise<void> {
    const tableId = this.getTableId('backlog_items');
    await this.makeRequest(`${tableId}/${id}`, {
      method: 'DELETE'
    });
  }

  // Generic CRUD methods for auth service
  async findWhere<T>(tableName: string, whereClause: string): Promise<T[]> {
    try {
      // Para API v1 do NocoDB, usar sintaxe de filtro correta
      const tableId = this.getTableId(tableName);
      // Verificar se whereClause já tem parênteses, se não, adicionar
      const formattedWhere = whereClause.startsWith('(') ? whereClause : `(${whereClause})`;
      const endpoint = `${tableId}?where=${encodeURIComponent(formattedWhere)}`;
      const data = await this.makeRequest(endpoint);
      return Array.isArray(data?.list) ? data.list : [];
    } catch (error) {
      console.error(`Error finding records in ${tableName}:`, error);
      return [];
    }
  }

  async create<T>(tableName: string, data: Partial<T>): Promise<T> {
    const tableId = this.getTableId(tableName);
    const result = await this.makeRequest(`${tableId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return result;
  }

  async update<T>(tableName: string, id: string | number, data: Partial<T>): Promise<T> {
    const tableId = this.getTableId(tableName);
    const result = await this.makeRequest(`${tableId}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    return result;
  }

  async delete(tableName: string, id: string | number): Promise<void> {
    const tableId = this.getTableId(tableName);
    await this.makeRequest(`${tableId}/${id}`, {
      method: 'DELETE'
    });
  }

  async findById<T>(tableName: string, id: string | number): Promise<T | null> {
    try {
      const tableId = this.getTableId(tableName);
      const result = await this.makeRequest(`${tableId}/${id}`);
      return result;
    } catch (error) {
      console.error(`Error finding record by ID in ${tableName}:`, error);
      return null;
    }
  }

  async getProjectInfo(): Promise<any> {
    try {
      const result = await this.makeRequest('info');
      return result;
    } catch (error) {
      console.error('Error getting project info:', error);
      return null;
    }
  }

  async getTables(): Promise<any[]> {
    try {
      const result = await this.makeRequest('');
      return Array.isArray(result?.list) ? result.list : [];
    } catch (error) {
      console.error('Error getting tables:', error);
      return [];
    }
  }

  // Utility methods
  async testConnection(): Promise<boolean> {
    try {
      const tableId = this.getTableId('chat_messages');
      await this.makeRequest(`${tableId}?limit=1`);
      return true;
    } catch (error) {
      console.error('NocoDB connection test failed:', error);
      return false;
    }
  }
}

export const nocodbService = new NocoDBService();
export type { ChatMessage, LogEntry, BacklogItem };