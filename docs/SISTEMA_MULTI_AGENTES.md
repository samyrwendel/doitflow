# 🤖 Sistema Multi-Agentes - Documentação Completa

## 📋 Visão Geral

O sistema foi transformado de **mono-prompt** para **multi-agentes**, permitindo múltiplas IAs especializadas compartilhando a mesma base de conhecimento (RAGs).

---

## 🎯 Conceito

### **Antes (Mono-Prompt)**
```
┌─────────────────────┐
│   Prompt Único      │
│   + RAG             │
│   + Contexto        │
└─────────────────────┘
         ↓
    Chat Geral
```

### **Agora (Multi-Agentes)**
```
┌──────────────────────────────────────────┐
│         Base Compartilhada               │
│  ┌────────┐  ┌────────┐  ┌────────┐     │
│  │ RAG 1  │  │ RAG 2  │  │ RAG 3  │     │
│  └────────┘  └────────┘  └────────┘     │
└──────────────────────────────────────────┘
         ↓           ↓           ↓
    ┌─────────┬─────────┬─────────┐
    │ Agente  │ Agente  │ Agente  │
    │ Suporte │ Vendas  │ Conteúdo│
    └─────────┴─────────┴─────────┘
         ↓           ↓           ↓
    Contexto   Contexto   Contexto
    Separado   Separado   Separado
```

---

## 🏗️ Arquitetura

### **1. Banco de Dados**

#### **Tabela: `ai_agents`**
```sql
CREATE TABLE ai_agents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,              -- Ex: "Suporte Técnico"
    description TEXT,                 -- Ex: "Especialista em resolver problemas"
    system_prompt TEXT NOT NULL,      -- Prompt personalizado
    model TEXT,                       -- Ex: "llama-3.1-8b-instant"
    temperature REAL,                 -- Ex: 0.7
    max_tokens INTEGER,               -- Ex: 1000
    is_active BOOLEAN,
    is_default BOOLEAN,               -- Agente padrão do usuário
    avatar_emoji TEXT,                -- Ex: "🛠️"
    color TEXT,                       -- Ex: "#ef4444"
    created_at DATETIME,
    last_used_at DATETIME,
    usage_count INTEGER
);
```

#### **Tabela: `agent_chat_sessions`**
- Cada agente tem suas **próprias sessões de conversa**
- Contexto isolado por agente

#### **Tabela: `agent_messages`**
- Mensagens de cada agente
- Rastreamento de RAGs usados
- Metadados (tokens, custo, tempo)

#### **Tabela: `agent_rag_access`**
- Define quais RAGs cada agente pode acessar
- Prioridade de RAGs (1-10)
- Compartilhamento de conhecimento

#### **Tabela: `agent_statistics`**
- Estatísticas diárias por agente
- Total de mensagens, tokens, custo
- Tempo médio de resposta
- Queries RAG e buscas semânticas

---

## 🚀 Funcionalidades

### **1. Criar Agentes**
```javascript
POST /api/agents
{
  "name": "Consultor de Vendas",
  "description": "Especialista em vendas",
  "systemPrompt": "Você é um consultor de vendas experiente...",
  "model": "llama-3.1-8b-instant",
  "temperature": 0.7,
  "maxTokens": 1000,
  "avatarEmoji": "💼",
  "color": "#10b981"
}
```

### **2. Listar Agentes**
```javascript
GET /api/agents
→ Retorna todos os agentes do usuário
```

### **3. Chat com Agente Específico**
```javascript
POST /api/agents/:agentId/chat
{
  "message": "Como posso melhorar minhas vendas?",
  "sessionId": "session_xyz", // Opcional
  "ragDocumentIds": ["rag_123", "rag_456"] // Opcional
}
```

### **4. Gerenciar Acesso aos RAGs**
```javascript
// Conceder acesso
POST /api/agents/:agentId/rag-access
{
  "ragDocumentId": "rag_123",
  "priority": 5 // 1-10
}

// Revogar acesso
DELETE /api/agents/:agentId/rag-access/:ragDocumentId

// Listar RAGs do agente
GET /api/agents/:agentId/rag-access
```

### **5. Histórico e Sessões**
```javascript
// Mensagens do agente
GET /api/agents/:agentId/messages?sessionId=xyz&limit=50

// Sessões do agente
GET /api/agents/:agentId/sessions

// Estatísticas
GET /api/agents/:agentId/statistics?days=30
```

---

## 📊 Fluxo de Trabalho

### **Cenário: Empresa com 3 Departamentos**

#### **1. Criar Agentes**
```javascript
// Agente 1: Suporte Técnico
{
  name: "Suporte Técnico",
  systemPrompt: "Você resolve problemas técnicos...",
  emoji: "🛠️",
  color: "#ef4444"
}

// Agente 2: Consultor de Vendas
{
  name: "Consultor de Vendas",
  systemPrompt: "Você ajuda a fechar vendas...",
  emoji: "💼",
  color: "#10b981"
}

// Agente 3: Criador de Conteúdo
{
  name: "Criador de Conteúdo",
  systemPrompt: "Você cria conteúdo criativo...",
  emoji: "✍️",
  color: "#8b5cf6"
}
```

#### **2. Adicionar Conhecimento (RAGs)**
```javascript
// Upload documentos
- Manual Técnico → rag_manual
- Catálogo de Produtos → rag_produtos
- Guia de Estilo → rag_estilo
```

#### **3. Atribuir RAGs aos Agentes**
```javascript
// Suporte Técnico → Manual Técnico
POST /api/agents/agent_suporte/rag-access
{ ragDocumentId: "rag_manual", priority: 10 }

// Vendas → Catálogo de Produtos
POST /api/agents/agent_vendas/rag-access
{ ragDocumentId: "rag_produtos", priority: 10 }

// Conteúdo → Todos os documentos
POST /api/agents/agent_conteudo/rag-access
{ ragDocumentId: "rag_manual", priority: 5 }
{ ragDocumentId: "rag_produtos", priority: 8 }
{ ragDocumentId: "rag_estilo", priority: 10 }
```

#### **4. Conversar com Agentes**
```javascript
// Usuário A conversa com Suporte
POST /api/agents/agent_suporte/chat
{
  message: "Como configurar a ferramenta X?",
  sessionId: "session_userA_suporte"
}
→ Busca em "Manual Técnico"
→ Contexto isolado da conversa do Usuário A

// Usuário B conversa com Vendas
POST /api/agents/agent_vendas/chat
{
  message: "Qual o preço do produto Y?",
  sessionId: "session_userB_vendas"
}
→ Busca em "Catálogo de Produtos"
→ Contexto isolado da conversa do Usuário B
```

---

## 🎨 Interface (AgentsPanel.tsx)

### **Componente React**
```tsx
<AgentsPanel 
  authenticatedFetch={authenticatedFetch}
  onSelectAgent={(agentId) => {
    // Abrir chat com este agente
    setChatAgentId(agentId)
  }}
/>
```

### **Recursos da Interface**
- ✅ Criar novos agentes
- ✅ Editar agentes existentes
- ✅ Deletar agentes
- ✅ Definir agente padrão (⭐)
- ✅ Visualizar prompt do sistema
- ✅ Configurar modelo, temperature, max_tokens
- ✅ Escolher emoji e cor
- ✅ Ver estatísticas de uso

---

## 🔄 Compartilhamento de RAGs

### **Filosofia**
```
RAGs = Base de Conhecimento Compartilhada
Agentes = Especialistas com acesso controlado
Contexto = Isolado por agente e sessão
```

### **Exemplos**

#### **Caso 1: Acesso Total**
```javascript
// Agente "Assistente Geral" tem acesso a TODOS os RAGs
agentRagAccess = [
  { ragId: "rag_1", priority: 5 },
  { ragId: "rag_2", priority: 5 },
  { ragId: "rag_3", priority: 5 }
]
```

#### **Caso 2: Acesso Especializado**
```javascript
// Agente "Financeiro" só tem acesso a documentos financeiros
agentRagAccess = [
  { ragId: "rag_relatorios", priority: 10 },
  { ragId: "rag_contratos", priority: 8 }
]
```

#### **Caso 3: Acesso Priorizado**
```javascript
// Agente "Marketing" tem acesso a tudo, mas prioriza marketing
agentRagAccess = [
  { ragId: "rag_marketing", priority: 10 },  // Prioridade alta
  { ragId: "rag_produtos", priority: 7 },    // Média
  { ragId: "rag_tecnico", priority: 3 }      // Baixa
]
```

---

## 📈 Estatísticas

### **Por Agente**
```javascript
GET /api/agents/agent_123/statistics?days=30

→ Retorna:
{
  total_messages: 150,
  total_tokens: 45000,
  total_cost: 0.0225, // em USD
  average_response_time: 2.3, // segundos
  rag_queries: 120,
  semantic_searches: 95
}
```

### **Dashboard de Agentes**
```
┌─────────────────────────────────────────┐
│ Agente: Suporte Técnico 🛠️              │
├─────────────────────────────────────────┤
│ Mensagens hoje: 47                      │
│ Tempo médio: 2.1s                       │
│ Custo total: $0.014                     │
│ RAGs usados: Manual Técnico (32x)      │
└─────────────────────────────────────────┘
```

---

## 🔐 Segurança

### **Isolamento por Usuário**
```javascript
// Cada usuário só vê seus próprios agentes
SELECT * FROM ai_agents WHERE user_id = ?

// RAGs são compartilhados apenas dentro do usuário
SELECT * FROM rag_documents WHERE user_id = ?
```

### **Controle de Acesso**
```javascript
// Agentes não podem acessar RAGs sem permissão
SELECT ara.* 
FROM agent_rag_access ara
WHERE ara.agent_id = ? AND ara.rag_document_id = ?
```

---

## 🎯 Casos de Uso

### **1. Atendimento Multi-Departamental**
- **Suporte**: Resolve problemas técnicos
- **Vendas**: Negocia e fecha vendas
- **RH**: Responde dúvidas de funcionários

### **2. Conteúdo Especializado**
- **Agente Técnico**: Escreve documentação
- **Agente Marketing**: Cria posts e anúncios
- **Agente SEO**: Otimiza conteúdo

### **3. Idiomas Diferentes**
- **Agente PT-BR**: Responde em português
- **Agente EN**: Responde em inglês
- **Agente ES**: Responde em espanhol

### **4. Personalidades Diferentes**
- **Agente Formal**: Tom profissional
- **Agente Casual**: Tom descontraído
- **Agente Humorístico**: Tom engraçado

---

## 🚀 Próximos Passos

### **Fase 1: Implementação Básica** ✅
- [x] Estrutura de banco de dados
- [x] API endpoints CRUD
- [x] Chat por agente
- [x] Acesso compartilhado aos RAGs
- [x] Interface de gerenciamento

### **Fase 2: Melhorias** (Próxima)
- [ ] Seletor de agente na interface de chat
- [ ] Dashboard de estatísticas por agente
- [ ] Exportar/Importar agentes
- [ ] Templates de agentes pré-configurados
- [ ] Compartilhamento de agentes entre usuários

### **Fase 3: Avançado** (Futuro)
- [ ] Agentes colaborativos (um chama outro)
- [ ] Workflow de agentes (pipelines)
- [ ] Agentes com memória de longo prazo
- [ ] Fine-tuning de agentes
- [ ] Marketplace de agentes

---

## 📝 Exemplos de Código

### **Frontend: Criar Agente**
```typescript
const createAgent = async () => {
  const response = await authenticatedFetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Meu Agente',
      systemPrompt: 'Você é...',
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      avatarEmoji: '🤖',
      color: '#3b82f6'
    })
  })
  
  const data = await response.json()
  console.log('Agente criado:', data.agent.id)
}
```

### **Frontend: Chat com Agente**
```typescript
const chatWithAgent = async (agentId: string, message: string) => {
  const response = await authenticatedFetch(
    `/api/agents/${agentId}/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        ragDocumentIds: ['rag_1', 'rag_2'] // Opcional
      })
    }
  )
  
  const data = await response.json()
  return data.response
}
```

---

## 🎉 Conclusão

O sistema agora suporta **múltiplos agentes IA** com:

✅ **Prompts personalizados** por agente  
✅ **Contextos isolados** de conversa  
✅ **RAGs compartilhados** (base de conhecimento comum)  
✅ **Controle de acesso** granular aos RAGs  
✅ **Estatísticas detalhadas** por agente  
✅ **Interface completa** de gerenciamento  

**Transformamos mono-prompt em multi-agente! 🚀🤖**
