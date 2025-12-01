#!/usr/bin/env node

/**
 * Teste real da Evolution API
 * Este script faz uma requisição real para verificar se a API está funcionando
 */

const https = require('https');
const http = require('http');

// Configurações do .env
const config = {
  EVOLUTION_API_URL: 'https://evo.sofia.ms',
  EVOLUTION_API_KEY: '5d4abf38a96ca3de7e0aa181f30e8145',
  EVOLUTION_INSTANCE_NAME: 'testinho'
};

console.log('🔍 Testando a Evolution API real\n');

// Função para fazer requisição HTTP/HTTPS
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function testEvolutionAPI() {
  console.log('📋 Configurações:');
  console.log(`   URL: ${config.EVOLUTION_API_URL}`);
  console.log(`   API Key: ${config.EVOLUTION_API_KEY.substring(0, 10)}...`);
  console.log(`   Instance: ${config.EVOLUTION_INSTANCE_NAME}\n`);
  
  // 1. Testar conexão da instância
  console.log('1. Testando conexão da instância...');
  try {
    const connectionUrl = `${config.EVOLUTION_API_URL}/instance/connectionState/${config.EVOLUTION_INSTANCE_NAME}`;
    const connectionOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.EVOLUTION_API_KEY
      }
    };
    
    console.log(`   GET ${connectionUrl}`);
    const connectionResponse = await makeRequest(connectionUrl, connectionOptions);
    
    console.log(`   Status: ${connectionResponse.statusCode}`);
    if (connectionResponse.statusCode === 200) {
      console.log('   ✅ Instância conectada');
      try {
        const connectionData = JSON.parse(connectionResponse.data);
        console.log(`   Estado: ${connectionData.instance?.state || 'unknown'}`);
      } catch (e) {
        console.log(`   Resposta: ${connectionResponse.data.substring(0, 100)}...`);
      }
    } else {
      console.log('   ❌ Problema na conexão da instância');
      console.log(`   Resposta: ${connectionResponse.data.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log('   ❌ Erro ao testar conexão:');
    console.log(`   ${error.message}`);
  }
  
  console.log('');
  
  // 2. Testar envio de mensagem (simulado - não vamos enviar de verdade)
  console.log('2. Preparando teste de envio de mensagem...');
  
  const sendUrl = `${config.EVOLUTION_API_URL}/message/sendText/${config.EVOLUTION_INSTANCE_NAME}`;
  const payload = {
    number: '5567991257171',
    text: 'Hello World! 🌍'
  };
  
  console.log(`   URL: ${sendUrl}`);
  console.log(`   Payload: ${JSON.stringify(payload, null, 2)}`);
  
  // Não vamos enviar de verdade, apenas mostrar como seria
  console.log('   ⚠️  Teste de envio simulado (não enviando mensagem real)');
  
  console.log('\n3. Verificando se a HelloWorldTool está usando as configurações corretas...');
  
  // Verificar se o código está usando as variáveis de ambiente corretas
  const fs = require('fs');
  const path = require('path');
  
  const llmToolsPath = path.join(__dirname, 'src/services/llmTools.ts');
  if (fs.existsSync(llmToolsPath)) {
    const content = fs.readFileSync(llmToolsPath, 'utf8');
    
    if (content.includes('VITE_EVOLUTION_API_URL')) {
      console.log('   ✅ Usando VITE_EVOLUTION_API_URL');
    } else {
      console.log('   ❌ NÃO está usando VITE_EVOLUTION_API_URL');
    }
    
    if (content.includes('VITE_EVOLUTION_API_KEY')) {
      console.log('   ✅ Usando VITE_EVOLUTION_API_KEY');
    } else {
      console.log('   ❌ NÃO está usando VITE_EVOLUTION_API_KEY');
    }
    
    if (content.includes('VITE_EVOLUTION_INSTANCE_NAME')) {
      console.log('   ✅ Usando VITE_EVOLUTION_INSTANCE_NAME');
    } else {
      console.log('   ❌ NÃO está usando VITE_EVOLUTION_INSTANCE_NAME');
    }
  }
  
  console.log('\n🎯 Próximos passos para debug:');
  console.log('   1. Verificar se o toggle de envio automático está habilitado na interface');
  console.log('   2. Verificar console do navegador para erros JavaScript');
  console.log('   3. Testar digitando "helloworld" na interface de chat');
  console.log('   4. Verificar se a mensagem aparece no log do servidor');
}

testEvolutionAPI().catch(console.error);