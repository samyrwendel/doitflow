// Script para aplicar schema ao banco de dados
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'database', 'data.db');
const schemaPath = path.join(projectRoot, 'database', 'schema.sql');

console.log('📂 Aplicando schema...');
console.log('   DB:', dbPath);
console.log('   Schema:', schemaPath);

const db = new sqlite3.Database(dbPath);
const schema = fs.readFileSync(schemaPath, 'utf-8');

// Executar cada statement separadamente
const statements = schema.split(';').filter(s => {
  const trimmed = s.trim();
  return trimmed && !trimmed.startsWith('--');
});

let executed = 0;
let errors = [];

// Usar serialização para executar statements em ordem
db.serialize(() => {
  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (trimmed) {
      db.run(trimmed, (err) => {
        if (err) {
          if (!err.message.includes('already exists')) {
            errors.push(err.message.substring(0, 80));
          }
        } else {
          executed++;
        }
      });
    }
  }

  // Após executar todos os statements, verificar tabelas
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
    if (err) {
      console.log('❌ Erro ao listar tabelas:', err.message);
    } else {
      console.log('\n📊 Tabelas no banco (' + tables.length + '):');
      tables.forEach(t => console.log('   -', t.name));

      // Verificar novas tabelas de agendamento
      const newTables = ['team_members', 'agent_schedules', 'schedule_executions', 'team_activities', 'schedule_message_templates'];
      console.log('\n🆕 Tabelas de agendamento:');
      newTables.forEach(name => {
        const exists = tables.some(t => t.name === name);
        console.log('   -', name, exists ? '✅' : '❌');
      });
    }

    if (errors.length > 0) {
      console.log('\n⚠️ Alguns erros:', errors.slice(0, 3).join(', '));
    }

    console.log('\n✨ Schema aplicado com sucesso!');
    db.close();
  });
});
