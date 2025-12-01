#!/usr/bin/env node

/**
 * Script de teste do Sistema Multi-Agentes
 * 
 * Testa:
 * - Criação de agentes
 * - Chat com agentes
 * - Acesso a RAGs
 * - Estatísticas
 */

const API_BASE = 'http://localhost:3004';
const USERNAME = 'cleverson.pompeu';
const PASSWORD = '123456';

let authToken = null;

// Função auxiliar para fazer requisições
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authToken && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`Erro na requisição ${endpoint}:`, error.message);
    return { ok: false, error: error.message };
  }
}

// 1. Login
async function login() {
  console.log('\n🔐 1. Fazendo login...');
  
  const result = await request('/api/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  });

  if (result.ok && result.data.token) {
    authToken = result.data.token;
    console.log('   ✅ Login bem-sucedido');
    console.log(`   👤 Usuário: ${result.data.user.fullName || result.data.user.username}`);
    return true;
  } else {
    console.log('   ❌ Erro no login:', result.data.error);
    return false;
  }
}

// 2. Listar agentes
async function listAgents() {
  console.log('\n📋 2. Listando agentes...');
  
  const result = await request('/api/agents');

  if (result.ok) {
    const agents = result.data.data;
    console.log(`   ✅ ${agents.length} agente(s) encontrado(s):`);
    
    agents.forEach(agent => {
      const isDefault = agent.is_default ? '⭐' : '  ';
      console.log(`   ${isDefault} ${agent.avatar_emoji} ${agent.name} - ${agent.usage_count} uso(s)`);
    });
    
    return agents;
  } else {
    console.log('   ❌ Erro ao listar agentes:', result.data.error);
    return [];
  }
}

// 3. Criar novo agente
async function createAgent() {
  console.log('\n➕ 3. Criando novo agente de teste...');
  
  const agentData = {
    name: 'Agente de Testes',
    description: 'Agente criado automaticamente para testes',
    systemPrompt: 'Você é um agente de testes. Responda de forma breve e objetiva, sempre mencionando que você é um agente de testes.',
    model: 'llama-3.1-8b-instant',
    temperature: 0.5,
    maxTokens: 500,
    avatarEmoji: '🧪',
    color: '#f59e0b'
  };

  const result = await request('/api/agents', {
    method: 'POST',
    body: JSON.stringify(agentData)
  });

  if (result.ok) {
    console.log('   ✅ Agente criado com sucesso!');
    console.log(`   🆔 ID: ${result.data.agent.id}`);
    return result.data.agent.id;
  } else {
    console.log('   ❌ Erro ao criar agente:', result.data.error);
    return null;
  }
}

// 4. Chat com agente
async function chatWithAgent(agentId) {
  console.log('\n💬 4. Conversando com agente...');
  
  const messages = [
    'Olá! Quem é você?',
    'Qual é o seu propósito?',
    'Você pode me ajudar com algo?'
  ];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    console.log(`\n   📤 Enviando: "${message}"`);
    
    const result = await request(`/api/agents/${agentId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });

    if (result.ok) {
      console.log(`   📥 Resposta: "${result.data.response}"`);
      console.log(`   ⏱️ Tempo: ${result.data.metadata.responseTime.toFixed(2)}s`);
      console.log(`   💰 Custo: $${result.data.metadata.cost.toFixed(6)}`);
      
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s
      }
    } else {
      console.log(`   ❌ Erro no chat: ${result.data.error}`);
      break;
    }
  }
}

// 5. Buscar estatísticas
async function getAgentStatistics(agentId) {
  console.log('\n📊 5. Buscando estatísticas do agente...');
  
  const result = await request(`/api/agents/${agentId}/statistics?days=1`);

  if (result.ok) {
    const stats = result.data.data;
    
    if (stats.length > 0) {
      const today = stats[0];
      console.log('   ✅ Estatísticas de hoje:');
      console.log(`   📨 Mensagens: ${today.total_messages}`);
      console.log(`   🔤 Tokens: ${today.total_tokens}`);
      console.log(`   💰 Custo: $${today.total_cost.toFixed(6)}`);
      console.log(`   ⏱️ Tempo médio: ${today.average_response_time.toFixed(2)}s`);
    } else {
      console.log('   ℹ️ Nenhuma estatística disponível ainda');
    }
  } else {
    console.log('   ❌ Erro ao buscar estatísticas:', result.data.error);
  }
}

// 6. Buscar sessões do agente
async function getAgentSessions(agentId) {
  console.log('\n🗂️ 6. Buscando sessões do agente...');
  
  const result = await request(`/api/agents/${agentId}/sessions`);

  if (result.ok) {
    const sessions = result.data.data;
    console.log(`   ✅ ${sessions.length} sessão(ões) encontrada(s)`);
    
    sessions.forEach((session, i) => {
      console.log(`   ${i + 1}. ID: ${session.id}`);
      console.log(`      Mensagens: ${session.message_count}`);
      console.log(`      Última: ${new Date(session.last_message_at).toLocaleString('pt-BR')}`);
    });
  } else {
    console.log('   ❌ Erro ao buscar sessões:', result.data.error);
  }
}

// 7. Deletar agente de teste
async function deleteAgent(agentId) {
  console.log('\n🗑️ 7. Deletando agente de teste...');
  
  const result = await request(`/api/agents/${agentId}`, {
    method: 'DELETE'
  });

  if (result.ok) {
    console.log('   ✅ Agente deletado com sucesso');
  } else {
    console.log('   ❌ Erro ao deletar agente:', result.data.error);
  }
}

// Executar testes
async function runTests() {
  console.log('🧪 ============================================');
  console.log('🧪 Teste do Sistema Multi-Agentes');
  console.log('🧪 ============================================');

  // 1. Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Não foi possível fazer login. Verifique as credenciais.');
    process.exit(1);
  }

  // 2. Listar agentes existentes
  const agents = await listAgents();

  // 3. Criar novo agente
  const newAgentId = await createAgent();
  if (!newAgentId) {
    console.log('\n❌ Não foi possível criar agente de teste.');
    process.exit(1);
  }

  // 4. Chat com agente
  await chatWithAgent(newAgentId);

  // 5. Estatísticas
  await getAgentStatistics(newAgentId);

  // 6. Sessões
  await getAgentSessions(newAgentId);

  // 7. Deletar agente de teste
  await deleteAgent(newAgentId);

  // Listar agentes novamente
  await listAgents();

  console.log('\n🎉 ============================================');
  console.log('🎉 Testes concluídos com sucesso!');
  console.log('🎉 ============================================\n');
}

// Executar
runTests().catch(error => {
  console.error('\n❌ Erro durante os testes:', error);
  process.exit(1);
});
