// Script para testar busca semântica com embeddings do Google
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Função para gerar embedding
async function generateEmbedding(text) {
  try {
    const model = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('❌ Erro ao gerar embedding:', error.message);
    return null;
  }
}

// Função de similaridade coseno
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

// Dados de teste
const testData = {
  query: "Qual o horário de funcionamento?",
  chunks: [
    "Hoje vamos falar sobre o sistema de agendamento de consultas.",
    "O atendimento funciona de segunda a sexta-feira, das 8h às 18h.",
    "Para agendar, você precisa ligar para o número 11 99999-9999.",
    "É importante ter em mãos o número do cartão do convênio.",
    "Nos finais de semana e feriados, estamos fechados.",
    "O horário de almoço é das 12h às 13h, mas continuamos atendendo."
  ]
};

async function testSemanticSearch() {
  console.log('🧪 TESTE DE BUSCA SEMÂNTICA COM GOOGLE EMBEDDINGS');
  console.log('='.repeat(60));
  console.log('\n📝 Pergunta:', testData.query);
  console.log('\n📚 Chunks disponíveis:');
  testData.chunks.forEach((chunk, i) => {
    console.log(`  ${i + 1}. "${chunk}"`);
  });
  
  console.log('\n🔍 Gerando embeddings...');
  
  // Gerar embedding da query
  console.log('\n1️⃣ Embedding da query...');
  const queryEmbedding = await generateEmbedding(testData.query);
  
  if (!queryEmbedding) {
    console.error('❌ Falha ao gerar embedding da query');
    return;
  }
  
  console.log(`✅ Query embedding: ${queryEmbedding.length} dimensões`);
  
  // Gerar embeddings dos chunks e calcular similaridade
  console.log('\n2️⃣ Calculando similaridade com cada chunk...\n');
  
  const results = [];
  
  for (let i = 0; i < testData.chunks.length; i++) {
    const chunk = testData.chunks[i];
    const chunkEmbedding = await generateEmbedding(chunk);
    
    if (chunkEmbedding) {
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
      results.push({
        index: i + 1,
        chunk,
        similarity,
        percentage: (similarity * 100).toFixed(2)
      });
      
      console.log(`Chunk ${i + 1}: ${similarity.toFixed(4)} (${(similarity * 100).toFixed(2)}%)`);
    }
  }
  
  // Ordenar por similaridade
  results.sort((a, b) => b.similarity - a.similarity);
  
  console.log('\n📊 RANKING DE RELEVÂNCIA:');
  console.log('='.repeat(60));
  
  results.forEach((result, i) => {
    const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    console.log(`${emoji} #${result.index} - ${result.percentage}% - "${result.chunk}"`);
  });
  
  console.log('\n🎯 TOP 3 CHUNKS MAIS RELEVANTES:');
  console.log('='.repeat(60));
  
  results.slice(0, 3).forEach((result, i) => {
    console.log(`\n[${i + 1}] Similaridade: ${result.percentage}%`);
    console.log(`    "${result.chunk}"`);
  });
  
  console.log('\n✅ Teste concluído com sucesso!');
  console.log('\n💡 OBSERVAÇÕES:');
  console.log('   - Chunks 2, 5 e 6 deveriam ter maior relevância');
  console.log('   - Busca semântica entende "horário" relacionado a "funcionamento"');
  console.log('   - Não depende de palavras-chave exatas');
  console.log('   - Entende contexto e sinônimos');
}

// Executar teste
testSemanticSearch().catch(error => {
  console.error('❌ Erro no teste:', error);
  process.exit(1);
});
