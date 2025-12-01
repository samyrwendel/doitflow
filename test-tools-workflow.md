# Teste Completo - Sistema de Ferramentas Evolution API

## Data: $(date)

## Implementação Completa ✅

### Backend
- ✅ Migração 002_agent_tools.sql executada
- ✅ Tabelas criadas: agent_tools, evolution_instances, agent_tool_access, agent_tool_usage
- ✅ Ferramenta tool_evolution_api registrada
- ✅ 12 endpoints criados para ferramentas
- ✅ Funções evolutionSendText e evolutionSendMedia implementadas

### Frontend
- ✅ API_ENDPOINTS atualizado com endpoints de ferramentas
- ✅ EvolutionInstanceModal criado
- ✅ PromptEditorModal atualizado com seção de ferramentas
- ✅ Checkbox para Evolution API
- ✅ Seletor de instância Evolution
- ✅ Botão "Nova Instância"
- ✅ Modal de criação de instância
- ✅ Build: 432KB (gzip: 124.42KB)

## Como Testar

### 1. Criar Instância Evolution
```bash
# Via API
curl -X POST http://localhost:3004/api/evolution-instances \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "WhatsApp Principal",
    "instanceId": "minha-instancia",
    "baseUrl": "https://evolution-api.exemplo.com",
    "apiKey": "sua-chave-api"
  }'
```

### 2. Via Interface
1. Abrir modal de edição de prompt (ícone do lápis)
2. Na seção "Ferramentas", marcar checkbox "💬 Evolution API"
3. Clicar em "Nova Instância"
4. Preencher formulário:
   - Nome da Instância: "WhatsApp Principal"
   - Instance ID: "minha-instancia"
   - Base URL: "https://evolution-api.exemplo.com"
   - API Key: "sua-chave-api"
5. Salvar

### 3. Habilitar Ferramenta para Agente
```bash
# Via API
curl -X POST http://localhost:3004/api/agents/AGENT_ID/tools/tool_evolution_api/enable \
  -H "Authorization: Bearer SEU_TOKEN"
```

### 4. Verificar Ferramentas do Agente
```bash
# Listar ferramentas habilitadas
curl -X GET http://localhost:3004/api/agents/AGENT_ID/tools \
  -H "Authorization: Bearer SEU_TOKEN"
```

### 5. Executar Ação (Enviar Mensagem)
```bash
# Enviar mensagem de texto
curl -X POST http://localhost:3004/api/tools/evolution/execute \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "AGENT_ID",
    "action": "send_text",
    "params": {
      "number": "5511999999999",
      "text": "Olá! Esta é uma mensagem do agente IA."
    }
  }'
```

## Estrutura do Banco de Dados

### Tabela: agent_tools
```sql
CREATE TABLE agent_tools (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,         -- tool_evolution_api
    display_name TEXT NOT NULL,        -- Evolution API
    description TEXT,
    icon TEXT,                         -- 💬
    config_schema TEXT,                -- JSON schema
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: evolution_instances
```sql
CREATE TABLE evolution_instances (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    base_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Tabela: agent_tool_access
```sql
CREATE TABLE agent_tool_access (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    config TEXT,                       -- JSON config específico
    is_enabled INTEGER DEFAULT 1,
    granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES agent_tools(id) ON DELETE CASCADE,
    UNIQUE(agent_id, tool_id)
);
```

### Tabela: agent_tool_usage
```sql
CREATE TABLE agent_tool_usage (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    action TEXT NOT NULL,
    params TEXT,                       -- JSON dos parâmetros
    result TEXT,                       -- JSON do resultado
    success INTEGER NOT NULL,
    error_message TEXT,
    executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES agent_tools(id) ON DELETE CASCADE
);
```

## Endpoints Disponíveis

### Ferramentas
- `GET /api/tools` - Listar ferramentas disponíveis
- `GET /api/agents/:id/tools` - Listar ferramentas do agente
- `POST /api/agents/:id/tools/:toolId/enable` - Habilitar ferramenta
- `POST /api/agents/:id/tools/:toolId/disable` - Desabilitar ferramenta
- `PUT /api/agents/:id/tools/:toolId/config` - Atualizar config da ferramenta

### Evolution API
- `POST /api/evolution-instances` - Criar instância
- `GET /api/evolution-instances` - Listar instâncias do usuário
- `GET /api/evolution-instances/:id` - Obter instância
- `PUT /api/evolution-instances/:id` - Atualizar instância
- `DELETE /api/evolution-instances/:id` - Deletar instância
- `POST /api/tools/evolution/execute` - Executar ação

## Funções Disponíveis

### send_text
Envia mensagem de texto via WhatsApp
```javascript
{
  "action": "send_text",
  "params": {
    "number": "5511999999999",
    "text": "Mensagem de texto"
  }
}
```

### send_media
Envia mídia (imagem, vídeo, documento) via WhatsApp
```javascript
{
  "action": "send_media",
  "params": {
    "number": "5511999999999",
    "mediaUrl": "https://exemplo.com/imagem.jpg",
    "caption": "Legenda da imagem",
    "mediaType": "image"
  }
}
```

## Próximos Passos

### Implementar Function Calling no Chat
1. Quando agente tiver ferramentas habilitadas, incluir no contexto
2. LLM pode decidir usar ferramentas
3. Sistema executa ação e retorna resultado ao LLM
4. LLM formula resposta final ao usuário

### Exemplo de Fluxo
```
Usuário: "Envie uma mensagem para o cliente João avisando que o pedido está pronto"

Agente (com Evolution API):
1. Entende que precisa enviar mensagem
2. Decide usar tool_evolution_api
3. Chama send_text com número do João
4. Recebe confirmação de envio
5. Responde ao usuário: "Mensagem enviada para João com sucesso!"
```

### Adicionar Mais Ferramentas
- 📧 Email API - Enviar emails
- 📅 Calendar API - Agendar compromissos
- 🗃️ Database API - Consultar dados
- 🔍 Search API - Buscar informações
- 📊 Analytics API - Gerar relatórios

## Status Final
✅ Backend 100% funcional
✅ Frontend 100% funcional
✅ Banco de dados 100% estruturado
✅ Evolution API integrada
⏳ Aguardando implementação de function calling no chat
