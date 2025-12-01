const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../database/data.db');
    this.schemaPath = path.join(__dirname, '../database/schema.sql');
  }

  // Inicializar conexão com o banco
  async init() {
    try {
      // Criar diretório database se não existir
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Conectar ao banco SQLite
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Erro ao conectar ao SQLite:', err);
          throw err;
        }
        console.log('✅ Conectado ao banco SQLite:', this.dbPath);
      });

      // Executar schema se necessário
      await this.runSchema();
      
      return this.db;
    } catch (error) {
      console.error('Erro ao inicializar banco:', error);
      throw error;
    }
  }

  // Executar schema SQL
  async runSchema() {
    try {
      if (!fs.existsSync(this.schemaPath)) {
        console.warn('Arquivo schema.sql não encontrado, criando tabelas básicas...');
        return;
      }

      const schema = fs.readFileSync(this.schemaPath, 'utf8');

      return new Promise((resolve, reject) => {
        this.db.exec(schema, async (err) => {
          if (err) {
            console.error('Erro ao executar schema:', err);
            reject(err);
          } else {
            console.log('✅ Schema do banco executado com sucesso');
            // Executar migrações
            await this.runMigrations();
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Erro ao ler schema:', error);
      throw error;
    }
  }

  // Executar migrações para adicionar colunas que podem não existir
  async runMigrations() {
    try {
      console.log('🔄 Verificando migrações...');

      // Verificar se a tabela webhook_conversations existe e adicionar colunas se necessário
      const tableInfo = await this.all("PRAGMA table_info(webhook_conversations)");

      if (tableInfo && tableInfo.length > 0) {
        const columns = tableInfo.map(col => col.name);

        // Adicionar contact_name se não existir
        if (!columns.includes('contact_name')) {
          await this.run('ALTER TABLE webhook_conversations ADD COLUMN contact_name TEXT');
          console.log('  ✅ Coluna contact_name adicionada');
        }

        // Adicionar contact_picture se não existir
        if (!columns.includes('contact_picture')) {
          await this.run('ALTER TABLE webhook_conversations ADD COLUMN contact_picture TEXT');
          console.log('  ✅ Coluna contact_picture adicionada');
        }

        // Adicionar phone_number se não existir
        if (!columns.includes('phone_number')) {
          await this.run('ALTER TABLE webhook_conversations ADD COLUMN phone_number TEXT');
          console.log('  ✅ Coluna phone_number adicionada');
        }
      }

      // Verificar se a tabela usage_stats existe, se não, criar
      const usageStatsExists = await this.get("SELECT name FROM sqlite_master WHERE type='table' AND name='usage_stats'");
      if (!usageStatsExists) {
        console.log('  📊 Criando tabela usage_stats...');
        await this.run(`
          CREATE TABLE IF NOT EXISTS usage_stats (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            embeddings_generated INTEGER DEFAULT 0,
            total_embedding_cost REAL DEFAULT 0,
            total_llm_cost REAL DEFAULT 0,
            requests_with_semantic_search INTEGER DEFAULT 0,
            requests_with_keyword_search INTEGER DEFAULT 0,
            requests_without_rag INTEGER DEFAULT 0,
            last_reset_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id)
          )
        `);
        await this.run('CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id)');
        console.log('  ✅ Tabela usage_stats criada');
      }

      console.log('✅ Migrações concluídas');
    } catch (error) {
      console.warn('⚠️ Erro nas migrações (pode ser ignorado se as colunas já existem):', error.message);
    }
  }

  // Método genérico para executar queries
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Erro ao executar query:', sql, err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Método para buscar um registro
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Erro ao buscar registro:', sql, err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Método para buscar múltiplos registros
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Erro ao buscar registros:', sql, err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Fechar conexão
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Erro ao fechar banco:', err);
            reject(err);
          } else {
            console.log('✅ Conexão com SQLite fechada');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // CRUD para Usuários
  async createUser(data) {
    const sql = `
      INSERT INTO users (id, username, password_hash, email, full_name, is_admin)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.id,
      data.username,
      data.passwordHash,
      data.email || null,
      data.fullName || null,
      data.isAdmin ? 1 : 0
    ];
    
    return await this.run(sql, params);
  }

  async getUserByUsername(username) {
    const sql = `SELECT * FROM users WHERE username = ? AND is_active = 1`;
    return await this.get(sql, [username]);
  }

  async getUserById(id) {
    const sql = `SELECT * FROM users WHERE id = ? AND is_active = 1`;
    return await this.get(sql, [id]);
  }

  async updateUserLogin(userId) {
    const sql = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1 
      WHERE id = ?
    `;
    return await this.run(sql, [userId]);
  }

  // CRUD para Sessões
  async createSession(data) {
    const sql = `
      INSERT INTO user_sessions (id, user_id, token, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.id,
      data.userId,
      data.token,
      data.expiresAt,
      data.ipAddress || null,
      data.userAgent || null
    ];
    
    return await this.run(sql, params);
  }

  async getSessionByToken(token) {
    const sql = `
      SELECT s.*, u.username, u.full_name, u.is_admin 
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = 1
    `;
    return await this.get(sql, [token]);
  }

  async deleteSession(token) {
    const sql = `DELETE FROM user_sessions WHERE token = ?`;
    return await this.run(sql, [token]);
  }

  async cleanupExpiredSessions() {
    const sql = `DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP`;
    const result = await this.run(sql);
    console.log(`🧹 Sessões expiradas removidas: ${result.changes}`);
    return result;
  }

  // CRUD para API Keys
  async createUserApiKey(data) {
    const sql = `
      INSERT OR REPLACE INTO user_api_keys (id, user_id, provider, api_key)
      VALUES (?, ?, ?, ?)
    `;
    const params = [
      data.id,
      data.userId,
      data.provider,
      data.apiKey
    ];
    
    return await this.run(sql, params);
  }

  async getUserApiKeys(userId) {
    const sql = `
      SELECT * FROM user_api_keys 
      WHERE user_id = ? AND is_active = 1
      ORDER BY provider
    `;
    return await this.all(sql, [userId]);
  }

  async getUserApiKey(userId, provider) {
    const sql = `
      SELECT * FROM user_api_keys 
      WHERE user_id = ? AND provider = ? AND is_active = 1
    `;
    return await this.get(sql, [userId, provider]);
  }

  async updateApiKeyUsage(userId, provider) {
    const sql = `
      UPDATE user_api_keys 
      SET last_used = CURRENT_TIMESTAMP, usage_count = usage_count + 1 
      WHERE user_id = ? AND provider = ?
    `;
    return await this.run(sql, [userId, provider]);
  }

  async deleteUserApiKey(userId, provider) {
    const sql = `DELETE FROM user_api_keys WHERE user_id = ? AND provider = ?`;
    return await this.run(sql, [userId, provider]);
  }

  // CRUD para Transcrições (com usuário)
  async createTranscription(data) {
    const sql = `
      INSERT INTO transcriptions (id, user_id, title, content, source_filename, file_size, duration, audio_format, is_audio_video, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.id,
      data.userId,
      data.title,
      data.content,
      data.sourceFileName || null,
      data.fileSize || null,
      data.duration || null,
      data.audioFormat || null,
      data.isAudioVideo !== undefined ? (data.isAudioVideo ? 1 : 0) : 1, // Default true
      JSON.stringify(data.metadata || {})
    ];
    
    return await this.run(sql, params);
  }

  async getTranscriptions(userId = null) {
    let sql = `SELECT * FROM transcriptions`;
    let params = [];
    
    if (userId) {
      sql += ` WHERE user_id = ?`;
      params.push(userId);
    }
    
    sql += ` ORDER BY created_at DESC`;
    const rows = await this.all(sql, params);
    
    return rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    }));
  }

  async getTranscriptionById(id, userId = null) {
    let sql = `SELECT * FROM transcriptions WHERE id = ?`;
    let params = [id];
    
    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }
    
    const row = await this.get(sql, params);
    
    if (row) {
      row.metadata = row.metadata ? JSON.parse(row.metadata) : {};
    }
    
    return row;
  }

  // CRUD para Documentos RAG (com usuário)
  async createRAGDocument(data) {
    const sql = `
      INSERT INTO rag_documents (id, user_id, title, content, chunks, transcription_id, source_filename, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.id,
      data.userId,
      data.title,
      data.content,
      JSON.stringify(data.chunks),
      data.transcriptionId || null,
      data.sourceFileName || null,
      JSON.stringify(data.metadata || {})
    ];
    
    return await this.run(sql, params);
  }

  async getRAGDocuments(userId = null) {
    let sql = `SELECT * FROM rag_documents`;
    let params = [];
    
    if (userId) {
      sql += ` WHERE user_id = ?`;
      params.push(userId);
    }
    
    sql += ` ORDER BY created_at DESC`;
    const rows = await this.all(sql, params);
    
    return rows.map(row => ({
      ...row,
      chunks: JSON.parse(row.chunks),
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    }));
  }

  async getRAGDocumentById(id, userId = null) {
    let sql = `SELECT * FROM rag_documents WHERE id = ?`;
    let params = [id];
    
    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }
    
    const row = await this.get(sql, params);
    
    if (row) {
      row.chunks = JSON.parse(row.chunks);
      row.metadata = row.metadata ? JSON.parse(row.metadata) : {};
    }
    
    return row;
  }

  // CRUD para Prompts Salvos (com usuário)
  async createSavedPrompt(data) {
    const sql = `
      INSERT INTO saved_prompts (id, user_id, title, content, rag_document_id, is_default, language, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.id,
      data.userId,
      data.title,
      data.content,
      data.ragDocumentId || null,
      data.isDefault ? 1 : 0,
      data.language || 'pt',
      data.category || 'general'
    ];
    
    return await this.run(sql, params);
  }

  async getSavedPrompts(userId = null) {
    let sql = `SELECT * FROM saved_prompts`;
    let params = [];
    
    if (userId) {
      sql += ` WHERE user_id = ?`;
      params.push(userId);
    }
    
    sql += ` ORDER BY created_at DESC`;
    const rows = await this.all(sql, params);
    
    return rows.map(row => ({
      ...row,
      isDefault: Boolean(row.is_default)
    }));
  }

  // Buscar prompts específicos do usuário
  async getSavedPromptsByUser(userId) {
    const sql = `SELECT * FROM saved_prompts WHERE user_id = ? ORDER BY created_at DESC`;
    const rows = await this.all(sql, [userId]);
    
    return rows.map(row => ({
      ...row,
      isDefault: Boolean(row.is_default)
    }));
  }

  // CRUD para Histórico de Chat (com usuário)
  async createChatMessage(data) {
    const sql = `
      INSERT INTO chat_history (id, user_id, session_id, role, content, rag_document_id, prompt_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.id,
      data.userId,
      data.sessionId,
      data.role,
      data.content,
      data.ragDocumentId || null,
      data.promptId || null,
      JSON.stringify(data.metadata || {})
    ];
    
    return await this.run(sql, params);
  }

  async getChatHistory(sessionId, userId = null, limit = 50) {
    let sql = `
      SELECT * FROM chat_history 
      WHERE session_id = ?
    `;
    let params = [sessionId];
    
    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }
    
    sql += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(limit);
    
    const rows = await this.all(sql, params);
    
    return rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    })).reverse(); // Retornar em ordem cronológica
  }

  // Deletar transcrição (com verificação de usuário)
  async deleteTranscription(id, userId = null) {
    let sql = `DELETE FROM transcriptions WHERE id = ?`;
    let params = [id];
    
    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }
    
    const result = await this.run(sql, params);
    
    console.log(`🗑️ Transcrição deletada: ${id} (${result.changes} registro removido)`);
    return result;
  }

  // Deletar documento RAG (com verificação de usuário)
  async deleteRAGDocument(id, userId = null) {
    let sql = `DELETE FROM rag_documents WHERE id = ?`;
    let params = [id];
    
    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }
    
    const result = await this.run(sql, params);
    
    console.log(`🗑️ Documento RAG deletado: ${id} (${result.changes} registro removido)`);
    return result;
  }

  // Limpeza de dados antigos
  async cleanupOldData() {
    const daysToKeep = 30; // Configurável
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const sql = `DELETE FROM chat_history WHERE timestamp < ?`;
    const result = await this.run(sql, [cutoffDate.toISOString()]);
    
    console.log(`🧹 Limpeza automática: ${result.changes} mensagens antigas removidas`);
    return result;
  }

  // ========================================
  // MÉTODOS PARA SISTEMA MULTI-AGENTES
  // ========================================

  // === CRUD para Agentes IA ===
  
  async createAgent(data) {
    const sql = `
      INSERT INTO ai_agents (
        id, user_id, name, description, system_prompt, model, temperature, 
        max_tokens, is_active, is_default, avatar_emoji, color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.id,
      data.userId,
      data.name,
      data.description || null,
      data.systemPrompt,
      data.model || 'llama-3.1-8b-instant',
      data.temperature !== undefined ? data.temperature : 0.7,
      data.maxTokens || 1000,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      data.isDefault ? 1 : 0,
      data.avatarEmoji || '🤖',
      data.color || '#3b82f6'
    ];
    
    return await this.run(sql, params);
  }

  async getAgents(userId) {
    const sql = `
      SELECT * FROM ai_agents 
      WHERE user_id = ? 
      ORDER BY is_default DESC, name ASC
    `;
    const rows = await this.all(sql, [userId]);
    
    return rows.map(row => ({
      ...row,
      isActive: Boolean(row.is_active),
      isDefault: Boolean(row.is_default)
    }));
  }

  async getAgentById(agentId, userId = null) {
    let sql = `SELECT * FROM ai_agents WHERE id = ?`;
    let params = [agentId];
    
    if (userId) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }
    
    const row = await this.get(sql, params);
    
    if (row) {
      return {
        ...row,
        isActive: Boolean(row.is_active),
        isDefault: Boolean(row.is_default)
      };
    }
    
    return null;
  }

  async updateAgent(agentId, userId, data) {
    const updates = [];
    const params = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.systemPrompt !== undefined) {
      updates.push('system_prompt = ?');
      params.push(data.systemPrompt);
    }
    if (data.model !== undefined) {
      updates.push('model = ?');
      params.push(data.model);
    }
    if (data.temperature !== undefined) {
      updates.push('temperature = ?');
      params.push(data.temperature);
    }
    if (data.maxTokens !== undefined) {
      updates.push('max_tokens = ?');
      params.push(data.maxTokens);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }
    if (data.isDefault !== undefined) {
      updates.push('is_default = ?');
      params.push(data.isDefault ? 1 : 0);
    }
    if (data.avatarEmoji !== undefined) {
      updates.push('avatar_emoji = ?');
      params.push(data.avatarEmoji);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      params.push(data.color);
    }
    if (data.evolutionInstanceId !== undefined) {
      updates.push('evolution_instance_id = ?');
      params.push(data.evolutionInstanceId);
    }
    
    if (updates.length === 0) {
      return { changes: 0 };
    }
    
    params.push(agentId);
    params.push(userId);
    
    const sql = `
      UPDATE ai_agents 
      SET ${updates.join(', ')} 
      WHERE id = ? AND user_id = ?
    `;
    
    return await this.run(sql, params);
  }

  async deleteAgent(agentId, userId) {
    const sql = `DELETE FROM ai_agents WHERE id = ? AND user_id = ?`;
    return await this.run(sql, [agentId, userId]);
  }

  async setDefaultAgent(agentId, userId) {
    // Primeiro, remover is_default de todos os agentes do usuário
    await this.run(
      `UPDATE ai_agents SET is_default = 0 WHERE user_id = ?`,
      [userId]
    );
    
    // Depois, definir o agente especificado como padrão
    return await this.run(
      `UPDATE ai_agents SET is_default = 1 WHERE id = ? AND user_id = ?`,
      [agentId, userId]
    );
  }

  async getDefaultAgent(userId) {
    const sql = `
      SELECT * FROM ai_agents 
      WHERE user_id = ? AND is_default = 1 
      LIMIT 1
    `;
    const row = await this.get(sql, [userId]);
    
    if (row) {
      return {
        ...row,
        isActive: Boolean(row.is_active),
        isDefault: Boolean(row.is_default)
      };
    }
    
    return null;
  }

  // === CRUD para Sessões de Chat por Agente ===
  
  async createAgentSession(data) {
    const sql = `
      INSERT INTO agent_chat_sessions (
        id, agent_id, user_id, session_name, is_active
      ) VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      data.id,
      data.agentId,
      data.userId,
      data.sessionName || null,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1
    ];
    
    return await this.run(sql, params);
  }

  async getAgentSessions(agentId, userId) {
    const sql = `
      SELECT * FROM agent_chat_sessions 
      WHERE agent_id = ? AND user_id = ? AND is_active = 1
      ORDER BY last_message_at DESC, created_at DESC
    `;
    return await this.all(sql, [agentId, userId]);
  }

  async getAgentSessionById(sessionId) {
    const sql = `SELECT * FROM agent_chat_sessions WHERE id = ?`;
    return await this.get(sql, [sessionId]);
  }

  async updateAgentSession(sessionId, data) {
    const updates = [];
    const params = [];
    
    if (data.sessionName !== undefined) {
      updates.push('session_name = ?');
      params.push(data.sessionName);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return { changes: 0 };
    }
    
    params.push(sessionId);
    
    const sql = `
      UPDATE agent_chat_sessions 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `;
    
    return await this.run(sql, params);
  }

  async deleteAgentSession(sessionId) {
    const sql = `DELETE FROM agent_chat_sessions WHERE id = ?`;
    return await this.run(sql, [sessionId]);
  }

  // === CRUD para Mensagens de Agentes ===
  
  async createAgentMessage(data) {
    const sql = `
      INSERT INTO agent_messages (
        id, session_id, agent_id, user_id, role, content, rag_document_ids, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.id,
      data.sessionId,
      data.agentId,
      data.userId,
      data.role,
      data.content,
      data.ragDocumentIds ? JSON.stringify(data.ragDocumentIds) : null,
      data.metadata ? JSON.stringify(data.metadata) : null
    ];
    
    return await this.run(sql, params);
  }

  async getAgentMessages(sessionId, limit = 50) {
    const sql = `
      SELECT * FROM agent_messages 
      WHERE session_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    const rows = await this.all(sql, [sessionId, limit]);
    
    return rows.map(row => ({
      ...row,
      ragDocumentIds: row.rag_document_ids ? JSON.parse(row.rag_document_ids) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    })).reverse(); // Ordem cronológica
  }

  async getAgentConversationHistory(agentId, userId, limit = 100) {
    const sql = `
      SELECT am.*, acs.session_name
      FROM agent_messages am
      JOIN agent_chat_sessions acs ON am.session_id = acs.id
      WHERE am.agent_id = ? AND am.user_id = ?
      ORDER BY am.created_at DESC
      LIMIT ?
    `;
    const rows = await this.all(sql, [agentId, userId, limit]);

    return rows.map(row => ({
      ...row,
      ragDocumentIds: row.rag_document_ids ? JSON.parse(row.rag_document_ids) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));
  }

  async deleteAgentMessages(agentId, userId, sessionId = null) {
    // Se sessionId for fornecido, deleta apenas da sessão específica
    // Senão, deleta todas as mensagens do agente para o usuário
    if (sessionId) {
      const sql = `DELETE FROM agent_messages WHERE session_id = ? AND agent_id = ? AND user_id = ?`;
      const result = await this.run(sql, [sessionId, agentId, userId]);
      return { deleted: result.changes || 0 };
    } else {
      const sql = `DELETE FROM agent_messages WHERE agent_id = ? AND user_id = ?`;
      const result = await this.run(sql, [agentId, userId]);
      return { deleted: result.changes || 0 };
    }
  }

  async deleteAllUserMessages(userId) {
    const sql = `DELETE FROM agent_messages WHERE user_id = ?`;
    const result = await this.run(sql, [userId]);
    return { deleted: result.changes || 0 };
  }

  // === Acesso de Agentes aos RAGs ===
  
  async grantAgentRagAccess(agentId, ragDocumentId, priority = 1) {
    const sql = `
      INSERT OR REPLACE INTO agent_rag_access (
        id, agent_id, rag_document_id, priority
      ) VALUES (?, ?, ?, ?)
    `;
    const id = `access_${agentId}_${ragDocumentId}`;
    return await this.run(sql, [id, agentId, ragDocumentId, priority]);
  }

  async revokeAgentRagAccess(agentId, ragDocumentId) {
    const sql = `
      DELETE FROM agent_rag_access 
      WHERE agent_id = ? AND rag_document_id = ?
    `;
    return await this.run(sql, [agentId, ragDocumentId]);
  }

  async getAgentRagAccess(agentId) {
    const sql = `
      SELECT ara.*, rd.title, rd.chunks, rd.content
      FROM agent_rag_access ara
      JOIN rag_documents rd ON ara.rag_document_id = rd.id
      WHERE ara.agent_id = ?
      ORDER BY ara.priority DESC
    `;
    const rows = await this.all(sql, [agentId]);
    
    return rows.map(row => ({
      ...row,
      chunks: row.chunks ? JSON.parse(row.chunks) : []
    }));
  }

  // === Estatísticas de Agentes ===
  
  async updateAgentStatistics(agentId, userId, stats) {
    const today = new Date().toISOString().split('T')[0];
    
    // Tentar buscar estatísticas de hoje
    const existing = await this.get(
      `SELECT * FROM agent_statistics WHERE agent_id = ? AND date = ?`,
      [agentId, today]
    );
    
    if (existing) {
      // Atualizar existente
      const sql = `
        UPDATE agent_statistics 
        SET total_messages = total_messages + ?,
            total_tokens = total_tokens + ?,
            total_cost = total_cost + ?,
            average_response_time = ((average_response_time * total_messages) + ?) / (total_messages + 1),
            rag_queries = rag_queries + ?,
            semantic_searches = semantic_searches + ?
        WHERE agent_id = ? AND date = ?
      `;
      return await this.run(sql, [
        stats.messages || 0,
        stats.tokens || 0,
        stats.cost || 0,
        stats.responseTime || 0,
        stats.ragQueries || 0,
        stats.semanticSearches || 0,
        agentId,
        today
      ]);
    } else {
      // Criar novo
      const sql = `
        INSERT INTO agent_statistics (
          id, agent_id, user_id, date, total_messages, total_tokens, total_cost,
          average_response_time, rag_queries, semantic_searches
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const id = `stats_${agentId}_${today}`;
      return await this.run(sql, [
        id,
        agentId,
        userId,
        today,
        stats.messages || 0,
        stats.tokens || 0,
        stats.cost || 0,
        stats.responseTime || 0,
        stats.ragQueries || 0,
        stats.semanticSearches || 0
      ]);
    }
  }

  async getAgentStatistics(agentId, days = 30) {
    const sql = `
      SELECT * FROM agent_statistics 
      WHERE agent_id = ? 
      ORDER BY date DESC 
      LIMIT ?
    `;
    return await this.all(sql, [agentId, days]);
  }

  // Executar migração de multi-agentes
  async runMultiAgentsMigration() {
    try {
      const migrationPath = path.join(__dirname, 'migrations', '001_multi_agents.sql');
      
      if (!fs.existsSync(migrationPath)) {
        console.warn('⚠️ Arquivo de migração multi-agentes não encontrado');
        return false;
      }

      const migration = fs.readFileSync(migrationPath, 'utf8');
      
      return new Promise((resolve, reject) => {
        this.db.exec(migration, (err) => {
          if (err) {
            console.error('❌ Erro ao executar migração multi-agentes:', err);
            reject(err);
          } else {
            console.log('✅ Migração multi-agentes executada com sucesso');
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('❌ Erro ao ler migração:', error);
      return false;
    }
  }

  // ========================================
  // MÉTODOS PARA FERRAMENTAS DE AGENTES
  // ========================================

  // Executar migração de ferramentas
  async runAgentToolsMigration() {
    try {
      const migrationPath = path.join(__dirname, 'migrations', '002_agent_tools.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      
      // Remover comandos de transação - vamos gerenciar manualmente
      const cleanSQL = migrationSQL
        .replace(/BEGIN\s+TRANSACTION;?/gi, '')
        .replace(/END;?/gi, '')
        .replace(/COMMIT;?/gi, '');
      
      const statements = cleanSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          await this.run(statement);
        } catch (error) {
          // Ignorar erros de tabelas/índices já existentes
          if (!error.message.includes('already exists')) {
            console.error('❌ Erro na migração de ferramentas:', error.message);
          }
        }
      }
      
      console.log('✅ Migração de ferramentas executada com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao executar migração de ferramentas:', error);
      return false;
    }
  }

  // === Evolution API Instances ===
  
  async createEvolutionInstance(data) {
    const sql = `
      INSERT INTO evolution_instances (
        id, user_id, name, instance_id, base_url, api_key, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.id,
      data.userId,
      data.name,
      data.instanceId,
      data.baseUrl,
      data.apiKey,
      data.isDefault ? 1 : 0
    ];
    return await this.run(sql, params);
  }

  async getEvolutionInstances(userId) {
    const sql = `SELECT * FROM evolution_instances WHERE user_id = ? ORDER BY is_default DESC, name ASC`;
    return await this.all(sql, [userId]);
  }

  async getEvolutionInstanceById(id) {
    const sql = `SELECT * FROM evolution_instances WHERE id = ?`;
    return await this.get(sql, [id]);
  }

  async updateEvolutionInstance(id, data) {
    const updates = [];
    const params = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.instanceId !== undefined) {
      updates.push('instance_id = ?');
      params.push(data.instanceId);
    }
    if (data.baseUrl !== undefined) {
      updates.push('base_url = ?');
      params.push(data.baseUrl);
    }
    if (data.apiKey !== undefined) {
      updates.push('api_key = ?');
      params.push(data.apiKey);
    }
    if (data.isDefault !== undefined) {
      updates.push('is_default = ?');
      params.push(data.isDefault ? 1 : 0);
    }
    
    if (updates.length === 0) return { changes: 0 };
    
    params.push(id);
    const sql = `UPDATE evolution_instances SET ${updates.join(', ')} WHERE id = ?`;
    return await this.run(sql, params);
  }

  async deleteEvolutionInstance(id) {
    const sql = `DELETE FROM evolution_instances WHERE id = ?`;
    return await this.run(sql, [id]);
  }

  // === Agent Tools ===

  async getAvailableTools() {
    const sql = `SELECT * FROM agent_tools WHERE is_active = 1 ORDER BY category, display_name`;
    return await this.all(sql);
  }

  async getAgentTools(agentId) {
    const sql = `
      SELECT t.*, ata.is_enabled, ata.config as agent_config
      FROM agent_tools t
      LEFT JOIN agent_tool_access ata ON t.id = ata.tool_id AND ata.agent_id = ?
      WHERE t.is_active = 1
      ORDER BY t.category, t.display_name
    `;
    return await this.all(sql, [agentId]);
  }

  async enableAgentTool(agentId, toolId, config = null) {
    const sql = `
      INSERT INTO agent_tool_access (agent_id, tool_id, is_enabled, config)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(agent_id, tool_id) DO UPDATE SET
        is_enabled = 1,
        config = excluded.config
    `;
    return await this.run(sql, [agentId, toolId, config ? JSON.stringify(config) : null]);
  }

  async disableAgentTool(agentId, toolId) {
    const sql = `
      UPDATE agent_tool_access 
      SET is_enabled = 0 
      WHERE agent_id = ? AND tool_id = ?
    `;
    return await this.run(sql, [agentId, toolId]);
  }

  async logToolUsage(data) {
    const sql = `
      INSERT INTO agent_tool_usage (
        agent_id, tool_id, session_id, action, parameters, 
        response, status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.agentId,
      data.toolId,
      data.sessionId || null,
      data.action,
      data.parameters ? JSON.stringify(data.parameters) : null,
      data.response ? JSON.stringify(data.response) : null,
      data.status || 'pending',
      data.errorMessage || null
    ];
    return await this.run(sql, params);
  }

  async getAgentToolUsage(agentId, limit = 50) {
    const sql = `
      SELECT atu.*, at.display_name as tool_name
      FROM agent_tool_usage atu
      JOIN agent_tools at ON atu.tool_id = at.id
      WHERE atu.agent_id = ?
      ORDER BY atu.created_at DESC
      LIMIT ?
    `;
    return await this.all(sql, [agentId, limit]);
  }
}

// Singleton para garantir uma única instância
let database = null;

const getDatabase = async () => {
  if (!database) {
    database = new Database();
    await database.init();
    
    // Executar migração de multi-agentes
    try {
      await database.runMultiAgentsMigration();
    } catch (err) {
      console.warn('⚠️ Migração multi-agentes já executada ou erro:', err.message);
    }
    
    // Executar migração de ferramentas
    try {
      await database.runAgentToolsMigration();
    } catch (err) {
      console.warn('⚠️ Migração de ferramentas já executada ou erro:', err.message);
    }
  }
  return database;
};

module.exports = { Database, getDatabase };