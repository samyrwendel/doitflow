// Teste de login usando fetch diretamente
const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('Testando login com admin@tupperware.com...');
    
    // Simular o que o authService faz
    const nocodbConfig = {
      server: process.env.VITE_NOCODB_SERVER || 'https://nocodb.sofia.ms/',
      projectId: process.env.VITE_NOCODB_PROJECT_ID || 'pefjgqhwsd3w98b',
      token: process.env.VITE_NOCODB_TOKEN || 'your-token-here'
    };
    
    const baseUrl = `${nocodbConfig.server}api/v1/db/data/noco/${nocodbConfig.projectId}`;
    const whereClause = 'email,eq,admin@tupperware.com';
    const url = `${baseUrl}/users/records?where=${encodeURIComponent(whereClause)}`;
    
    console.log('URL de teste:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'xc-token': nocodbConfig.token
      }
    });
    
    console.log('Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Dados retornados:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Erro no teste:', error.message);
  }
}

testLogin();