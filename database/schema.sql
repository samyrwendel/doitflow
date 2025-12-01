-- Schema para persistência de dados
-- Base de Conhecimento: RAGs, Transcrições e Prompts
-- Sistema de Autenticação e Gerenciamento de API Keys

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    full_name TEXT,
    is_active BOOLEAN DEFAULT 1,
    is_admin BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    login_count INTEGER DEFAULT 0
);

-- Tabela de API Keys por Usuário
CREATE TABLE IF NOT EXISTS user_api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'groq', 'openai', 'anthropic', 'deepseek', 'mistral', 'google'
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME,
    usage_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, provider)
);

-- Tabela de Sessões de Login
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de Transcrições (agora vinculada ao usuário)
CREATE TABLE IF NOT EXISTS transcriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_filename TEXT,
    file_size INTEGER,
    duration REAL,
    audio_format TEXT,
    is_audio_video BOOLEAN DEFAULT 1, -- Indica se é transcrição de áudio/vídeo (não documento)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT, -- JSON para dados adicionais como progress, chunks_count, etc.
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de Documentos RAG (agora vinculada ao usuário)
CREATE TABLE IF NOT EXISTS rag_documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    chunks TEXT NOT NULL, -- JSON array com os chunks
    transcription_id TEXT, -- FK para transcriptions
    source TEXT DEFAULT 'transcription', -- 'transcription' ou 'document'
    source_filename TEXT,
    file_type TEXT, -- '.pdf', '.txt', '.docx', '.xlsx', etc.
    file_size INTEGER,
    chunk_count INTEGER,
    character_count INTEGER,
    embedding_cost REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT, -- JSON para dados como originalLength, chunkCount, isOptimized, etc.
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE SET NULL
);

-- Tabela de Cache de Embeddings (Nova - para busca semântica)
CREATE TABLE IF NOT EXISTS embeddings_cache (
    id TEXT PRIMARY KEY,
    chunk_text TEXT NOT NULL,
    embedding BLOB NOT NULL, -- Array de floats serializado
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding_model TEXT DEFAULT 'embedding-001',
    embedding_dimensions INTEGER DEFAULT 768,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE,
    UNIQUE(document_id, chunk_index)
);

-- Tabela de Prompts Salvos (agora vinculada ao usuário)
CREATE TABLE IF NOT EXISTS saved_prompts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    rag_document_id TEXT, -- FK para rag_documents (prompt associado a um RAG específico)
    is_default BOOLEAN DEFAULT 0,
    language TEXT, -- idioma detectado (pt, en, es, fr)
    category TEXT, -- categoria do prompt (chat, rag, system, etc.)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    usage_count INTEGER DEFAULT 0, -- contador de uso
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rag_document_id) REFERENCES rag_documents(id) ON DELETE SET NULL
);

-- Tabela de Histórico de Chat (agora vinculada ao usuário)
CREATE TABLE IF NOT EXISTS chat_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL, -- ID da sessão de chat
    role TEXT NOT NULL, -- 'user' ou 'assistant'
    content TEXT NOT NULL,
    rag_document_id TEXT, -- RAG usado (se aplicável)
    prompt_id TEXT, -- Prompt usado (se aplicável)
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT, -- JSON para dados como temperature, tokens, etc.
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rag_document_id) REFERENCES rag_documents(id) ON DELETE SET NULL,
    FOREIGN KEY (prompt_id) REFERENCES saved_prompts(id) ON DELETE SET NULL
);

-- Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_rag_documents_user_id ON rag_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_created_at ON rag_documents(created_at);
CREATE INDEX IF NOT EXISTS idx_rag_documents_transcription_id ON rag_documents(transcription_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_cache_document_id ON embeddings_cache(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_cache_chunk_index ON embeddings_cache(chunk_index);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_user_id ON saved_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_created_at ON saved_prompts(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_rag_document_id ON saved_prompts(rag_document_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp);

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_user_api_keys_updated_at 
    AFTER UPDATE ON user_api_keys
    BEGIN
        UPDATE user_api_keys SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_transcriptions_updated_at 
    AFTER UPDATE ON transcriptions
    BEGIN
        UPDATE transcriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_rag_documents_updated_at 
    AFTER UPDATE ON rag_documents
    BEGIN
        UPDATE rag_documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_saved_prompts_updated_at 
    AFTER UPDATE ON saved_prompts
    BEGIN
        UPDATE saved_prompts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Tabela de Configuração do Bot WAHA
-- Tabela de Dispositivos WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    owner_jid TEXT,
    profile_name TEXT,
    profile_pic_url TEXT,
    connection_status TEXT DEFAULT 'disconnected',
    ai_agent_enabled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    connected_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS update_whatsapp_devices_updated_at 
    AFTER UPDATE ON whatsapp_devices
    BEGIN
        UPDATE whatsapp_devices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TABLE IF NOT EXISTS waha_bot_config (
    session_name TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    bot_enabled BOOLEAN DEFAULT 0,
    custom_prompt TEXT,
    use_rag BOOLEAN DEFAULT 1,
    auto_respond BOOLEAN DEFAULT 1,
    response_delay_ms INTEGER DEFAULT 2000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME,
    total_messages_received INTEGER DEFAULT 0,
    total_messages_sent INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS update_waha_bot_config_updated_at
    AFTER UPDATE ON waha_bot_config
    BEGIN
        UPDATE waha_bot_config SET updated_at = CURRENT_TIMESTAMP WHERE session_name = NEW.session_name;
    END;

-- Tabela de Conversas do Webhook (WhatsApp via n8n/Evolution)
CREATE TABLE IF NOT EXISTS webhook_conversations (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL UNIQUE,
    user_id TEXT,
    contact_name TEXT,
    contact_picture TEXT,
    phone_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabela de Mensagens do Webhook
CREATE TABLE IF NOT EXISTS webhook_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (conversation_id) REFERENCES webhook_conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webhook_conversations_client_id ON webhook_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_webhook_conversations_user_id ON webhook_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_messages_conversation_id ON webhook_messages(conversation_id);

CREATE TRIGGER IF NOT EXISTS update_webhook_conversations_updated_at
    AFTER UPDATE ON webhook_conversations
    BEGIN
        UPDATE webhook_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Tabela de Estatísticas de Uso por Usuário
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
);

CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id);

CREATE TRIGGER IF NOT EXISTS update_usage_stats_updated_at
    AFTER UPDATE ON usage_stats
    BEGIN
        UPDATE usage_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Configurações padrão do sistema
INSERT OR IGNORE INTO system_settings (key, value, description) VALUES
    ('default_language', 'pt', 'Idioma padrão do sistema'),
    ('max_transcriptions', '100', 'Máximo de transcrições armazenadas'),
    ('max_rag_documents', '50', 'Máximo de documentos RAG armazenados'),
    ('auto_cleanup_days', '30', 'Dias para limpeza automática de dados antigos'),
    ('db_version', '2.1.0', 'Versão do schema do banco de dados'),
    ('session_timeout_hours', '24', 'Tempo de expiração das sessões em horas'),
    ('require_authentication', '1', 'Requer autenticação para acessar o sistema');

-- =============================================
-- Sistema de Agendamento de Agentes (Team Management)
-- =============================================

-- Tabela de Membros da Equipe (funcionários/contatos para gerenciamento)
CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL, -- Proprietário/gestor
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL, -- Número WhatsApp (formato: 5511999999999)
    role TEXT, -- Cargo/função
    department TEXT, -- Departamento
    is_active BOOLEAN DEFAULT 1,
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT, -- JSON para dados adicionais
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_phone ON team_members(phone_number);

CREATE TRIGGER IF NOT EXISTS update_team_members_updated_at
    AFTER UPDATE ON team_members
    BEGIN
        UPDATE team_members SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Tabela de Agendamentos de Agentes
CREATE TABLE IF NOT EXISTS agent_schedules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL, -- Proprietário do agendamento
    device_id TEXT NOT NULL, -- Dispositivo WhatsApp a ser usado
    team_member_id TEXT NOT NULL, -- Membro da equipe alvo
    name TEXT NOT NULL, -- Nome do agendamento
    schedule_type TEXT NOT NULL, -- 'daily_start', 'daily_end', 'weekly', 'custom'

    -- Configuração de horário
    time_of_day TEXT NOT NULL, -- HH:MM (ex: "08:00")
    days_of_week TEXT, -- JSON array [0-6] onde 0=domingo (para weekly)
    timezone TEXT DEFAULT 'America/Sao_Paulo',

    -- Mensagens
    initial_message TEXT NOT NULL, -- Mensagem inicial a ser enviada
    followup_message TEXT, -- Mensagem de follow-up se não responder
    reminder_message TEXT, -- Mensagem de lembrete

    -- Comportamento
    wait_for_response BOOLEAN DEFAULT 1, -- Aguarda resposta
    response_timeout_minutes INTEGER DEFAULT 60, -- Tempo para considerar sem resposta
    max_followups INTEGER DEFAULT 2, -- Número máximo de follow-ups
    followup_interval_minutes INTEGER DEFAULT 30, -- Intervalo entre follow-ups

    -- RAG e IA
    use_ai_response BOOLEAN DEFAULT 1, -- Usar IA para processar resposta
    rag_document_id TEXT, -- Base de conhecimento associada
    custom_prompt TEXT, -- Prompt customizado para análise

    -- Status
    is_active BOOLEAN DEFAULT 1,
    last_triggered_at DATETIME,
    next_trigger_at DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES whatsapp_devices(id) ON DELETE CASCADE,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE,
    FOREIGN KEY (rag_document_id) REFERENCES rag_documents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_schedules_user_id ON agent_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_device_id ON agent_schedules(device_id);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_team_member_id ON agent_schedules(team_member_id);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_next_trigger ON agent_schedules(next_trigger_at);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_is_active ON agent_schedules(is_active);

CREATE TRIGGER IF NOT EXISTS update_agent_schedules_updated_at
    AFTER UPDATE ON agent_schedules
    BEGIN
        UPDATE agent_schedules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Tabela de Execuções de Agendamentos (histórico)
CREATE TABLE IF NOT EXISTS schedule_executions (
    id TEXT PRIMARY KEY,
    schedule_id TEXT NOT NULL,
    team_member_id TEXT NOT NULL,

    -- Status da execução
    status TEXT NOT NULL, -- 'pending', 'sent', 'awaiting_response', 'responded', 'no_response', 'postponed', 'completed', 'failed'

    -- Mensagens enviadas
    message_sent TEXT,
    sent_at DATETIME,

    -- Resposta recebida
    response_received TEXT,
    responded_at DATETIME,

    -- AI Analysis
    ai_analysis TEXT, -- JSON com análise da IA (atividades extraídas, sentimento, etc.)

    -- Follow-ups
    followup_count INTEGER DEFAULT 0,
    last_followup_at DATETIME,

    -- Adiamento
    postponed_to DATETIME, -- Se adiado, para quando
    postpone_reason TEXT,

    -- Metadados
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    error_message TEXT,
    metadata TEXT, -- JSON para dados adicionais

    FOREIGN KEY (schedule_id) REFERENCES agent_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedule_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_team_member_id ON schedule_executions(team_member_id);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_status ON schedule_executions(status);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_triggered_at ON schedule_executions(triggered_at);

-- Tabela de Atividades Extraídas (das respostas dos funcionários)
CREATE TABLE IF NOT EXISTS team_activities (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL, -- Execução que gerou esta atividade
    team_member_id TEXT NOT NULL,
    user_id TEXT NOT NULL,

    -- Dados da atividade
    activity_type TEXT NOT NULL, -- 'planned', 'completed', 'pending', 'blocked'
    description TEXT NOT NULL,
    priority TEXT, -- 'high', 'medium', 'low'
    category TEXT, -- Categoria da atividade

    -- Datas
    planned_date DATE,
    reported_date DATE NOT NULL,
    completed_date DATE,

    -- Status
    status TEXT DEFAULT 'reported', -- 'reported', 'in_progress', 'completed', 'cancelled'

    -- Relacionamentos
    related_activity_id TEXT, -- Para vincular atividade planejada com execução

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,

    FOREIGN KEY (execution_id) REFERENCES schedule_executions(id) ON DELETE CASCADE,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_activity_id) REFERENCES team_activities(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_team_activities_execution_id ON team_activities(execution_id);
CREATE INDEX IF NOT EXISTS idx_team_activities_team_member_id ON team_activities(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_activities_user_id ON team_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_team_activities_reported_date ON team_activities(reported_date);
CREATE INDEX IF NOT EXISTS idx_team_activities_status ON team_activities(status);

CREATE TRIGGER IF NOT EXISTS update_team_activities_updated_at
    AFTER UPDATE ON team_activities
    BEGIN
        UPDATE team_activities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Tabela de Templates de Mensagens para Agendamentos
CREATE TABLE IF NOT EXISTS schedule_message_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    template_type TEXT NOT NULL, -- 'daily_start', 'daily_end', 'followup', 'reminder'
    content TEXT NOT NULL, -- Suporta variáveis: {nome}, {data}, {hora}
    language TEXT DEFAULT 'pt',
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_user_id ON schedule_message_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_type ON schedule_message_templates(template_type);

CREATE TRIGGER IF NOT EXISTS update_schedule_templates_updated_at
    AFTER UPDATE ON schedule_message_templates
    BEGIN
        UPDATE schedule_message_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Inserir templates padrão de mensagens
INSERT OR IGNORE INTO schedule_message_templates (id, user_id, name, template_type, content, is_default) VALUES
    ('tpl_daily_start_default', 'user_cleverson_001', 'Início do Dia - Padrão', 'daily_start',
     'Bom dia, {nome}! 🌅\n\nQuais atividades você planeja realizar hoje? Por favor, liste as principais tarefas que pretende executar.', 1),
    ('tpl_daily_end_default', 'user_cleverson_001', 'Fim do Dia - Padrão', 'daily_end',
     'Boa tarde, {nome}! 🌆\n\nComo foi seu dia? Por favor, me conte:\n1. Quais atividades você conseguiu completar?\n2. Quais ficaram pendentes?\n3. Teve algum impedimento?', 1),
    ('tpl_followup_default', 'user_cleverson_001', 'Follow-up - Padrão', 'followup',
     'Olá {nome}, vi que ainda não respondeu. Quando puder, me conta sobre suas atividades. 😊', 1),
    ('tpl_reminder_default', 'user_cleverson_001', 'Lembrete - Padrão', 'reminder',
     '{nome}, só passando para lembrar de registrar suas atividades do dia. É importante para o acompanhamento da equipe! 📋', 1);

-- Inserir usuário padrão: cleverson.pompeu / 123456
-- Hash bcrypt da senha '123456': $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, is_admin) VALUES
    ('user_cleverson_001', 'cleverson.pompeu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Cleverson Pompeu', 1);