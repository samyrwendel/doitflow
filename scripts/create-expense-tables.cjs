/**
 * Script para criar tabelas de monitoramento de gastos
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/data.db');

const schema = `
-- Tabela de Grupos WhatsApp Monitorados
CREATE TABLE IF NOT EXISTS expense_groups (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    group_jid TEXT NOT NULL UNIQUE,
    group_name TEXT NOT NULL,
    device_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    initial_balance REAL DEFAULT 0,
    current_balance REAL DEFAULT 0,
    period_start DATE,
    period_end DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES whatsapp_devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_expense_groups_user_id ON expense_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_groups_group_jid ON expense_groups(group_jid);

-- Tabela de Corridas
CREATE TABLE IF NOT EXISTS expense_rides (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    ride_date DATE NOT NULL,
    ride_time TEXT,
    origin TEXT,
    destination TEXT,
    cost REAL NOT NULL,
    currency TEXT DEFAULT 'BRL',
    sender_jid TEXT,
    sender_name TEXT,
    team_member_id TEXT,
    image_url TEXT,
    image_base64 TEXT,
    ai_extracted_data TEXT,
    confidence_score REAL,
    extraction_method TEXT DEFAULT 'gemini_vision',
    status TEXT DEFAULT 'pending',
    reviewed_at DATETIME,
    reviewed_by TEXT,
    message_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_expense_rides_group_id ON expense_rides(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_rides_user_id ON expense_rides(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_rides_ride_date ON expense_rides(ride_date);
CREATE INDEX IF NOT EXISTS idx_expense_rides_sender_jid ON expense_rides(sender_jid);
CREATE INDEX IF NOT EXISTS idx_expense_rides_provider ON expense_rides(provider);
CREATE INDEX IF NOT EXISTS idx_expense_rides_status ON expense_rides(status);

-- Tabela de Saldos
CREATE TABLE IF NOT EXISTS expense_balance_records (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    balance REAL NOT NULL,
    balance_date DATE NOT NULL,
    balance_time TEXT,
    account_type TEXT,
    sender_jid TEXT,
    sender_name TEXT,
    team_member_id TEXT,
    image_url TEXT,
    image_base64 TEXT,
    ai_extracted_data TEXT,
    confidence_score REAL,
    status TEXT DEFAULT 'pending',
    message_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_expense_balance_group_id ON expense_balance_records(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_balance_date ON expense_balance_records(balance_date);

-- Tabela de Relatórios
CREATE TABLE IF NOT EXISTS expense_reports (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_rides INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    balance_start REAL DEFAULT 0,
    balance_end REAL DEFAULT 0,
    cost_by_provider TEXT,
    rides_by_provider TEXT,
    cost_by_member TEXT,
    report_content TEXT,
    status TEXT DEFAULT 'generated',
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (group_id) REFERENCES expense_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_expense_reports_group_id ON expense_reports(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_period ON expense_reports(period_start, period_end);
`;

console.log('📊 Criando tabelas de monitoramento de gastos...');
console.log('📁 Banco de dados:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err);
    process.exit(1);
  }
  console.log('✅ Conectado ao banco de dados');
});

db.exec(schema, (err) => {
  if (err) {
    console.error('❌ Erro ao criar tabelas:', err);
    process.exit(1);
  }

  console.log('✅ Tabelas criadas com sucesso!');
  console.log('');
  console.log('📋 Tabelas disponíveis:');
  console.log('  - expense_groups: Grupos WhatsApp monitorados');
  console.log('  - expense_rides: Corridas registradas (Uber/99)');
  console.log('  - expense_balance_records: Registros de saldo');
  console.log('  - expense_reports: Relatórios gerados');
  console.log('');
  console.log('🔗 Endpoints da API:');
  console.log('  GET    /api/expenses/groups            - Listar grupos');
  console.log('  POST   /api/expenses/groups            - Criar grupo');
  console.log('  GET    /api/expenses/groups/:id        - Obter grupo');
  console.log('  PUT    /api/expenses/groups/:id        - Atualizar grupo');
  console.log('  DELETE /api/expenses/groups/:id        - Deletar grupo');
  console.log('  GET    /api/expenses/groups/:id/stats  - Estatísticas');
  console.log('  GET    /api/expenses/groups/:id/rides  - Listar corridas');
  console.log('  POST   /api/expenses/groups/:id/rides  - Adicionar corrida');
  console.log('  PUT    /api/expenses/rides/:id         - Atualizar corrida');
  console.log('  DELETE /api/expenses/rides/:id         - Deletar corrida');
  console.log('  POST   /api/expenses/analyze-image     - Analisar imagem');
  console.log('  POST   /api/expenses/webhook           - Webhook para mensagens');

  db.close();
});
