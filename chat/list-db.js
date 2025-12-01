// Script para listar instâncias do banco IndexedDB

console.log('=== INSTÂNCIAS DO BANCO DE DADOS ===');
console.log('');
console.log('Para listar as instâncias do IndexedDB, execute este código no console do navegador (F12):');
console.log('');
console.log(`
(async function() {
    try {
        const dbRequest = indexedDB.open('EvolutionDB', 1);
        
        dbRequest.onsuccess = function(event) {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('instances')) {
                console.log('❌ Nenhuma tabela instances encontrada');
                return;
            }
            
            const transaction = db.transaction(['instances'], 'readonly');
            const store = transaction.objectStore('instances');
            const request = store.getAll();
            
            request.onsuccess = function() {
                const instances = request.result;
                console.log('📊 Total de instâncias:', instances.length);
                console.log('\n=== INSTÂNCIAS ===');
                
                if (instances.length === 0) {
                    console.log('✅ Nenhuma instância encontrada (banco limpo)');
                } else {
                    instances.forEach((instance, index) => {
                        console.log(\`\n🔹 Instância \${index + 1}:\`);
                        console.log('  ID:', instance.id);
                        console.log('  Nome:', instance.name);
                        console.log('  API Key:', instance.api_key);
                        console.log('  Evolution URL:', instance.evolution_url);
                        console.log('  Status:', instance.status);
                        console.log('  Criado em:', instance.created_at ? new Date(instance.created_at).toLocaleString() : 'N/A');
                    });
                }
            };
            
            request.onerror = function() {
                console.error('❌ Erro ao ler instâncias:', request.error);
            };
        };
        
        dbRequest.onerror = function() {
            console.error('❌ Erro ao abrir banco:', dbRequest.error);
        };
        
        dbRequest.onupgradeneeded = function() {
            console.log('⚠️ Banco de dados não existe ou precisa ser criado');
        };
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
})()
`);
console.log('');
console.log('=== VERIFICAR LOCALSTORAGE ===');
console.log('');
console.log('Para ver o localStorage, execute no console do navegador:');
console.log('JSON.parse(localStorage.getItem("enviador_config") || "null")');
console.log('');
console.log('=== ALTERNATIVA ===');
console.log('Ou abra o arquivo debug-storage.html que foi criado para ver tudo visualmente.');
console.log('');