const https = require('https');
const http = require('http');

// Configurações da API Evolution
const API_URL = 'https://evo.sofia.ms';
const API_KEY = '5d4abf38a96ca3de7e0aa181f30e8145';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
        ...options.headers
      },
      ...options
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`);
        console.log(`📋 Content-Type: ${res.headers['content-type']}`);
        
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (error) {
          console.log(`❌ Erro ao fazer parse do JSON: ${error.message}`);
          console.log(`📄 Resposta recebida: ${data.substring(0, 200)}...`);
          resolve({ status: res.statusCode, data: data, headers: res.headers, isJson: false });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testQRCodeGeneration() {
  console.log('🧪 Testando geração de QR Code...\n');
  
  try {
    // 1. Listar instâncias existentes
    console.log('1️⃣ Listando instâncias existentes...');
    const instancesResponse = await makeRequest(`${API_URL}/instance/fetchInstances`);
    
    if (instancesResponse.status === 200 && instancesResponse.data) {
      console.log('✅ Instâncias encontradas:', instancesResponse.data.length);
      
      if (instancesResponse.data.length > 0) {
        console.log('\n📋 Status de todas as instâncias:');
        
        let disconnectedInstance = null;
        
        instancesResponse.data.forEach((instance, index) => {
          const instanceName = instance.name || instance.instanceName || instance.instance?.instanceName;
          const status = instance.connectionStatus || instance.status || instance.instance?.status;
          
          console.log(`${index + 1}. ${instanceName}: ${status}`);
          
          // Procurar por instância desconectada
          if (status !== 'open' && !disconnectedInstance) {
            disconnectedInstance = { name: instanceName, status };
          }
        });
        
        // 2. Testar com instância desconectada se houver
        if (disconnectedInstance) {
          console.log(`\n2️⃣ Testando QR Code com instância desconectada: ${disconnectedInstance.name} (${disconnectedInstance.status})`);
          
          const qrResponse = await makeRequest(`${API_URL}/instance/connect/${disconnectedInstance.name}`);
          
          console.log(`📊 Status da resposta QR: ${qrResponse.status}`);
          
          if (qrResponse.status === 200 && qrResponse.data) {
            console.log('✅ Resposta QR recebida com sucesso');
            console.log('🔍 Campos disponíveis:', Object.keys(qrResponse.data));
            
            // Verificar se tem o campo 'code' (base64)
            if (qrResponse.data.code) {
              console.log('✅ Campo "code" encontrado (base64)');
              console.log(`📏 Tamanho do base64: ${qrResponse.data.code.length} caracteres`);
              console.log(`🔤 Primeiros 50 chars: ${qrResponse.data.code.substring(0, 50)}...`);
              
              // Verificar se é base64 válido
              try {
                const decoded = Buffer.from(qrResponse.data.code, 'base64');
                console.log(`✅ Base64 válido, tamanho decodificado: ${decoded.length} bytes`);
              } catch (error) {
                console.log(`❌ Base64 inválido: ${error.message}`);
              }
            } else {
              console.log('❌ Campo "code" não encontrado');
            }
            
            // Verificar se tem o campo 'qrcode' (URL)
            if (qrResponse.data.qrcode) {
              console.log('✅ Campo "qrcode" encontrado (URL)');
              console.log(`🔗 URL: ${qrResponse.data.qrcode}`);
            } else {
              console.log('❌ Campo "qrcode" não encontrado');
            }
            
            // Verificar se tem o campo 'pairingCode'
            if (qrResponse.data.pairingCode) {
              console.log('✅ Campo "pairingCode" encontrado');
              console.log(`🔢 Código: ${qrResponse.data.pairingCode}`);
            } else {
              console.log('❌ Campo "pairingCode" não encontrado');
            }
            
            console.log('\n📋 Resposta completa:');
            console.log(JSON.stringify(qrResponse.data, null, 2));
            
          } else {
            console.log('❌ Erro ao obter QR Code');
            console.log('📄 Resposta:', qrResponse.data);
          }
        } else {
          console.log('\n⚠️ Todas as instâncias estão conectadas (status "open")');
          console.log('💡 QR Code só é gerado para instâncias desconectadas');
        }
      } else {
        console.log('⚠️ Nenhuma instância encontrada');
        
        // 3. Criar uma instância de teste
        console.log('\n3️⃣ Criando instância de teste...');
        const createResponse = await makeRequest(`${API_URL}/instance/create`, {
          method: 'POST',
          body: {
            instanceName: 'teste-qr-' + Date.now(),
            token: 'teste-token',
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
            rejectCall: false,
            msgCall: '',
            groupsIgnore: true,
            alwaysOnline: false,
            readMessages: false,
            readStatus: false,
            syncFullHistory: false
          }
        });
        
        console.log(`📊 Status da criação: ${createResponse.status}`);
        if (createResponse.status === 201 && createResponse.data) {
          console.log('✅ Instância criada com sucesso');
          console.log('🔍 Campos disponíveis:', Object.keys(createResponse.data));
          console.log('\n📋 Resposta da criação:');
          console.log(JSON.stringify(createResponse.data, null, 2));
        } else {
          console.log('❌ Erro ao criar instância');
          console.log('📄 Resposta:', createResponse.data);
        }
      }
    } else {
      console.log('❌ Erro ao listar instâncias');
      console.log('📄 Resposta:', instancesResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar o teste
testQRCodeGeneration();