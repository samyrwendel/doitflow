-- Migração: Sistema Multi-Agentes
-- Data: 2025-11-25
-- Descrição: Permite múltiplos agentes IA com prompts e contextos separados

-- Tabela de Agentes IA
CREATE TABLE IF NOT EXISTS ai_agents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL, -- Nome do agente (ex: "Suporte Técnico", "Vendas", "Atendimento")
    description TEXT, -- Descrição do agente
    system_prompt TEXT NOT NULL, -- Prompt personalizado do agente
    model TEXT DEFAULT 'llama-3.1-8b-instant', -- Modelo LLM a usar
    temperature REAL DEFAULT 0.7, -- Temperature do modelo
    max_tokens INTEGER DEFAULT 1000, -- Máximo de tokens
    is_active BOOLEAN DEFAULT 1, -- Agente ativo/inativo
    is_default BOOLEAN DEFAULT 0, -- Agente padrão do usuário
    avatar_emoji TEXT DEFAULT '🤖', -- Emoji representando o agente
    color TEXT DEFAULT '#3b82f6', -- Cor do agente na interface
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    usage_count INTEGER DEFAULT 0, -- Quantas vezes foi usado
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de Sessões de Chat por Agente
-- Cada agente mantém seus próprios contextos de conversa
CREATE TABLE IF NOT EXISTS agent_chat_sessions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    session_name TEXT, -- Nome opcional da sessão (ex: "Conversa sobre preços")
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME,
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1, -- Sessão ativa
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de Histórico de Mensagens por Agente
-- Substitui chat_history para suportar multi-agentes
CREATE TABLE IF NOT EXISTS agent_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user' ou 'assistant'
    content TEXT NOT NULL,
    rag_document_ids TEXT, -- JSON array com IDs dos RAGs usados (compartilhados)
    metadata TEXT, -- JSON: tokens, custo, similaridade, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES agent_chat_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de Relacionamento: Agente <-> RAG Documents
-- Define quais RAGs cada agente tem acesso (pode ser todos ou específicos)
CREATE TABLE IF NOT EXISTS agent_rag_access (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    rag_document_id TEXT NOT NULL,
    access_level TEXT DEFAULT 'read', -- 'read', 'write' (futuro)
    priority INTEGER DEFAULT 1, -- Prioridade deste RAG para o agente (1-10)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE,
    FOREIGN KEY (rag_document_id) REFERENCES rag_documents(id) ON DELETE CASCADE,
    UNIQUE(agent_id, rag_document_id)
);

-- Tabela de Estatísticas por Agente
CREATE TABLE IF NOT EXISTS agent_statistics (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    date DATE DEFAULT (DATE('now')),
    total_messages INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    average_response_time REAL DEFAULT 0, -- em segundos
    rag_queries INTEGER DEFAULT 0, -- Quantas vezes usou RAG
    semantic_searches INTEGER DEFAULT 0, -- Buscas semânticas realizadas
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(agent_id, date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_agents_user_id ON ai_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_is_active ON ai_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_agents_is_default ON ai_agents(is_default);
CREATE INDEX IF NOT EXISTS idx_agent_chat_sessions_agent_id ON agent_chat_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_chat_sessions_user_id ON agent_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_chat_sessions_is_active ON agent_chat_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_messages_session_id ON agent_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_agent_id ON agent_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_user_id ON agent_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON agent_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_rag_access_agent_id ON agent_rag_access(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_rag_access_rag_document_id ON agent_rag_access(rag_document_id);
CREATE INDEX IF NOT EXISTS idx_agent_statistics_agent_id ON agent_statistics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_statistics_date ON agent_statistics(date);

-- Triggers para atualizar timestamps
CREATE TRIGGER IF NOT EXISTS update_ai_agents_updated_at 
    AFTER UPDATE ON ai_agents
    BEGIN
        UPDATE ai_agents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_agent_chat_sessions_updated_at 
    AFTER UPDATE ON agent_chat_sessions
    BEGIN
        UPDATE agent_chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Trigger para atualizar last_used_at do agente quando ele é usado
CREATE TRIGGER IF NOT EXISTS update_agent_last_used
    AFTER INSERT ON agent_messages
    WHEN NEW.role = 'assistant'
    BEGIN
        UPDATE ai_agents 
        SET last_used_at = CURRENT_TIMESTAMP, 
            usage_count = usage_count + 1 
        WHERE id = NEW.agent_id;
    END;

-- Trigger para atualizar contadores de sessão
CREATE TRIGGER IF NOT EXISTS update_session_counters
    AFTER INSERT ON agent_messages
    BEGIN
        UPDATE agent_chat_sessions 
        SET last_message_at = CURRENT_TIMESTAMP,
            message_count = message_count + 1
        WHERE id = NEW.session_id;
    END;

-- Inserir agente padrão para usuário cleverson.pompeu
INSERT OR IGNORE INTO ai_agents (
    id, 
    user_id, 
    name, 
    description, 
    system_prompt,
    model,
    temperature,
    is_default,
    avatar_emoji,
    color
) VALUES (
    'agent_default_cleverson',
    'user_cleverson_001',
    'Assistente Geral',
    'Assistente de IA para propósitos gerais',
    'Você é um assistente de IA inteligente e prestativo. Responda de forma clara, precisa e útil. Use os documentos RAG quando disponíveis para fornecer respostas baseadas em fatos.',
    'llama-3.1-8b-instant',
    0.7,
    1,
    '🤖',
    '#3b82f6'
);

-- Inserir agentes de exemplo
INSERT OR IGNORE INTO ai_agents (id, user_id, name, description, system_prompt, avatar_emoji, color) VALUES 
(
    'agent_support_cleverson',
    'user_cleverson_001',
    'Suporte Técnico',
    'Especialista em resolver problemas técnicos',
    'Você é um especialista em suporte técnico. Analise problemas, forneça soluções passo a passo e seja paciente. Use documentação técnica dos RAGs quando disponível.',
    '🛠️',
    '#ef4444'
),
(
    'agent_sales_cleverson',
    'user_cleverson_001',
    'Consultor de Vendas',
    'Ajuda com vendas e relacionamento com clientes',
    'Você é um consultor de vendas experiente. Seja persuasivo, empático e focado em entender as necessidades do cliente. Use informações de produtos dos RAGs.',
    '💼',
    '#10b981'
),
(
    'agent_content_cleverson',
    'user_cleverson_001',
    'Criador de Conteúdo',
    'Especialista em criar conteúdo de qualidade',
    'Você é um criador de conteúdo criativo. Gere textos envolventes, bem estruturados e otimizados. Use materiais de referência dos RAGs.',
    '✍️',
    '#8b5cf6'
);

-- Dar acesso total aos RAGs para todos os agentes (padrão)
-- Isso será gerenciado depois pela interface
