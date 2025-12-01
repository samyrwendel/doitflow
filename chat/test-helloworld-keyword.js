#!/usr/bin/env node

/**
 * Teste da funcionalidade da palavra-chave "helloworld"
 * Este script testa se a palavra-chave está sendo detectada corretamente
 */

// Simular as funções do SimpleChatLLM
function detectSendCommand(userInput, assistantResponse) {
  const userLower = userInput.toLowerCase();
  const assistantLower = assistantResponse.toLowerCase();
  
  // Verificar palavra-chave especial "helloworld"
  if (userLower.includes('helloworld')) {
    return true;
  }
  
  // Palavras-chave que indicam envio de mensagem
  const sendKeywords = [
    'enviar', 'mandar', 'disparar', 'transmitir', 'encaminhar',
    'send', 'message', 'whatsapp', 'zap', 'mensagem'
  ];
  
  // Verificar se contém número de telefone
  const phonePattern = /(\+?55\s?)?(\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/;
  const hasPhone = phonePattern.test(userInput) || phonePattern.test(assistantResponse);
  
  // Verificar se contém palavras-chave de envio
  const hasSendKeyword = sendKeywords.some(keyword => 
    userLower.includes(keyword) || assistantLower.includes(keyword)
  );
  
  // Verificar se contém saudações comuns
  const greetings = ['oi', 'olá', 'hello', 'hi', 'bom dia', 'boa tarde', 'boa noite'];
  const hasGreeting = greetings.some(greeting => 
    userLower.includes(greeting) || assistantLower.includes(greeting)
  );
  
  return hasPhone && (hasSendKeyword || hasGreeting);
}

// Casos de teste
const testCases = [
  {
    input: "helloworld",
    expected: true,
    description: "Palavra-chave simples 'helloworld'"
  },
  {
    input: "Teste helloworld agora",
    expected: true,
    description: "Palavra-chave 'helloworld' no meio da frase"
  },
  {
    input: "HELLOWORLD",
    expected: true,
    description: "Palavra-chave 'helloworld' em maiúsculas"
  },
  {
    input: "Hello World",
    expected: false,
    description: "Palavras separadas 'Hello World' (não deve ativar)"
  },
  {
    input: "enviar oi para 5567991257171",
    expected: true,
    description: "Comando normal de envio (deve continuar funcionando)"
  },
  {
    input: "apenas uma mensagem normal",
    expected: false,
    description: "Mensagem normal (não deve ativar)"
  }
];

console.log('🧪 Testando a funcionalidade da palavra-chave "helloworld"\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const result = detectSendCommand(testCase.input, '');
  const passed = result === testCase.expected;
  
  console.log(`Teste ${index + 1}: ${testCase.description}`);
  console.log(`  Input: "${testCase.input}"`);
  console.log(`  Esperado: ${testCase.expected}, Resultado: ${result}`);
  console.log(`  Status: ${passed ? '✅ PASSOU' : '❌ FALHOU'}\n`);
  
  if (passed) passedTests++;
});

console.log(`📊 Resultado final: ${passedTests}/${totalTests} testes passaram`);

if (passedTests === totalTests) {
  console.log('🎉 Todos os testes passaram! A funcionalidade está funcionando corretamente.');
  process.exit(0);
} else {
  console.log('⚠️  Alguns testes falharam. Verifique a implementação.');
  process.exit(1);
}