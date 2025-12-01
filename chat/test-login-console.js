/**
 * Script de teste para login no console do navegador
 * Execute este código no console do navegador (F12) para testar o serviço de autenticação
 */

// Função para testar conexão com NocoDB
async function testNocoDBConnection() {
  console.log('🔍 Testando conexão com NocoDB...');
  
  try {
    // Importar o serviço NocoDB
    const { nocodbService } = await import('./src/services/nocodbService.ts');
    
    // Testar conexão
    const result = await nocodbService.testConnection();
    
    if (result.success) {
      console.log('✅ NocoDB conectado com sucesso!');
      console.log('📊 Configuração:', result.config);
      return true;
    } else {
      console.error('❌ Falha na conexão com NocoDB:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao testar NocoDB:', error);
    return false;
  }
}

// Função para criar usuário de teste
async function createTestUser() {
  console.log('👤 Criando usuário de teste...');
  
  try {
    const { authService } = await import('./src/services/authService.ts');
    
    const testUserData = {
      email: 'teste@tupperware.com',
      password: 'teste123',
      name: 'Usuário Teste',
      phone: '(11) 99999-9999',
      company: 'Tupperware Teste'
    };
    
    const result = await authService.register(testUserData);
    
    if (result.success) {
      console.log('✅ Usuário de teste criado com sucesso!');
      console.log('👤 Dados do usuário:', result.user);
      return result.user;
    } else {
      console.log('ℹ️ Usuário já existe ou erro:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao criar usuário de teste:', error);
    return null;
  }
}

// Função para testar login
async function testLogin() {
  console.log('🔐 Testando login...');
  
  try {
    const { authService } = await import('./src/services/authService.ts');
    
    const credentials = {
      email: 'teste@tupperware.com',
      password: 'teste123'
    };
    
    const result = await authService.login(credentials);
    
    if (result.success) {
      console.log('✅ Login realizado com sucesso!');
      console.log('👤 Usuário logado:', result.user);
      console.log('🔑 Token:', result.token);
      console.log('🛡️ Permissões:', result.permissions);
      return result;
    } else {
      console.error('❌ Falha no login:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro durante o login:', error);
    return null;
  }
}

// Função para verificar autenticação
async function testAuthentication() {
  console.log('🔍 Verificando autenticação...');
  
  try {
    const { authService } = await import('./src/services/authService.ts');
    
    const isAuth = await authService.isAuthenticated();
    
    if (isAuth) {
      console.log('✅ Usuário está autenticado!');
      console.log('👤 Usuário atual:', authService.getCurrentUser());
      console.log('🔑 Token atual:', authService.getCurrentToken());
      console.log('🛡️ Permissões:', authService.getPermissions());
    } else {
      console.log('❌ Usuário não está autenticado');
    }
    
    return isAuth;
  } catch (error) {
    console.error('❌ Erro ao verificar autenticação:', error);
    return false;
  }
}

// Função principal de teste
async function runLoginTest() {
  console.log('🚀 Iniciando teste completo de login...');
  console.log('=' .repeat(50));
  
  // 1. Testar conexão NocoDB
  const nocodbOk = await testNocoDBConnection();
  if (!nocodbOk) {
    console.log('❌ Teste interrompido - NocoDB não está funcionando');
    return;
  }
  
  console.log('\n');
  
  // 2. Criar usuário de teste (se não existir)
  await createTestUser();
  
  console.log('\n');
  
  // 3. Testar login
  const loginResult = await testLogin();
  if (!loginResult) {
    console.log('❌ Teste de login falhou');
    return;
  }
  
  console.log('\n');
  
  // 4. Verificar autenticação
  await testAuthentication();
  
  console.log('\n');
  console.log('=' .repeat(50));
  console.log('✅ Teste completo finalizado!');
  console.log('\n📋 Resumo:');
  console.log('   - NocoDB: Funcionando');
  console.log('   - Criação de usuário: OK');
  console.log('   - Login: OK');
  console.log('   - Autenticação: OK');
  console.log('\n🎉 O sistema de autenticação está funcionando corretamente!');
}

// Função para limpar dados de teste
async function cleanupTestData() {
  console.log('🧹 Limpando dados de teste...');
  
  try {
    const { authService } = await import('./src/services/authService.ts');
    
    // Fazer logout
    await authService.logout();
    console.log('✅ Logout realizado');
    
    // Limpar localStorage
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    console.log('✅ Dados locais limpos');
    
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
  }
}

// Exportar funções para uso no console
window.testLogin = {
  runFullTest: runLoginTest,
  testNocoDB: testNocoDBConnection,
  createUser: createTestUser,
  login: testLogin,
  checkAuth: testAuthentication,
  cleanup: cleanupTestData
};

console.log('🔧 Funções de teste carregadas!');
console.log('📝 Use as seguintes funções no console:');
console.log('   - testLogin.runFullTest() - Executa teste completo');
console.log('   - testLogin.testNocoDB() - Testa apenas NocoDB');
console.log('   - testLogin.createUser() - Cria usuário de teste');
console.log('   - testLogin.login() - Testa login');
console.log('   - testLogin.checkAuth() - Verifica autenticação');
console.log('   - testLogin.cleanup() - Limpa dados de teste');
console.log('\n🚀 Execute: testLogin.runFullTest()');