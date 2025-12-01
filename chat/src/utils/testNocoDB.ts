/**
 * Utilitário para testar a conexão com NocoDB
 * Este arquivo pode ser usado para verificar se a integração está funcionando
 */

import { nocodbService } from '../services/nocodbService';

/**
 * Testa a conexão básica com o NocoDB
 */
export async function testNocoDBConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('🔄 Testando conexão com NocoDB...');
    
    // Teste 1: Verificar conexão básica
    const isConnected = await nocodbService.testConnection();
    if (!isConnected) {
      return {
        success: false,
        message: 'Falha na conexão básica com NocoDB'
      };
    }
    
    console.log('✅ Conexão básica estabelecida');
    
    // Teste 2: Obter informações do projeto
    const projectInfo = await nocodbService.getProjectInfo();
    console.log('✅ Informações do projeto obtidas:', projectInfo);
    
    // Teste 3: Listar tabelas
    const tables = await nocodbService.getTables();
    console.log('✅ Tabelas encontradas:', tables.length);
    
    return {
      success: true,
      message: `Conexão com NocoDB estabelecida com sucesso! Encontradas ${tables.length} tabelas.`,
      details: {
        projectInfo,
        tablesCount: tables.length,
        tables: tables.map((table: any) => ({
          id: table.id,
          title: table.title,
          table_name: table.table_name
        }))
      }
    };
    
  } catch (error) {
    console.error('❌ Erro ao testar conexão com NocoDB:', error);
    
    return {
      success: false,
      message: `Erro na conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      details: error
    };
  }
}

/**
 * Executa teste completo e exibe resultados no console
 */
export async function runNocoDBTest(): Promise<void> {
  console.log('🚀 Iniciando teste de integração com NocoDB...');
  console.log('=' .repeat(50));
  
  const result = await testNocoDBConnection();
  
  if (result.success) {
    console.log('🎉 TESTE PASSOU!');
    console.log(`✅ ${result.message}`);
    
    if (result.details) {
      console.log('\n📊 Detalhes:');
      console.log('- Projeto:', result.details.projectInfo?.title || 'N/A');
      console.log('- Tabelas disponíveis:', result.details.tablesCount);
      
      if (result.details.tables && result.details.tables.length > 0) {
        console.log('\n📋 Lista de tabelas:');
        result.details.tables.forEach((table: any, index: number) => {
          console.log(`  ${index + 1}. ${table.title} (${table.table_name})`);
        });
      }
    }
  } else {
    console.log('❌ TESTE FALHOU!');
    console.log(`🚫 ${result.message}`);
    
    if (result.details) {
      console.log('\n🔍 Detalhes do erro:');
      console.error(result.details);
    }
  }
  
  console.log('=' .repeat(50));
}

// Função para uso em desenvolvimento/debug
if (import.meta.env.DEV) {
  // Exporta função global para teste no console do navegador
  (window as any).testNocoDB = runNocoDBTest;
  console.log('🔧 Função testNocoDB() disponível no console para testes');
}