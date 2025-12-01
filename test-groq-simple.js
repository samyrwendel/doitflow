import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: 'YOUR_GROQ_API_KEY',
});

async function testGroqAPI() {
  try {
    console.log('Testando API do Groq...');
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: "Diga apenas 'Olá, API funcionando!'"
        }
      ],
      model: "llama-3.3-70b-versatile",
    });

    console.log('✅ API do Groq funcionando!');
    console.log('Resposta:', completion.choices[0]?.message?.content);
  } catch (error) {
    console.error('❌ Erro na API do Groq:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (error.error) {
      console.error('Detalhes:', error.error);
    }
  }
}

testGroqAPI();