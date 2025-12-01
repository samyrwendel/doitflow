// Teste específico de similaridade entre pergunta e chunks
const testSimilarity = async () => {
  const testData = {
    message: "qual o horário de funcionamento para agendamento?",
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

  try {
    console.log('=== TESTE DE SIMILARIDADE ===');
    console.log('Pergunta:', testData.message);
    console.log('Chunks disponíveis:');
    testData.ragDocuments[0].chunks.forEach((chunk, index) => {
      console.log(`${index + 1}: ${chunk}`);
    });
    
    const response = await fetch('http://localhost:3004/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('\n=== RESPOSTA ===');
    console.log('Status:', response.status);
    console.log('Resposta:', result.response);
    
    if (result.ragInfo) {
      console.log('\n=== INFORMAÇÕES RAG ===');
      console.log('Chunks encontrados:', result.ragInfo.chunksFound);
      console.log('Chunks relevantes:', result.ragInfo.relevantChunks);
    }

  } catch (error) {
    console.error('Erro no teste:', error);
  }
};

testSimilarity();