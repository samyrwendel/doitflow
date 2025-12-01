# 🗄️ Sistema de Persistência SQLite

## 📊 Visão Geral

O sistema de persistência foi implementado para armazenar permanentemente:
- **Transcrições** de áudio processadas
- **Documentos RAG** gerados a partir das transcrições  
- **Prompts personalizados** criados pelos usuários
- **Histórico de conversas** do chat
- **Configurações** do sistema

## 🏗️ Arquitetura

### **Base de Dados**
- **Tecnologia**: SQLite 3
- **Localização**: `/database/data.db`
- **Schema**: `/database/schema.sql`
- **Módulo**: `/database/db.js`

### **Tabelas Principais**

#### 1. **transcriptions**
```sql
- id (TEXT PRIMARY KEY)
- title (TEXT NOT NULL)
- content (TEXT NOT NULL) 
- source_filename (TEXT)
- file_size (INTEGER)
- duration (REAL)
- audio_format (TEXT)
- metadata (TEXT - JSON)
- created_at, updated_at (DATETIME)
```

#### 2. **rag_documents**
```sql
- id (TEXT PRIMARY KEY)
- title (TEXT NOT NULL)
- content (TEXT NOT NULL)
- chunks (TEXT - JSON ARRAY)
- transcription_id (FK)
- source_filename (TEXT)
- metadata (TEXT - JSON)
- created_at, updated_at (DATETIME)
```

#### 3. **saved_prompts**
```sql
- id (TEXT PRIMARY KEY)
- title (TEXT NOT NULL)
- content (TEXT NOT NULL)
- rag_document_id (FK)
- is_default (BOOLEAN)
- language (TEXT)
- category (TEXT)
- usage_count (INTEGER)
- created_at, updated_at (DATETIME)
```

#### 4. **chat_history**
```sql
- id (TEXT PRIMARY KEY)
- session_id (TEXT NOT NULL)
- role (TEXT NOT NULL) -- 'user' | 'assistant'
- content (TEXT NOT NULL)
- rag_document_id (FK)
- prompt_id (FK)
- metadata (TEXT - JSON)
- timestamp (DATETIME)
```

## 🔗 APIs de Persistência

### **Transcrições**
```
POST /api/transcriptions      - Salvar transcrição
GET  /api/transcriptions      - Listar transcrições
GET  /api/transcriptions/:id  - Buscar transcrição específica
```

### **Documentos RAG**
```
POST /api/rag-documents      - Salvar documento RAG
GET  /api/rag-documents      - Listar documentos RAG
GET  /api/rag-documents/:id  - Buscar documento específico
```

### **Prompts**
```
POST /api/prompts            - Salvar prompt
GET  /api/prompts            - Listar prompts salvos
```

### **Histórico de Chat**
```
POST /api/chat-history               - Salvar mensagem
GET  /api/chat-history/:sessionId    - Buscar histórico da sessão
```

### **Manutenção**
```
POST /api/cleanup            - Limpeza de dados antigos
GET  /api/health             - Status do sistema (inclui DB)
```

## ⚡ Integração Automática

### **Frontend (React)**
1. **Inicialização**: Carrega dados persistidos automaticamente
2. **Auto-save**: Salva transcrições e RAGs ao criar
3. **Chat persistente**: Mensagens salvas em tempo real
4. **Sessões**: ID único para cada conversa

### **Backend (Node.js)**
1. **Inicialização**: Conecta ao SQLite na inicialização
2. **Auto-save**: Chat salva mensagens automaticamente
3. **Relacionamentos**: Mantém vínculos entre entidades
4. **Metadados**: Armazena informações extras em JSON

## 🔄 Fluxo de Dados

### **Transcrição → RAG → Chat**
```
1. Áudio enviado → Transcrição gerada → Salva automaticamente
2. Transcrição → Convertida em RAG → Salva automaticamente  
3. RAG selecionado → Chat usa documento → Mensagens salvas
4. Histórico preservado → Dados recuperados na próxima sessão
```

### **Recuperação na Inicialização**
```javascript
// Frontend carrega dados na inicialização
const loadPersistedData = async () => {
  // Carrega transcrições salvas
  const transcriptions = await fetch('/api/transcriptions')
  
  // Carrega documentos RAG
  const ragDocuments = await fetch('/api/rag-documents')
  
  // Gera novo ID de sessão para chat
  const sessionId = generateSessionId()
}
```

## 🛠️ Configuração e Uso

### **Primeira Execução**
```bash
# As dependências já foram instaladas
npm install

# O banco será criado automaticamente na primeira execução
npm run server
```

### **Verificação do Sistema**
```bash
# Health check (inclui status do banco)
curl http://localhost:3004/api/health

# Listar transcrições
curl http://localhost:3004/api/transcriptions

# Listar documentos RAG  
curl http://localhost:3004/api/rag-documents
```

### **Localização dos Dados**
- **Banco de dados**: `/database/data.db`
- **Logs de sistema**: Console do PM2
- **Backups**: Manual (copiar arquivo .db)

## 🧹 Manutenção

### **Limpeza Automática**
- **Histórico de chat**: 30 dias (configurável)
- **Dados órfãos**: Removidos automaticamente
- **Trigger manual**: `POST /api/cleanup`

### **Backup Manual**
```bash
# Copiar arquivo do banco
cp /database/data.db /backup/data_backup_$(date +%Y%m%d).db

# Verificar integridade
sqlite3 /database/data.db "PRAGMA integrity_check;"
```

### **Reset do Sistema**
```bash
# CUIDADO: Apaga todos os dados
rm /database/data.db

# Na próxima execução, criará novo banco vazio
npm run server
```

## 📈 Métricas e Monitoramento

### **Informações Disponíveis**
- **Quantidade** de transcrições, RAGs e prompts armazenados
- **Uso** de cada prompt (contador)
- **Sessões de chat** ativas e históricas
- **Relacionamentos** entre entidades

### **Health Check**
```json
{
  "status": "ok",
  "services": {
    "transcription": "active",
    "chat": "active", 
    "rag": "active",
    "database": "active"
  }
}
```

## 🚀 Benefícios Implementados

### **Persistência Total**
- ✅ **Transcrições** mantidas entre sessões
- ✅ **RAGs** disponíveis permanentemente
- ✅ **Histórico de chat** preservado
- ✅ **Prompts personalizados** salvos

### **Performance Otimizada**
- ✅ **Índices** para consultas rápidas
- ✅ **Relacionamentos** eficientes
- ✅ **Cleanup automático** de dados antigos
- ✅ **Metadados** estruturados em JSON

### **Experiência do Usuário**
- ✅ **Carregamento automático** na inicialização
- ✅ **Save transparente** sem intervenção
- ✅ **Continuidade** entre sessões
- ✅ **Histórico** de conversas

---

## 🎯 **Resultado Final**

**Persistência completa e transparente integrada ao sistema existente, mantendo toda a funcionalidade original com dados permanentes!** 

O usuário agora pode fechar e reabrir a aplicação sem perder nenhum trabalho realizado. 🚀✨