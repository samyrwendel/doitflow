#!/usr/bin/env node

/**
 * Teste do fluxo completo da interface
 * Simula exatamente o que acontece quando o usuário digita "helloworld"
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testando fluxo completo da interface\n');

// 1. Verificar se as modificações estão no SimpleChatLLM.tsx
console.log('1. Verificando modificações no SimpleChatLLM.tsx...');

const simpleChatPath = path.join(__dirname, 'src/components/SimpleChatLLM.tsx');
if (fs.existsSync(simpleChatPath)) {
  const content = fs.readFileSync(simpleChatPath, 'utf8');
  
  // Verificar se a detecção de helloworld está presente
  if (content.includes('helloworld')) {
    console.log('   ✅ Palavra-chave "helloworld" encontrada no código');
    
    // Verificar se está na função detectSendCommand
    const detectSendCommandMatch = content.match(/function detectSendCommand[\s\S]*?return[\s\S]*?}/);
    if (detectSendCommandMatch && detectSendCommandMatch[0].includes('helloworld')) {
      console.log('   ✅ Detecção de "helloworld" está na função detectSendCommand');
    } else {
      console.log('   ❌ Detecção de "helloworld" NÃO está na função detectSendCommand');
    }
    
    // Verificar se a execução da ferramenta está presente
    if (content.includes('hello_world')) {
      console.log('   ✅ Execução da ferramenta "hello_world" encontrada');
    } else {
      console.log('   ❌ Execução da ferramenta "hello_world" NÃO encontrada');
    }
  } else {
    console.log('   ❌ Palavra-chave "helloworld" NÃO encontrada no código');
  }
} else {
  console.log('   ❌ Arquivo SimpleChatLLM.tsx não encontrado');
}

console.log('');

// 2. Verificar se a HelloWorldTool está registrada
console.log('2. Verificando registro da HelloWorldTool...');

const llmToolsPath = path.join(__dirname, 'src/services/llmTools.ts');
if (fs.existsSync(llmToolsPath)) {
  const content = fs.readFileSync(llmToolsPath, 'utf8');
  
  if (content.includes('HelloWorldTool')) {
    console.log('   ✅ Classe HelloWorldTool encontrada');
    
    if (content.includes('registerTool(new HelloWorldTool())')) {
      console.log('   ✅ HelloWorldTool está registrada no manager');
    } else {
      console.log('   ❌ HelloWorldTool NÃO está registrada no manager');
    }
  } else {
    console.log('   ❌ Classe HelloWorldTool NÃO encontrada');
  }
} else {
  console.log('   ❌ Arquivo llmTools.ts não encontrado');
}

console.log('');

// 3. Simular o fluxo de detecção
console.log('3. Simulando fluxo de detecção...');

function simulateDetectSendCommand(input) {
  const lowerInput = input.toLowerCase();
  
  // Verificar palavra-chave helloworld
  if (lowerInput.includes('helloworld')) {
    return true;
  }
  
  // Verificar padrões de envio normais (simplificado)
  const sendPatterns = [
    /envie?\s+.*?para\s+(\d{10,15})/i,
    /mande?\s+.*?para\s+(\d{10,15})/i,
    /send\s+.*?to\s+(\d{10,15})/i
  ];
  
  for (const pattern of sendPatterns) {
    if (pattern.test(input)) {
      return true;
    }
  }
  
  return false;
}

const testInputs = [
  'helloworld',
  'teste helloworld agora',
  'HELLOWORLD',
  'Hello World',
  'envie oi para 5567991257171',
  'mensagem normal'
];

testInputs.forEach((input, index) => {
  const result = simulateDetectSendCommand(input);
  console.log(`   Teste ${index + 1}: "${input}" -> ${result ? 'DETECTADO' : 'NÃO DETECTADO'}`);
});

console.log('');

// 4. Verificar configurações de ambiente
console.log('4. Verificando configurações de ambiente...');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const requiredVars = [
    'VITE_EVOLUTION_API_URL',
    'VITE_EVOLUTION_API_KEY',
    'VITE_EVOLUTION_INSTANCE_NAME'
  ];
  
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      const match = envContent.match(new RegExp(`${varName}=(.+)`));
      if (match && match[1].trim()) {
        console.log(`   ✅ ${varName}: ${match[1].substring(0, 20)}...`);
      } else {
        console.log(`   ❌ ${varName}: vazio`);
      }
    } else {
      console.log(`   ❌ ${varName}: não encontrado`);
    }
  });
} else {
  console.log('   ❌ Arquivo .env não encontrado');
}

console.log('');

// 5. Verificar se há problemas de build
console.log('5. Verificando possíveis problemas...');

console.log('   💡 Possíveis causas do problema:');
console.log('   1. Cache do navegador - tente Ctrl+F5 para recarregar');
console.log('   2. Toggle de envio automático desabilitado na interface');
console.log('   3. Erro de JavaScript no console do navegador');
console.log('   4. Problema na configuração da Evolution API');
console.log('   5. Instância do WhatsApp não conectada');

console.log('');

console.log('🎯 Para testar na interface:');
console.log('   1. Abra http://localhost:5173/');
console.log('   2. Verifique se o toggle de envio automático está ativado');
console.log('   3. Digite "helloworld" no campo de mensagem');
console.log('   4. Pressione Enter');
console.log('   5. Verifique o console do navegador (F12) para erros');

console.log('');

console.log('🔧 Para debug adicional:');
console.log('   1. Abra o console do navegador (F12)');
console.log('   2. Digite: localStorage.getItem("sendTextEnabled")');
console.log('   3. Deve retornar "true" se o toggle estiver ativado');
console.log('   4. Se retornar "false" ou null, ative o toggle na interface');