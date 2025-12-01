const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE_URL = 'http://localhost:3004';

async function testDocumentUpload() {
  try {
    console.log('🧪 TESTE: Upload de Documento\n');

    // 1. Login
    console.log('🔐 Fazendo login...');
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Falha no login');
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login realizado com sucesso\n');

    // 2. Upload do documento
    console.log('📄 Fazendo upload do documento de teste...');
    const fileName = process.argv[2] || 'test-document.txt';
    const filePath = path.join(__dirname, fileName);
    const fileStream = fs.createReadStream(filePath);
    const fileStats = fs.statSync(filePath);
    
    const formData = new FormData();
    formData.append('document', fileStream, {
      filename: fileName,
      contentType: fileName.endsWith('.pdf') ? 'application/pdf' : 'text/plain'
    });

    console.log(`   Arquivo: ${fileName} (${fileStats.size} bytes)`);

    const uploadResponse = await fetch(`${API_BASE_URL}/api/upload-document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`Upload falhou: ${errorData.error}`);
    }

    const result = await uploadResponse.json();
    console.log('✅ Upload concluído com sucesso!\n');

    // 3. Exibir resultados
    console.log('📊 RESULTADOS:');
    console.log('════════════════════════════════════════════');
    console.log(`ID do Documento: ${result.document.id}`);
    console.log(`Título: ${result.document.title}`);
    console.log(`Tipo: ${result.document.fileType}`);
    console.log(`Tamanho: ${(result.document.fileSize / 1024).toFixed(2)} KB`);
    console.log(`Chunks gerados: ${result.document.chunkCount}`);
    console.log(`Caracteres extraídos: ${result.document.characterCount.toLocaleString()}`);
    console.log(`Custo embeddings: $${result.document.embeddingCost.toFixed(6)}`);
    console.log('════════════════════════════════════════════\n');

    // 4. Exibir primeiros chunks
    console.log('📝 PRIMEIROS 3 CHUNKS:');
    console.log('════════════════════════════════════════════');
    result.document.chunks.slice(0, 3).forEach((chunk, index) => {
      console.log(`\n[Chunk ${index + 1}]`);
      console.log(chunk.substring(0, 150) + (chunk.length > 150 ? '...' : ''));
    });
    console.log('\n════════════════════════════════════════════');

    // 5. Verificar se documento está listado
    console.log('\n📚 Verificando lista de documentos RAG...');
    const listResponse = await fetch(`${API_BASE_URL}/api/rag-documents`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const listData = await listResponse.json();
    const documents = Array.isArray(listData) ? listData : (listData.documents || []);
    const uploadedDoc = documents.find(doc => doc.id === result.document.id);
    
    if (uploadedDoc) {
      console.log('✅ Documento encontrado na lista de RAG documents!');
      console.log(`   Fonte: ${uploadedDoc.source || 'N/A'}`);
      console.log(`   Chunks: ${uploadedDoc.chunks.length}`);
    } else {
      console.log('⚠️ Documento não encontrado na lista');
    }

    console.log('\n✨ TESTE CONCLUÍDO COM SUCESSO! ✨');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Executar teste
testDocumentUpload();
