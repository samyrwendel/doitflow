// Teste do endpoint de chat com RAG
const testChatEndpoint = async () => {
  const testData = {
    message: "me fala sobre o agendamento",
    ragDocuments: [
      {
        id: "test-doc-1",
        title: "Transcrição de Teste",
        content: "Hoje vamos falar sobre agendamento de consultas. O sistema permite agendar consultas médicas de segunda a sexta-feira, das 8h às 18h. Para agendar, você precisa ligar para o número 11 99999-9999 ou usar o aplicativo móvel. É importante ter em mãos o número do cartão do convênio e um documento de identidade.",
        chunks: [
          "Hoje vamos falar sobre agendamento de consultas.",
          "O sistema permite agendar consultas médicas de segunda a sexta-feira, das 8h às 18h.",
          "Para agendar, você precisa ligar para o número 11 99999-9999 ou usar o aplicativo móvel.",
          "É importante ter em mãos o número do cartão do convênio e um documento de identidade."
        ],
        createdAt: new Date().toISOString(),
        sourceFileName: "test-audio.mp3"
      }
    ]
  };

  // Teste adicional com dados vazios para simular o problema
  const testDataEmpty = {
    message: "me fala sobre o agendamento",
    ragDocuments: []
  };

  try {
    console.log('=== TESTE 1: COM DADOS ===');
    console.log('Enviando requisição para /api/chat...');
    console.log('Dados:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:3004/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('\n=== RESPOSTA DO SERVIDOR (COM DADOS) ===');
    console.log(result);

    console.log('\n\n=== TESTE 2: SEM DADOS (SIMULANDO PROBLEMA) ===');
    console.log('Dados vazios:', JSON.stringify(testDataEmpty, null, 2));
    
    const response2 = await fetch('http://localhost:3004/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDataEmpty)
    });

    if (!response2.ok) {
      throw new Error(`HTTP error! status: ${response2.status}`);
    }

    const result2 = await response2.json();
    console.log('\n=== RESPOSTA DO SERVIDOR (SEM DADOS) ===');
    console.log(result2);
    
  } catch (error) {
    console.error('Erro ao testar endpoint:', error);
  }
};

testChatEndpoint();