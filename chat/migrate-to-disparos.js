/**
 * Script para migrar dados do db.json para a tabela disparos no NocoDB
 */

import fs from 'fs';
import path from 'path';

// Configurações do NocoDB
const NOCODB_CONFIG = {
  server: 'https://noco.sofia.ms/',
  projectId: 'pefjgqhwsd3w98b',
  token: 'bFINveFVQCaH0nE7zm7DopnHcOKMKUCCMBNBeaqB'
};

const BASE_URL = `${NOCODB_CONFIG.server}api/v1/db/data/v1/${NOCODB_CONFIG.projectId}`;

const headers = {
  'xc-token': NOCODB_CONFIG.token,
  'Content-Type': 'application/json'
};

/**
 * Testa se conseguimos acessar a tabela Disparos
 */
async function testTableAccess() {
  console.log('Testando acesso à tabela Disparos...');
  
  try {
    const response = await fetch(`${BASE_URL}/Disparos?limit=1`, {
      headers
    });
    
    console.log('Status da resposta:', response.status);
    const responseText = await response.text();
    console.log('Resposta:', responseText);
    
    if (response.ok) {
      console.log('✅ Tabela Disparos acessível!');
      return true;
    } else {
      console.log('❌ Tabela Disparos não acessível');
      return false;
    }
  } catch (error) {
    console.error('Erro ao testar acesso:', error);
    return false;
  }
}

/**
 * Limpa dados existentes na tabela (opcional)
 */
async function clearExistingData() {
  console.log('Verificando dados existentes...');
  
  try {
    const response = await fetch(`${BASE_URL}/Disparos`, {
      headers
    });
    
    if (!response.ok) {
      console.log('Não foi possível verificar dados existentes');
      return;
    }
    
    const data = await response.json();
    const existingRecords = data.list || [];
    
    console.log(`Encontrados ${existingRecords.length} registros existentes`);
    
    if (existingRecords.length > 0) {
      console.log('Limpando dados existentes...');
      
      for (const record of existingRecords) {
        try {
          const deleteResponse = await fetch(`${BASE_URL}/Disparos/${record.Id}`, {
            method: 'DELETE',
            headers
          });
          
          if (!deleteResponse.ok) {
            console.log(`Erro ao deletar registro ${record.Id}`);
          }
        } catch (error) {
          console.log(`Erro ao deletar registro ${record.Id}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.log('Erro ao limpar dados:', error.message);
  }
}

/**
 * Migra dados do db.json para a tabela disparos
 */
async function migrateData() {
  console.log('Migrando dados do db.json...');
  
  // Lê o arquivo db.json
  const dbPath = path.join(process.cwd(), 'tupperware-webhook', 'db.json');
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  console.log(`Encontrados ${dbData.messages.length} registros para migrar`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Migra cada mensagem
  for (const [index, message] of dbData.messages.entries()) {
    try {
      const disparoData = {
        id: message.id,
        remoteJid: message.remoteJid,
        body: message.body,
        status: message.status,
        timestamp: message.timestamp,
        updatedAt: message.updatedAt || message.timestamp
      };
      
      console.log(`Migrando registro ${index + 1}/${dbData.messages.length}: ${message.id}`);
      
      const response = await fetch(`${BASE_URL}/Disparos`, {
        method: 'POST',
        headers,
        body: JSON.stringify(disparoData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      successCount++;
      console.log(`✅ Sucesso: ${message.id}`);
      
      // Pequena pausa para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Erro ao migrar registro ${message.id}:`, error.message);
      errorCount++;
      
      // Para após muitos erros consecutivos
      if (errorCount > 10 && successCount === 0) {
        console.log('Muitos erros consecutivos, parando migração...');
        break;
      }
    }
  }
  
  console.log(`\n📊 Migração concluída: ${successCount} sucessos, ${errorCount} erros`);
  
  if (successCount > 0) {
    console.log('✅ Migração realizada com sucesso!');
  } else {
    console.log('❌ Nenhum registro foi migrado com sucesso');
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando migração de dados para tabela Disparos...\n');
    
    // Testa acesso à tabela
    const canAccess = await testTableAccess();
    if (!canAccess) {
      console.log('❌ Não foi possível acessar a tabela Disparos. Verifique se ela existe e está configurada corretamente.');
      return;
    }
    
    // Limpa dados existentes (opcional)
    await clearExistingData();
    
    // Migra os dados
    await migrateData();
    
    console.log('\n🎉 Processo concluído!');
    
  } catch (error) {
    console.error('💥 Erro no processo:', error);
    process.exit(1);
  }
}

// Executa o script
main();