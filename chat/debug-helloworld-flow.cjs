#!/usr/bin/env node

/**
 * Debug completo do fluxo da funcionalidade helloworld
 * Este script simula exatamente o que acontece na interface
 */

const fs = require('fs');
const path = require('path');

// Simular as configurações do .env
const config = {
  EVOLUTION_API_URL: process.env.EVOLUTION_API_URL || 'https://api.evolution.com',
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY || 'test-key',
  EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME || 'test-instance'
};

console.log('🔍 Debug do fluxo completo da funcionalidade helloworld\n');

// 1. Verificar se as modificações estão no código
console.log('1. Verificando modificações no código...\n');

// Verificar SimpleChatLLM.tsx
const simpleChatPath = path.join(__dirname, 'src/components/chat/SimpleChatLLM.tsx');
if (fs.existsSync(simpleChatPath)) {
  const content = fs.readFileSync(simpleChatPath, 'utf8');
  
  console.log('📄 SimpleChatLLM.tsx:');
  
  // Verificar se a detecção de helloworld está presente
  if (content.includes('helloworld')) {
    console.log('   ✅ Detecção de "helloworld" encontrada');
    
    // Encontrar a linha específica
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('helloworld') && !line.trim().startsWith('//')) {
        console.log(`   📍 Linha ${index + 1}: ${line.trim()}`);
      }
    });
  } else {
    console.log('   ❌ Detecção de "helloworld" NÃO encontrada');
  }
  
  // Verificar se a execução da ferramenta hello_world está presente
  if (content.includes('hello_world')) {
    console.log('   ✅ Execução da ferramenta "hello_world" encontrada');
  } else {
    console.log('   ❌ Execução da ferramenta "hello_world" NÃO encontrada');
  }
  
} else {
  console.log('   ❌ Arquivo SimpleChatLLM.tsx não encontrado');
}

console.log('');

// Verificar llmTools.ts
const llmToolsPath = path.join(__dirname, 'src/services/llmTools.ts');
if (fs.existsSync(llmToolsPath)) {
  const content = fs.readFileSync(llmToolsPath, 'utf8');
  
  console.log('📄 llmTools.ts:');
  
  // Verificar se a HelloWorldTool está presente
  if (content.includes('HelloWorldTool')) {
    console.log('   ✅ Classe HelloWorldTool encontrada');
  } else {
    console.log('   ❌ Classe HelloWorldTool NÃO encontrada');
  }
  
  // Verificar se está registrada
  if (content.includes('registerTool(new HelloWorldTool())')) {
    console.log('   ✅ HelloWorldTool registrada no LLMToolManager');
  } else {
    console.log('   ❌ HelloWorldTool NÃO registrada no LLMToolManager');
  }
  
} else {
  console.log('   ❌ Arquivo llmTools.ts não encontrado');
}

console.log('\n2. Simulando o fluxo de detecção...\n');

// Simular a função detectSendCommand
function detectSendCommand(userInput, assistantResponse) {
  const userLower = userInput.toLowerCase();
  const assistantLower = assistantResponse.toLowerCase();
  
  console.log(`   🔍 Input do usuário: "${userInput}"`);
  console.log(`   🔍 Input em minúsculas: "${userLower}"`);
  
  // Verificar palavra-chave especial "helloworld"
  if (userLower.includes('helloworld')) {
    console.log('   ✅ Palavra-chave "helloworld" detectada!');
    return true;
  }
  
  console.log('   ❌ Palavra-chave "helloworld" NÃO detectada');
  return false;
}

// Testar diferentes inputs
const testInputs = [
  'helloworld',
  'Teste helloworld agora',
  'HELLOWORLD',
  'Hello World',
  'hello world'
];

testInputs.forEach((input, index) => {
  console.log(`Teste ${index + 1}:`);
  const result = detectSendCommand(input, '');
  console.log(`   Resultado: ${result ? 'DETECTADO' : 'NÃO DETECTADO'}\n`);
});

console.log('3. Verificando configurações da Evolution API...\n');

console.log('📋 Configurações atuais:');
console.log(`   URL: ${config.EVOLUTION_API_URL}`);
console.log(`   API Key: ${config.EVOLUTION_API_KEY.substring(0, 10)}...`);
console.log(`   Instance: ${config.EVOLUTION_INSTANCE_NAME}`);

console.log('\n4. Simulando execução da HelloWorldTool...\n');

async function simulateHelloWorldTool() {
  console.log('🚀 Simulando execução da HelloWorldTool...');
  
  const payload = {
    number: '5567991257171',
    text: 'Hello World! 🌍'
  };
  
  const url = `${config.EVOLUTION_API_URL}/message/sendText/${config.EVOLUTION_INSTANCE_NAME}`;
  
  console.log('📤 Dados que seriam enviados:');
  console.log(`   URL: ${url}`);
  console.log(`   Método: POST`);
  console.log(`   Headers: { 'Content-Type': 'application/json', 'apikey': '${config.EVOLUTION_API_KEY}' }`);
  console.log(`   Body: ${JSON.stringify(payload, null, 2)}`);
  
  // Simular resposta de sucesso
  console.log('\n✅ Simulação de resposta de sucesso:');
  console.log('   Status: 201');
  console.log('   Body: { "messageId": "test-123", "status": "sent" }');
}

simulateHelloWorldTool();

console.log('\n🎯 Resumo do Debug:');
console.log('   1. Verificar se as modificações estão no código');
console.log('   2. Testar a detecção da palavra-chave');
console.log('   3. Verificar configurações da API');
console.log('   4. Simular execução da ferramenta');
console.log('\n💡 Se tudo estiver correto aqui mas não funcionar na interface,');
console.log('   o problema pode estar em:');
console.log('   - Cache do navegador');
console.log('   - Toggle de envio automático desabilitado');
console.log('   - Erro de JavaScript no console do navegador');
console.log('   - Problema na configuração do .env');