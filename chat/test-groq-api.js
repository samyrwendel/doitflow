// Teste direto da API do Groq
const GROQ_API_KEY = 'YOUR_GROQ_API_KEY';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function testGroqAPI() {
  console.log('🚀 Testando API do Groq...');
  console.log('Modelo:', GROQ_MODEL);
  console.log('API Key:', GROQ_API_KEY.substring(0, 10) + '...');
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'user',
            content: 'Olá, você está funcionando? Responda apenas "Sim, estou funcionando perfeitamente!"'
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });

    console.log('Status da resposta:', response.status);
    console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API:', response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Resposta completa da API:', JSON.stringify(data, null, 2));
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      console.log('💬 Mensagem do agente:', data.choices[0].message.content);
    }
    
    console.log('🎉 Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Executar o teste
testGroqAPI();