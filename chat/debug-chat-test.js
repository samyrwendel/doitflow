// Teste de debug para o chat
// Execute este código no console do navegador

console.log('🧪 Iniciando teste de debug do chat');

// Função para testar a API Groq diretamente
async function testGroqAPI() {
  const apiKey = 'YOUR_GROQ_API_KEY';
  
  try {
    console.log('🔑 Testando API Groq...');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Você é um assistente útil.' },
          { role: 'user', content: 'Olá, como você está?' }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });
    
    console.log('📥 Resposta da API:', {
      status: response.status,
      ok: response.ok
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Sucesso! Resposta:', data.choices[0].message.content);
      return data.choices[0].message.content;
    } else {
      const error = await response.text();
      console.error('❌ Erro na API:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    return null;
  }
}

// Função para verificar se o React está funcionando
function checkReactState() {
  console.log('🔍 Verificando estado do React...');
  
  // Verificar se há elementos React na página
  const reactRoot = document.getElementById('root');
  console.log('React root encontrado:', !!reactRoot);
  
  // Verificar se há elementos de chat
  const chatElements = document.querySelectorAll('[class*="chat"], [class*="message"]');
  console.log('Elementos de chat encontrados:', chatElements.length);
  
  // Verificar se há botões de envio
  const sendButtons = document.querySelectorAll('button');
  console.log('Botões encontrados:', sendButtons.length);
  
  return {
    hasReactRoot: !!reactRoot,
    chatElementsCount: chatElements.length,
    sendButtonsCount: sendButtons.length
  };
}

// Executar testes
console.log('🚀 Executando testes...');
checkReactState();
testGroqAPI().then(response => {
  if (response) {
    console.log('✅ API funcionando! Resposta recebida:', response.substring(0, 100));
  } else {
    console.log('❌ API não funcionando');
  }
});

console.log('🧪 Teste de debug concluído. Verifique os logs acima.');