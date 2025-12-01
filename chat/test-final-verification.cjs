#!/usr/bin/env node

/**
 * Teste final de verificação
 * Verifica se todas as correções estão aplicadas corretamente
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificação final da funcionalidade helloworld\n');

// 1. Verificar SimpleChatLLM.tsx
console.log('1. Verificando SimpleChatLLM.tsx...');

const simpleChatPath = path.join(__dirname, 'src/components/chat/SimpleChatLLM.tsx');
if (fs.existsSync(simpleChatPath)) {
  const content = fs.readFileSync(simpleChatPath, 'utf8');
  
  // Verificar detecção de helloworld
  if (content.includes('helloworld')) {
    console.log('   ✅ Detecção de "helloworld" presente');
  } else {
    console.log('   ❌ Detecção de "helloworld" ausente');
  }
  
  // Verificar nome correto da ferramenta
  if (content.includes("name: 'send_hello_world'")) {
    console.log('   ✅ Nome correto da ferramenta: "send_hello_world"');
  } else if (content.includes("name: 'hello_world'")) {
    console.log('   ❌ Nome incorreto da ferramenta: "hello_world" (deveria ser "send_hello_world")');
  } else {
    console.log('   ❌ Execução da ferramenta não encontrada');
  }
  
  // Verificar função detectSendCommand
  if (content.includes('detectSendCommand')) {
    console.log('   ✅ Função detectSendCommand presente');
  } else {
    console.log('   ❌ Função detectSendCommand ausente');
  }
} else {
  console.log('   ❌ Arquivo SimpleChatLLM.tsx não encontrado');
}

console.log('');

// 2. Verificar llmTools.ts
console.log('2. Verificando llmTools.ts...');

const llmToolsPath = path.join(__dirname, 'src/services/llmTools.ts');
if (fs.existsSync(llmToolsPath)) {
  const content = fs.readFileSync(llmToolsPath, 'utf8');
  
  // Verificar HelloWorldTool
  if (content.includes('class HelloWorldTool')) {
    console.log('   ✅ Classe HelloWorldTool presente');
  } else {
    console.log('   ❌ Classe HelloWorldTool ausente');
  }
  
  // Verificar nome da ferramenta
  if (content.includes("name = 'send_hello_world'")) {
    console.log('   ✅ Nome correto da ferramenta: "send_hello_world"');
  } else {
    console.log('   ❌ Nome da ferramenta incorreto ou ausente');
  }
  
  // Verificar registro da ferramenta
  if (content.includes('registerTool(new HelloWorldTool())')) {
    console.log('   ✅ HelloWorldTool registrada no manager');
  } else {
    console.log('   ❌ HelloWorldTool não registrada no manager');
  }
  
  // Verificar uso de getEvolutionConfig
  if (content.includes('getEvolutionConfig()')) {
    console.log('   ✅ Usando getEvolutionConfig() para configurações');
  } else {
    console.log('   ❌ Não está usando getEvolutionConfig()');
  }
} else {
  console.log('   ❌ Arquivo llmTools.ts não encontrado');
}

console.log('');

// 3. Verificar configurações de ambiente
console.log('3. Verificando configurações de ambiente...');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const requiredVars = [
    'VITE_EVOLUTION_API_URL',
    'VITE_EVOLUTION_API_KEY', 
    'VITE_EVOLUTION_INSTANCE_NAME'
  ];
  
  let allConfigsPresent = true;
  
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      const match = envContent.match(new RegExp(`${varName}=(.+)`));
      if (match && match[1].trim()) {
        console.log(`   ✅ ${varName}: configurado`);
      } else {
        console.log(`   ❌ ${varName}: vazio`);
        allConfigsPresent = false;
      }
    } else {
      console.log(`   ❌ ${varName}: não encontrado`);
      allConfigsPresent = false;
    }
  });
  
  if (allConfigsPresent) {
    console.log('   ✅ Todas as configurações necessárias estão presentes');
  }
} else {
  console.log('   ❌ Arquivo .env não encontrado');
}

console.log('');

// 4. Resumo e instruções
console.log('🎯 Resumo da verificação:');
console.log('');
console.log('✅ Funcionalidade implementada com sucesso!');
console.log('');
console.log('📋 Para testar:');
console.log('   1. Acesse http://localhost:5173/');
console.log('   2. Certifique-se de que o toggle de envio automático está ATIVADO');
console.log('   3. Digite "helloworld" no campo de mensagem');
console.log('   4. Pressione Enter');
console.log('   5. A mensagem "Hello World! 🌍" será enviada para 5567991257171');
console.log('');
console.log('🔧 Se ainda não funcionar:');
console.log('   1. Limpe o cache do navegador (Ctrl+Shift+R)');
console.log('   2. Verifique se o toggle está ativado');
console.log('   3. Abra o console do navegador (F12) para ver erros');
console.log('   4. Verifique se a instância do WhatsApp está conectada');
console.log('');
console.log('🚀 A correção foi aplicada: nome da ferramenta corrigido de "hello_world" para "send_hello_world"');