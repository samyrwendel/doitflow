// Script para criar tabelas de agendamento
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'database', 'data.db');

console.log('📂 Criando tabelas de agendamento...');
console.log('   DB:', dbPath);

const db = new sqlite3.Database(dbPath);

// Statements para criar tabelas de agendamento
const statements = [
  // Tabela de Membros da Equipe
  `CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    role TEXT,
    department TEXT,
    is_active BOOLEAN DEFAULT 1,
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, phone_number)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_team_members_phone ON team_members(phone_number)`,

  // Tabela de Agendamentos
  `CREATE TABLE IF NOT EXISTS agent_schedules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    team_member_id TEXT NOT NULL,
    name TEXT NOT NULL,
    schedule_type TEXT NOT NULL,
    time_of_day TEXT NOT NULL,
    days_of_week TEXT,
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    initial_message TEXT NOT NULL,
    followup_message TEXT,
    reminder_message TEXT,
    wait_for_response BOOLEAN DEFAULT 1,
    response_timeout_minutes INTEGER DEFAULT 60,
    max_followups INTEGER DEFAULT 2,
    followup_interval_minutes INTEGER DEFAULT 30,
    use_ai_response BOOLEAN DEFAULT 1,
    rag_document_id TEXT,
    custom_prompt TEXT,
    is_active BOOLEAN DEFAULT 1,
    last_triggered_at DATETIME,
    next_trigger_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES whatsapp_devices(id) ON DELETE CASCADE,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE,
    FOREIGN KEY (rag_document_id) REFERENCES rag_documents(id) ON DELETE SET NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_agent_schedules_user_id ON agent_schedules(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_agent_schedules_device_id ON agent_schedules(device_id)`,
  `CREATE INDEX IF NOT EXISTS idx_agent_schedules_team_member_id ON agent_schedules(team_member_id)`,
  `CREATE INDEX IF NOT EXISTS idx_agent_schedules_next_trigger ON agent_schedules(next_trigger_at)`,
  `CREATE INDEX IF NOT EXISTS idx_agent_schedules_is_active ON agent_schedules(is_active)`,

  // Tabela de Execuções
  `CREATE TABLE IF NOT EXISTS schedule_executions (
    id TEXT PRIMARY KEY,
    schedule_id TEXT NOT NULL,
    team_member_id TEXT NOT NULL,
    status TEXT NOT NULL,
    message_sent TEXT,
    sent_at DATETIME,
    response_received TEXT,
    responded_at DATETIME,
    ai_analysis TEXT,
    followup_count INTEGER DEFAULT 0,
    last_followup_at DATETIME,
    postponed_to DATETIME,
    postpone_reason TEXT,
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    error_message TEXT,
    metadata TEXT,
    FOREIGN KEY (schedule_id) REFERENCES agent_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS idx_schedule_executions_schedule_id ON schedule_executions(schedule_id)`,
  `CREATE INDEX IF NOT EXISTS idx_schedule_executions_team_member_id ON schedule_executions(team_member_id)`,
  `CREATE INDEX IF NOT EXISTS idx_schedule_executions_status ON schedule_executions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_schedule_executions_triggered_at ON schedule_executions(triggered_at)`,

  // Tabela de Atividades
  `CREATE TABLE IF NOT EXISTS team_activities (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL,
    team_member_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT,
    category TEXT,
    planned_date DATE,
    reported_date DATE NOT NULL,
    completed_date DATE,
    status TEXT DEFAULT 'reported',
    related_activity_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (execution_id) REFERENCES schedule_executions(id) ON DELETE CASCADE,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_activity_id) REFERENCES team_activities(id) ON DELETE SET NULL
  )`,

  `CREATE INDEX IF NOT EXISTS idx_team_activities_execution_id ON team_activities(execution_id)`,
  `CREATE INDEX IF NOT EXISTS idx_team_activities_team_member_id ON team_activities(team_member_id)`,
  `CREATE INDEX IF NOT EXISTS idx_team_activities_user_id ON team_activities(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_team_activities_reported_date ON team_activities(reported_date)`,
  `CREATE INDEX IF NOT EXISTS idx_team_activities_status ON team_activities(status)`,

  // Tabela de Templates
  `CREATE TABLE IF NOT EXISTS schedule_message_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    template_type TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT DEFAULT 'pt',
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS idx_schedule_templates_user_id ON schedule_message_templates(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_schedule_templates_type ON schedule_message_templates(template_type)`
];

// Templates padrão
const insertTemplates = [
  `INSERT OR IGNORE INTO schedule_message_templates (id, user_id, name, template_type, content, is_default) VALUES
    ('tpl_daily_start_default', 'user_cleverson_001', 'Início do Dia - Padrão', 'daily_start',
     'Bom dia, {nome}!

Quais atividades você planeja realizar hoje? Por favor, liste as principais tarefas que pretende executar.', 1)`,

  `INSERT OR IGNORE INTO schedule_message_templates (id, user_id, name, template_type, content, is_default) VALUES
    ('tpl_daily_end_default', 'user_cleverson_001', 'Fim do Dia - Padrão', 'daily_end',
     'Boa tarde, {nome}!

Como foi seu dia? Por favor, me conte:
1. Quais atividades você conseguiu completar?
2. Quais ficaram pendentes?
3. Teve algum impedimento?', 1)`,

  `INSERT OR IGNORE INTO schedule_message_templates (id, user_id, name, template_type, content, is_default) VALUES
    ('tpl_followup_default', 'user_cleverson_001', 'Follow-up - Padrão', 'followup',
     'Olá {nome}, vi que ainda não respondeu. Quando puder, me conta sobre suas atividades.', 1)`,

  `INSERT OR IGNORE INTO schedule_message_templates (id, user_id, name, template_type, content, is_default) VALUES
    ('tpl_reminder_default', 'user_cleverson_001', 'Lembrete - Padrão', 'reminder',
     '{nome}, só passando para lembrar de registrar suas atividades do dia. É importante para o acompanhamento da equipe!', 1)`
];

// Executar statements
let success = 0;
let errors = [];

db.serialize(() => {
  // Criar tabelas
  statements.forEach((stmt, i) => {
    db.run(stmt, (err) => {
      if (err) {
        errors.push(`[${i}] ${err.message}`);
      } else {
        success++;
      }
    });
  });

  // Inserir templates
  insertTemplates.forEach((stmt, i) => {
    db.run(stmt, (err) => {
      if (err && !err.message.includes('UNIQUE constraint')) {
        errors.push(`[template ${i}] ${err.message}`);
      } else {
        success++;
      }
    });
  });

  // Verificar tabelas criadas
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('team_members', 'agent_schedules', 'schedule_executions', 'team_activities', 'schedule_message_templates') ORDER BY name", (err, tables) => {
    console.log('\n📊 Tabelas de agendamento criadas:');
    if (err) {
      console.log('❌ Erro:', err.message);
    } else {
      const expected = ['team_members', 'agent_schedules', 'schedule_executions', 'team_activities', 'schedule_message_templates'];
      expected.forEach(name => {
        const exists = tables.some(t => t.name === name);
        console.log('   -', name, exists ? '✅' : '❌');
      });
    }

    console.log('\n✅ Operações executadas:', success);
    if (errors.length > 0) {
      console.log('⚠️ Erros:', errors.slice(0, 5).join('\n   '));
    }

    // Verificar templates
    db.all("SELECT id, name FROM schedule_message_templates", (err, templates) => {
      if (!err && templates.length > 0) {
        console.log('\n📝 Templates inseridos:');
        templates.forEach(t => console.log('   -', t.name));
      }

      console.log('\n✨ Schema de agendamento aplicado!');
      db.close();
    });
  });
});
