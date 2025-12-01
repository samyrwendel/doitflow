#!/usr/bin/env node

// Disparador de teste para enviar "Hello World" via Evolution API
// Uso: node test-send-hello-world.js

// Configurações da Evolution API (do arquivo .env)
const EVOLUTION_API_URL = 'https://evo.sofia.ms';
const EVOLUTION_API_KEY = '5d4abf38a96ca3de7e0aa181f30e8145';
const EVOLUTION_INSTANCE_NAME = 'testinho';

// Número de destino
const TARGET_PHONE = '5567991257171';
const MESSAGE_TEXT = 'Hello World! 🌍';

async function sendHelloWorld() {
  console.log('🚀 Iniciando disparador de teste...');
  console.log('📱 Número de destino:', TARGET_PHONE);
  console.log('💬 Mensagem:', MESSAGE_TEXT);
  console.log('🔧 Instância:', EVOLUTION_INSTANCE_NAME);
  console.log('🌐 API URL:', EVOLUTION_API_URL);
  console.log('🔑 API Key:', EVOLUTION_API_KEY.substring(0, 10) + '...');
  console.log('');

  try {
    // Endpoint para envio de texto
    const endpoint = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
    
    console.log('📡 Enviando requisição para:', endpoint);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: TARGET_PHONE,
        text: MESSAGE_TEXT,
        delay: 0,
        linkPreview: false
      })
    });

    console.log('📊 Status da resposta:', response.status);
    console.log('📋 Headers da resposta:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API:', response.status, response.statusText);
      console.error('📄 Detalhes do erro:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Resposta da API:', JSON.stringify(data, null, 2));
    
    if (data.key && data.key.id) {
      console.log('🎉 Mensagem enviada com sucesso!');
      console.log('🆔 ID da mensagem:', data.key.id);
      console.log('📞 Para:', data.key.remoteJid);
    } else {
      console.log('⚠️ Resposta inesperada da API');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o envio:', error.message);
    console.error('🔍 Stack trace:', error.stack);
  }
}

// Função para verificar se a instância está conectada
async function checkInstanceStatus() {
  console.log('🔍 Verificando status da instância...');
  
  try {
    const endpoint = `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE_NAME}`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });

    if (!response.ok) {
      console.error('❌ Erro ao verificar status:', response.status);
      return false;
    }

    const data = await response.json();
    console.log('📊 Status da instância:', JSON.stringify(data, null, 2));
    
    if (data.instance && data.instance.state === 'open') {
      console.log('✅ Instância conectada e pronta!');
      return true;
    } else {
      console.log('⚠️ Instância não está conectada');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('🎯 DISPARADOR DE TESTE - HELLO WORLD');
  console.log('=====================================');
  console.log('');
  
  // Verificar status da instância primeiro
  const isConnected = await checkInstanceStatus();
  console.log('');
  
  if (!isConnected) {
    console.log('⚠️ ATENÇÃO: A instância não está conectada.');
    console.log('💡 Conecte a instância primeiro antes de enviar mensagens.');
    console.log('');
  }
  
  // Enviar mensagem mesmo se não conectada (para ver o erro)
  await sendHelloWorld();
  
  console.log('');
  console.log('🏁 Teste finalizado!');
}

// Executar o script
main().catch(console.error);