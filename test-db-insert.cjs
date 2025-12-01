const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/data.db');

console.log('🔄 Testando insert no banco...');

db.run(
  'INSERT INTO whatsapp_devices (id, user_id, name) VALUES (?, ?, ?)',
  ['test-xyz-callback', '8b890a28-43b6-47df-8c13-6e0233eba467', 'test-callback'],
  function(err) {
    if (err) {
      console.error('❌ Error:', err);
    } else {
      console.log('✅ Success with callback!');
    }
    
    // Limpar
    db.run('DELETE FROM whatsapp_devices WHERE id = ?', ['test-xyz-callback'], () => {
      db.close();
    });
  }
);

// Teste com Promise
const runAsync = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

setTimeout(async () => {
  try {
    console.log('🔄 Testando insert com Promise...');
    await runAsync(
      'INSERT INTO whatsapp_devices (id, user_id, name) VALUES (?, ?, ?)',
      ['test-xyz-promise', '8b890a28-43b6-47df-8c13-6e0233eba467', 'test-promise']
    );
    console.log('✅ Success with Promise!');
    
    await runAsync('DELETE FROM whatsapp_devices WHERE id = ?', ['test-xyz-promise']);
    console.log('✅ Cleanup done');
  } catch (error) {
    console.error('❌ Promise error:', error);
  }
}, 1000);
