-- Migration 002: Sistema de Ferramentas para Agentes
-- Criado em: 2025-11-25
-- Permite que agentes usem ferramentas externas (Evolution API, etc)

-- Tabela de ferramentas disponíveis
CREATE TABLE IF NOT EXISTS agent_tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- ex: 'evolution_api', 'email_sender'
    display_name TEXT NOT NULL, -- ex: 'Evolution API'
    description TEXT,
    icon TEXT DEFAULT '🔧',
    category TEXT DEFAULT 'general', -- general, messaging, automation, etc
    is_active BOOLEAN DEFAULT 1,
    config_schema TEXT, -- JSON schema para configuração
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configurações de Evolution API
CREATE TABLE IF NOT EXISTS evolution_instances (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL, -- Nome amigável da instância
    instance_id TEXT NOT NULL, -- ID da instância na Evolution API
    base_url TEXT NOT NULL, -- ex: https://evolution.example.com
    api_key TEXT NOT NULL,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de ferramentas habilitadas por agente
CREATE TABLE IF NOT EXISTS agent_tool_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT 1,
    config TEXT, -- JSON com configurações específicas do agente para esta tool
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES agent_tools(id) ON DELETE CASCADE,
    UNIQUE(agent_id, tool_id)
);

-- Tabela de logs de uso de ferramentas
CREATE TABLE IF NOT EXISTS agent_tool_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    session_id TEXT,
    action TEXT NOT NULL, -- ex: 'send_message', 'send_media'
    parameters TEXT, -- JSON com parâmetros da chamada
    response TEXT, -- JSON com resposta da API
    status TEXT DEFAULT 'pending', -- pending, success, error
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES agent_tools(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_evolution_instances_user_id ON evolution_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_access_agent_id ON agent_tool_access(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_access_tool_id ON agent_tool_access(tool_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_usage_agent_id ON agent_tool_usage(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_usage_tool_id ON agent_tool_usage(tool_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_usage_session_id ON agent_tool_usage(session_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER IF NOT EXISTS update_evolution_instances_updated_at 
    AFTER UPDATE ON evolution_instances
    BEGIN
        UPDATE evolution_instances SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Inserir ferramenta Evolution API
INSERT OR IGNORE INTO agent_tools (id, name, display_name, description, icon, category, config_schema)
VALUES (
    'tool_evolution_api',
    'evolution_api',
    'Evolution API',
    'Enviar mensagens via WhatsApp usando Evolution API. Permite enviar textos, mídias, áudios e gerenciar conversas.',
    '💬',
    'messaging',
    '{
        "type": "object",
        "properties": {
            "instance_id": {
                "type": "string",
                "description": "ID da instância Evolution API a usar"
            },
            "default_delay": {
                "type": "number",
                "description": "Delay padrão entre mensagens (ms)",
                "default": 1000
            }
        }
    }'
);
