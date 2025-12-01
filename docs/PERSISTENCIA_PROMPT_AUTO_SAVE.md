# Sistema de Persistência Automática de Prompts

## 📋 Problema Resolvido

Antes, quando o usuário editava o prompt de um agente no editor e atualizava a página, o prompt era perdido porque apenas o estado local (`promptText`) era atualizado, mas não era salvo no banco de dados.

## ✅ Solução Implementada

### 1. Auto-Save com Debounce

Implementamos um sistema de salvamento automático que:
- Salva o prompt no banco de dados automaticamente enquanto o usuário digita
- Usa debounce de 1 segundo para evitar requisições excessivas
- Atualiza o campo `system_prompt` do agente selecionado
- Funciona silenciosamente em segundo plano

### 2. Código Implementado

**Arquivo: `src/App.tsx`**

```typescript
// Função para salvar prompt no agente selecionado (com debounce)
const handlePromptChange = (newPrompt: string) => {
  setPromptText(newPrompt)
  
  // Salvar no agente selecionado
  if (selectedAgentId) {
    // Debounce: aguardar 1 segundo após parar de digitar
    if ((window as any).promptSaveTimeout) {
      clearTimeout((window as any).promptSaveTimeout)
    }
    
    (window as any).promptSaveTimeout = setTimeout(async () => {
      try {
        await handleUpdateAgentFull(selectedAgentId, { systemPrompt: newPrompt })
        console.log('✅ Prompt salvo automaticamente')
      } catch (error) {
        console.error('❌ Erro ao salvar prompt:', error)
      }
    }, 1000)
  }
}
```

**Alteração no PromptEditorModal:**

```typescript
// Antes:
onChange={setPromptText}

// Depois:
onChange={handlePromptChange}
```

## 🔄 Fluxo de Funcionamento

1. **Usuário digita no editor de prompt**
   - `onChange` é chamado a cada caractere digitado
   - `handlePromptChange` atualiza o estado local imediatamente
   - Timer de debounce é reiniciado

2. **Usuário para de digitar por 1 segundo**
   - Timer de debounce completa
   - `handleUpdateAgentFull` é chamado
   - Envia `PUT /api/agents/:agentId` com `{ systemPrompt: newPrompt }`

3. **Backend processa a atualização**
   - `server.cjs` recebe a requisição
   - Valida autenticação e autorização
   - Chama `db.updateAgent(agentId, userId, { systemPrompt })`

4. **Banco de dados atualizado**
   - Campo `system_prompt` da tabela `ai_agents` é atualizado
   - Timestamp `updated_at` é automaticamente atualizado

5. **Ao recarregar a página**
   - `loadAgents()` busca todos os agentes do usuário
   - `handleSelectAgent()` carrega o `systemPrompt` do agente
   - Prompt é restaurado corretamente

## 📊 Estrutura do Banco de Dados

**Tabela: `ai_agents`**
```sql
CREATE TABLE ai_agents (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,           -- Campo onde o prompt é salvo
  model TEXT DEFAULT 'gemini-2.5-flash',
  temperature REAL DEFAULT 0.7,
  avatar_emoji TEXT,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🎯 Benefícios

1. **Persistência Automática**: Prompts nunca são perdidos
2. **UX Melhorada**: Salvamento silencioso sem interrupções
3. **Performance**: Debounce evita sobrecarga do servidor
4. **Simplicidade**: Usuário não precisa clicar em "Salvar"
5. **Multi-Agente**: Cada agente mantém seu próprio prompt

## 🔍 Verificação

Para verificar se está funcionando:

1. Abra o console do navegador (F12)
2. Edite o prompt de um agente
3. Aguarde 1 segundo após parar de digitar
4. Veja a mensagem: `✅ Prompt salvo automaticamente`
5. Recarregue a página (F5)
6. Selecione o mesmo agente
7. O prompt estará preservado

## 📝 Logs

**Console do navegador:**
```
✅ Prompt salvo automaticamente
```

**Console do servidor:**
```
[UPDATE AGENT] Dados recebidos: { systemPrompt: '...' }
✅ Agente atualizado: agent_123456
```

## 🚀 Próximos Passos (Opcional)

- [ ] Adicionar indicador visual de "Salvando..."
- [ ] Mostrar confirmação visual após salvar
- [ ] Implementar histórico de versões do prompt
- [ ] Adicionar opção de desfazer alterações
- [ ] Sincronização em tempo real entre múltiplas abas

## 🛠️ Manutenção

- **Tempo de debounce**: Ajustável em `handlePromptChange` (atualmente 1000ms)
- **Endpoint backend**: `PUT /api/agents/:agentId`
- **Função DB**: `db.updateAgent(agentId, userId, data)`
- **Campo DB**: `ai_agents.system_prompt`
