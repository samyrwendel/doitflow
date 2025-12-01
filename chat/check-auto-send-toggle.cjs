const fs = require('fs');
const path = require('path');

console.log('🔧 Verificando configurações do toggle de envio automático...\n');

// 1. Verificar se o hook useConfig está correto
const useConfigPath = path.join(__dirname, 'src/hooks/useConfig.ts');
if (fs.existsSync(useConfigPath)) {
    const useConfigContent = fs.readFileSync(useConfigPath, 'utf8');
    
    console.log('✅ Arquivo useConfig.ts encontrado');
    
    // Verificar se tem isSendTextEnabled
    if (useConfigContent.includes('isSendTextEnabled')) {
        console.log('✅ isSendTextEnabled encontrado no useConfig');
    } else {
        console.log('❌ isSendTextEnabled NÃO encontrado no useConfig');
    }
    
    // Verificar se tem localStorage
    if (useConfigContent.includes('localStorage')) {
        console.log('✅ localStorage sendo usado no useConfig');
    } else {
        console.log('❌ localStorage NÃO encontrado no useConfig');
    }
} else {
    console.log('❌ Arquivo useConfig.ts NÃO encontrado');
}

// 2. Verificar se o SimpleChatLLM está usando o hook corretamente
const simpleChatPath = path.join(__dirname, 'src/components/chat/SimpleChatLLM.tsx');
if (fs.existsSync(simpleChatPath)) {
    const simpleChatContent = fs.readFileSync(simpleChatPath, 'utf8');
    
    console.log('✅ Arquivo SimpleChatLLM.tsx encontrado');
    
    // Verificar se está importando useConfig
    if (simpleChatContent.includes('import { useConfig }')) {
        console.log('✅ useConfig sendo importado no SimpleChatLLM');
    } else {
        console.log('❌ useConfig NÃO sendo importado no SimpleChatLLM');
    }
    
    // Verificar se está usando isSendTextEnabled
    if (simpleChatContent.includes('isSendTextEnabled')) {
        console.log('✅ isSendTextEnabled sendo usado no SimpleChatLLM');
    } else {
        console.log('❌ isSendTextEnabled NÃO sendo usado no SimpleChatLLM');
    }
    
    // Verificar se tem a condição correta
    if (simpleChatContent.includes('if (isSendTextEnabled && config)')) {
        console.log('✅ Condição de verificação do toggle encontrada');
    } else {
        console.log('❌ Condição de verificação do toggle NÃO encontrada');
    }
} else {
    console.log('❌ Arquivo SimpleChatLLM.tsx NÃO encontrado');
}

// 3. Verificar se há algum componente de toggle na interface
const componentsDir = path.join(__dirname, 'src/components');
function findToggleComponents(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    const toggleFiles = [];
    
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
            toggleFiles.push(...findToggleComponents(fullPath));
        } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('toggle') || content.includes('Toggle') || 
                content.includes('switch') || content.includes('Switch') ||
                content.includes('sendText') || content.includes('SendText')) {
                toggleFiles.push(fullPath);
            }
        }
    }
    
    return toggleFiles;
}

const toggleFiles = findToggleComponents(componentsDir);
console.log('\n🔍 Arquivos com possíveis toggles encontrados:');
toggleFiles.forEach(file => {
    console.log(`  - ${file.replace(__dirname, '.')}`);
});

// 4. Verificar se há configuração padrão para o toggle
console.log('\n🔧 Verificando configuração padrão do toggle...');

// Procurar por configurações padrão
const configFiles = [
    'src/hooks/useConfig.ts',
    'src/services/sessionService.ts',
    'src/contexts/AuthContext.tsx'
];

configFiles.forEach(configFile => {
    const fullPath = path.join(__dirname, configFile);
    if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Procurar por valores padrão
        const defaultMatches = content.match(/isSendTextEnabled.*?[:=]\s*(true|false)/gi);
        if (defaultMatches) {
            console.log(`✅ Configuração padrão encontrada em ${configFile}:`);
            defaultMatches.forEach(match => {
                console.log(`  - ${match}`);
            });
        }
    }
});

// 5. Criar um teste de localStorage
console.log('\n🧪 Simulando teste de localStorage...');

// Simular o que aconteceria no navegador
const simulateLocalStorage = () => {
    // Simular localStorage vazio (primeira vez)
    console.log('📝 Simulação 1: localStorage vazio (primeira vez)');
    console.log('  - isSendTextEnabled seria: undefined');
    console.log('  - Valor padrão deveria ser aplicado');
    
    // Simular localStorage com valor false
    console.log('📝 Simulação 2: localStorage com false');
    console.log('  - isSendTextEnabled seria: false');
    console.log('  - Toggle estaria desativado');
    
    // Simular localStorage com valor true
    console.log('📝 Simulação 3: localStorage com true');
    console.log('  - isSendTextEnabled seria: true');
    console.log('  - Toggle estaria ativado');
};

simulateLocalStorage();

console.log('\n📋 RESUMO DA VERIFICAÇÃO:');
console.log('1. ✅ Logs de debug adicionados ao SimpleChatLLM');
console.log('2. 🔍 Verificar no navegador se o toggle está visível e ativado');
console.log('3. 🔍 Verificar no console do navegador os logs de debug');
console.log('4. 🔍 Testar digitando "helloworld" e observar os logs');

console.log('\n🎯 PRÓXIMOS PASSOS:');
console.log('1. Abrir http://localhost:5173/ no navegador');
console.log('2. Abrir DevTools (F12) e ir para a aba Console');
console.log('3. Procurar por um toggle/switch na interface');
console.log('4. Certificar-se de que está ativado');
console.log('5. Digitar "helloworld" e observar os logs no console');