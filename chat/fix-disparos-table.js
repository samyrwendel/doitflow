/**
 * Script para deletar e recriar a tabela 'disparos' no NocoDB
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
const META_URL = `${NOCODB_CONFIG.server}api/v1/db/meta/projects/${NOCODB_CONFIG.projectId}`;

const headers = {
  'xc-token': NOCODB_CONFIG.token,
  'Content-Type': 'application/json'
};

/**
 * Encontra o ID da tabela disparos
 */
async function findDisparosTableId() {
  try {
    const response = await fetch(`${META_URL}/tables`, {
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao listar tabelas: ${response.status}`);
    }
    
    const tables = await response.json();
    const disparosTable = tables.list?.find(table => table.table_name === 'disparos');
    
    return disparosTable?.id || null;
  } catch (error) {
    console.error('Erro ao encontrar tabela:', error);
    return null;
  }
}

/**
 * Deleta a tabela disparos
 */
async function deleteDisparosTable() {
  console.log('Procurando tabela disparos para deletar...');
  
  const tableId = await findDisparosTableId();
  if (!tableId) {
    console.log('Tabela disparos não encontrada para deletar');
    return;
  }
  
  console.log(`Deletando tabela disparos (ID: ${tableId})...`);
  
  try {
    const response = await fetch(`${META_URL}/tables/${tableId}`, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao deletar tabela: ${response.status} - ${errorText}`);
    }
    
    console.log('Tabela disparos deletada com sucesso!');
    
    // Aguarda um pouco para o processamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error('Erro ao deletar tabela:', error);
    throw error;
  }
}

/**
 * Cria a tabela 'disparos' no NocoDB
 */
async function createDisparosTable() {
  console.log('Criando nova tabela disparos...');
  
  const tableSchema = {
    table_name: 'disparos',
    title: 'Disparos',
    columns: [
      {
        column_name: 'id',
        title: 'ID',
        uidt: 'SingleLineText',
        pk: true,
        rqd: true
      },
      {
        column_name: 'remoteJid',
        title: 'Remote JID',
        uidt: 'SingleLineText',
        rqd: true
      },
      {
        column_name: 'body',
        title: 'Mensagem',
        uidt: 'LongText',
        rqd: true
      },
      {
        column_name: 'status',
        title: 'Status',
        uidt: 'SingleSelect',
        dtxp: "'sent','delivered','read','pending','error','DELIVERY_ACK','READ','SERVER_ACK'",
        rqd: true
      },
      {
        column_name: 'timestamp',
        title: 'Timestamp',
        uidt: 'DateTime',
        rqd: true
      },
      {
        column_name: 'updatedAt',
        title: 'Atualizado em',
        uidt: 'DateTime'
      }
    ]
  };

  try {
    const response = await fetch(`${META_URL}/tables`, {
      method: 'POST',
      headers,
      body: JSON.stringify(tableSchema)
    });

    const responseText = await response.text();
    console.log('Resposta da criação:', response.status, responseText);

    if (!response.ok) {
      throw new Error(`Erro ao criar tabela: ${response.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log('Tabela disparos criada com sucesso!');
    
    // Aguarda processamento
    console.log('Aguardando processamento da tabela...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return result;
  } catch (error) {
    console.error('Erro ao criar tabela:', error);
    throw error;
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
  for (const message of dbData.messages) {
    try {
      const disparoData = {
        id: message.id,
        remoteJid: message.remoteJid,
        body: message.body,
        status: message.status,
        timestamp: message.timestamp,
        updatedAt: message.updatedAt || message.timestamp
      };
      
      const response = await fetch(`${BASE_URL}/disparos`, {
        method: 'POST',
        headers,
        body: JSON.stringify(disparoData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      successCount++;
      if (successCount % 10 === 0) {
        console.log(`Migrados ${successCount} registros...`);
      }
      
    } catch (error) {
      console.error(`Erro ao migrar registro ${message.id}:`, error.message);
      errorCount++;
      
      // Para após muitos erros consecutivos
      if (errorCount > 5 && successCount === 0) {
        console.log('Muitos erros consecutivos, parando migração...');
        break;
      }
    }
  }
  
  console.log(`Migração concluída: ${successCount} sucessos, ${errorCount} erros`);
}

/**
 * Função principal
 */
async function main() {
  try {
    console.log('Iniciando processo de recriação da tabela disparos...');
    
    // Deleta a tabela existente
    await deleteDisparosTable();
    
    // Cria a nova tabela
    await createDisparosTable();
    
    // Migra os dados
    await migrateData();
    
    console.log('Processo concluído com sucesso!');
    
  } catch (error) {
    console.error('Erro no processo:', error);
    process.exit(1);
  }
}

// Executa o script
main();