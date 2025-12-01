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

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER IF NOT EXISTS update_usage_stats_updated_at 
    AFTER UPDATE ON usage_stats
    BEGIN
        UPDATE usage_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
