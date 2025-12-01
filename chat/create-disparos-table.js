/**
 * Script para criar tabela 'disparos' no NocoDB e migrar dados do db.json
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
 * Cria a tabela 'disparos' no NocoDB
 */
async function createDisparosTable() {
  console.log('Criando tabela disparos no NocoDB...');
  
  // Primeiro, vamos tentar listar as tabelas existentes para debug
  console.log('Verificando tabelas existentes...');
  try {
    const listResponse = await fetch(`${META_URL}/tables`, {
      headers
    });
    
    if (listResponse.ok) {
      const tables = await listResponse.json();
      console.log('Tabelas existentes:', tables.list?.map(t => t.table_name) || 'Nenhuma');
    }
  } catch (error) {
    console.log('Erro ao listar tabelas:', error.message);
  }
  
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
    console.log('Enviando requisição para criar tabela...');
    console.log('URL:', `${META_URL}/tables`);
    console.log('Schema:', JSON.stringify(tableSchema, null, 2));
    
    const response = await fetch(`${META_URL}/tables`, {
      method: 'POST',
      headers,
      body: JSON.stringify(tableSchema)
    });

    const responseText = await response.text();
    console.log('Resposta do servidor:', response.status, responseText);

    if (!response.ok) {
      throw new Error(`Erro ao criar tabela: ${response.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log('Tabela disparos criada com sucesso!');
    
    // Aguarda um pouco para a tabela ser processada
    console.log('Aguardando processamento da tabela...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
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
    }
  }
  
  console.log(`Migração concluída: ${successCount} sucessos, ${errorCount} erros`);
}

/**
 * Verifica se a tabela já existe
 */
async function checkTableExists() {
  try {
    console.log('Verificando se tabela disparos existe...');
    const response = await fetch(`${META_URL}/tables`, {
      headers
    });
    
    if (!response.ok) {
      console.log(`Erro ao listar tabelas: ${response.status}`);
      return false;
    }
    
    const tables = await response.json();
    console.log('Tabelas encontradas:', tables.list?.map(t => t.table_name) || []);
    
    const exists = tables.list?.some(table => table.table_name === 'disparos') || false;
    console.log('Tabela disparos existe?', exists);
    
    return exists;
  } catch (error) {
    console.error('Erro ao verificar tabelas:', error);
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    console.log('Iniciando processo de criação da tabela disparos...');
    
    // Verifica se a tabela já existe
    const tableExists = await checkTableExists();
    
    if (tableExists) {
      console.log('Tabela disparos já existe. Pulando criação...');
    } else {
      await createDisparosTable();
    }
    
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