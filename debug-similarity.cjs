// Script para debugar a função calculateSimilarity
const fs = require('fs');

// Função corrigida do server.cjs
function calculateSimilarity(text1, text2) {
    // Remove pontuação e normaliza o texto
    const normalize = (text) => text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove pontuação
      .split(/\s+/)
      .filter(word => word.length > 0); // Remove palavras vazias
    
    const words1 = normalize(text1);
    const words2 = normalize(text2);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
}

// Teste com dados reais
const query = "Sofia";
const chunk1 = "Essa é a Sofia, é um software com inteligência artificial";

console.log("=== DEBUG SIMILARITY FUNCTION ===");
console.log("Query:", query);
console.log("Chunk:", chunk1);
console.log("");

// Análise detalhada
const normalize = (text) => text.toLowerCase()
  .replace(/[^\w\s]/g, '') // Remove pontuação
  .split(/\s+/)
  .filter(word => word.length > 0); // Remove palavras vazias

const words1 = normalize(query);
const words2 = normalize(chunk1);

console.log("Words from query:", words1);
console.log("Words from chunk:", words2);
console.log("");

const intersection = words1.filter(word => words2.includes(word));
const union = [...new Set([...words1, ...words2])];

console.log("Intersection:", intersection);
console.log("Union:", union);
console.log("Intersection length:", intersection.length);
console.log("Union length:", union.length);
console.log("");

const similarity = calculateSimilarity(query, chunk1);
console.log("Calculated similarity:", similarity);
console.log("Similarity percentage:", (similarity * 100).toFixed(2) + "%");

// Teste com diferentes queries
console.log("\n=== TESTING DIFFERENT QUERIES ===");
const testQueries = [
    "Sofia",
    "O que é a Sofia?",
    "Como funciona o agendamento?",
    "agendamento",
    "software",
    "inteligência artificial"
];

testQueries.forEach(testQuery => {
    const sim = calculateSimilarity(testQuery, chunk1);
    console.log(`"${testQuery}" -> ${(sim * 100).toFixed(2)}%`);
});