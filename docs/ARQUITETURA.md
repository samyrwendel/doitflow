# DoitFlow - Arquitetura e Documentação Técnica

## Visão Geral

O **DoitFlow** é uma plataforma completa de IA conversacional com transcrição de áudio/vídeo, chat com RAG (Retrieval-Augmented Generation), sistema multi-agentes e integração WhatsApp.

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express (server.cjs - 4.982 linhas) |
| Banco de Dados | SQLite3 (data.db - 29.4 MB) |
| IA/LLM | Groq (Whisper + Llama 3.1), Google Gemini |
| WhatsApp | Evolution API |
| Processamento | FFmpeg, pdf-parse, mammoth, xlsx |

---

## Estrutura de Pastas

```
/home/umbrel/projects/doitflow/
├── src/                           # Frontend React/TypeScript
│   ├── components/                # 27 componentes React
│   │   ├── ChatInterface.tsx      # Interface principal de chat (29.3 KB)
│   │   ├── AgentsPanel.tsx        # Gerenciamento de agentes (14.3 KB)
│   │   ├── DevicesPanel.tsx       # Dispositivos WhatsApp (28.8 KB)
│   │   ├── TranscriptionPanel.tsx # Upload e transcrição (22 KB)
│   │   ├── PromptEditor.tsx       # Editor de prompts (5.6 KB)
│   │   ├── PromptEditorModal.tsx  # Editor modal (34.6 KB)
│   │   ├── KnowledgeBase.tsx      # Base de conhecimento (9.7 KB)
│   │   ├── RAGList.tsx            # Lista de RAGs (4.7 KB)
│   │   ├── RAGSelector.tsx        # Seletor de RAG (4.7 KB)
│   │   ├── ContextWindowVisualizer.tsx # Visualizador de contexto (11.1 KB)
│   │   ├── UsageStatsPanel.tsx    # Estatísticas de uso (23.4 KB)
│   │   ├── ConversationsPanel.tsx # Histórico de conversas (18.9 KB)
│   │   ├── LLMConfigPanel.tsx     # Configuração LLM (25.7 KB)
│   │   ├── AuthLogin.tsx          # Login (6.2 KB)
│   │   └── ...                    # Outros componentes
│   ├── contexts/                  # Contextos React
│   │   ├── AuthContext.tsx        # Autenticação global (5.6 KB)
│   │   └── ThemeContext.tsx       # Tema light/dark (1.6 KB)
│   ├── lib/                       # Utilitários
│   │   ├── api.ts                 # Endpoints configurados
│   │   ├── utils.ts               # Funções utilitárias
│   │   └── WebAudioChunker.js     # Processamento de áudio
│   ├── types/                     # Definições TypeScript
│   ├── App.tsx                    # Componente principal
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Estilos globais
├── database/                      # SQLite
│   ├── schema.sql                 # Schema completo (252 linhas)
│   ├── db.cjs                     # Driver Database
│   ├── data.db                    # Banco SQLite (29.4 MB)
│   └── migrations/                # Migrações SQL
│       ├── 001_add_usage_stats.sql
│       ├── 001_multi_agents.sql
│       └── 002_agent_tools.sql
├── chat/                          # Sub-projeto chat separado
│   ├── src/                       # Frontend React Chat
│   └── documentacao_evolution_api/# 37 arquivos de documentação
├── server.cjs                     # Backend Express (4.982 linhas - 187 KB)
├── auth.cjs                       # Sistema de autenticação (6.9 KB)
├── package.json                   # Dependências
├── vite.config.ts                 # Configuração Vite
├── tsconfig.json                  # Configuração TypeScript
├── tailwind.config.js             # Configuração Tailwind
├── .env                           # Variáveis de ambiente
├── CLAUDE.md                      # Regras do projeto
└── [25 arquivos .md]              # Documentação técnica
```

---

## Dependências Principais

### Produção
```json
{
  "@google/generative-ai": "^0.24.1",
  "bcryptjs": "^3.0.2",
  "cors": "^2.8.5",
  "dotenv": "^17.2.3",
  "express": "^4.18.2",
  "fluent-ffmpeg": "^2.1.3",
  "groq-sdk": "^0.3.3",
  "jsonwebtoken": "^9.0.2",
  "mammoth": "^1.11.0",
  "multer": "^1.4.5-lts.1",
  "pdf-parse": "^2.4.5",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "sqlite3": "^5.1.7",
  "uuid": "^13.0.0",
  "xlsx": "^0.18.5"
}
```

### Desenvolvimento
- TypeScript 5.2.2
- Vite 5.0.0
- Tailwind CSS 3.3.6
- ESLint + React plugins

---

## Endpoints da API (50+)

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login de usuário |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/verify` | Verificar token JWT |
| GET | `/api/auth/api-keys` | Listar API keys do usuário |
| POST | `/api/auth/api-keys` | Criar nova API key |

### Transcrição & Documentos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/transcribe` | Transcrição de áudio |
| POST | `/api/transcribe-chunk` | Transcrição em chunks |
| POST | `/api/video-transcription` | Transcrição de vídeo |
| POST | `/api/upload-document` | Upload de documentos (PDF, DOCX, XLSX) |
| GET | `/api/transcriptions` | Listar transcrições |
| GET | `/api/transcriptions/:id` | Buscar transcrição |
| DELETE | `/api/transcriptions/:id` | Deletar transcrição |

### RAG & Prompts
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/rag-documents` | Criar documento RAG |
| GET | `/api/rag-documents` | Listar RAGs |
| GET | `/api/rag-documents/:id` | Buscar RAG |
| DELETE | `/api/rag-documents/:id` | Deletar RAG |
| POST | `/api/prompts` | Salvar prompt |
| GET | `/api/prompts` | Listar prompts |
| POST | `/api/optimize-prompt` | Otimizar prompt com IA |

### Chat & Histórico
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/chat` | Chat com RAG |
| POST | `/api/webhook/chat` | Chat via webhook |
| GET | `/api/webhook/conversations` | Listar conversas |
| GET | `/api/webhook/conversations/:id/messages` | Mensagens da conversa |
| DELETE | `/api/webhook/conversations/:id` | Deletar conversa |
| POST | `/api/chat-history` | Salvar histórico |
| GET | `/api/chat-history/:sessionId` | Buscar histórico |

### Multi-Agentes
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/agents` | Criar agente |
| GET | `/api/agents` | Listar agentes |
| GET | `/api/agents/:id` | Buscar agente |
| PUT | `/api/agents/:id` | Atualizar agente |
| DELETE | `/api/agents/:id` | Deletar agente |
| POST | `/api/agents/:id/set-default` | Definir como padrão |
| POST | `/api/agents/:id/chat` | Chat com agente |
| GET | `/api/agents/:id/messages` | Histórico do agente |
| GET | `/api/agents/:id/sessions` | Sessões do agente |
| POST | `/api/agents/:id/rag-access` | Conceder acesso RAG |
| DELETE | `/api/agents/:id/rag-access/:ragId` | Revogar acesso |
| GET | `/api/agents/:id/rag-access` | Listar RAGs do agente |
| GET | `/api/agents/:id/statistics` | Estatísticas do agente |

### Ferramentas (Tools)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/tools` | Listar ferramentas disponíveis |
| GET | `/api/agents/:id/tools` | Ferramentas do agente |
| POST | `/api/agents/:id/tools/:toolId/enable` | Habilitar ferramenta |
| POST | `/api/agents/:id/tools/:toolId/disable` | Desabilitar ferramenta |

### WhatsApp & Dispositivos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/whatsapp-devices` | Listar dispositivos |
| POST | `/api/whatsapp-devices` | Registrar dispositivo |
| DELETE | `/api/whatsapp-devices/:id` | Deletar dispositivo |
| PATCH | `/api/whatsapp-devices/:id/ai-agent` | Configurar agente IA |
| PATCH | `/api/whatsapp-devices/:id/transcription` | Ativar transcrição |
| GET | `/api/evolution-instances` | Instâncias Evolution API |

### Utilitários
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/usage-stats` | Estatísticas de uso |
| POST | `/api/usage-stats/reset` | Resetar estatísticas |
| GET | `/api/health` | Health check |
| POST | `/api/cleanup` | Limpeza de dados |

---

## Banco de Dados SQLite

### Tabelas Principais (15+)

#### Usuários e Autenticação
```sql
-- Usuários do sistema
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  full_name TEXT,
  is_active BOOLEAN DEFAULT 1,
  is_admin BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  login_count INTEGER DEFAULT 0
);

-- API Keys por provider
CREATE TABLE user_api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL, -- 'groq', 'openai', 'anthropic', 'deepseek', 'mistral', 'google'
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  last_used DATETIME,
  UNIQUE(user_id, provider),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sessões JWT (24h)
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Transcrições e RAG
```sql
-- Transcrições de áudio/vídeo
CREATE TABLE transcriptions (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_filename TEXT,
  file_size INTEGER,
  duration REAL,
  audio_format TEXT,
  is_audio_video BOOLEAN DEFAULT 0,
  metadata TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Documentos RAG com chunks
CREATE TABLE rag_documents (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  chunks TEXT, -- JSON array
  transcription_id TEXT,
  source TEXT,
  source_filename TEXT,
  file_type TEXT,
  file_size INTEGER,
  chunk_count INTEGER,
  character_count INTEGER,
  embedding_cost REAL DEFAULT 0,
  metadata TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (transcription_id) REFERENCES transcriptions(id)
);

-- Cache de embeddings
CREATE TABLE embeddings_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chunk_text TEXT NOT NULL,
  embedding BLOB, -- Serializado
  document_id TEXT,
  chunk_index INTEGER,
  embedding_model TEXT,
  embedding_dimensions INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES rag_documents(id)
);
```

#### Multi-Agentes
```sql
-- Agentes de IA
CREATE TABLE ai_agents (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  model TEXT DEFAULT 'llama-3.1-8b-instant',
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT 1,
  is_default BOOLEAN DEFAULT 0,
  avatar_emoji TEXT DEFAULT '🤖',
  color TEXT DEFAULT '#3B82F6',
  usage_count INTEGER DEFAULT 0,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sessões de chat por agente
CREATE TABLE agent_chat_sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  session_name TEXT,
  message_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Mensagens por agente
CREATE TABLE agent_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  rag_document_id TEXT,
  metadata TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES agent_chat_sessions(id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Acesso RAG por agente
CREATE TABLE agent_rag_access (
  agent_id TEXT NOT NULL,
  rag_document_id TEXT NOT NULL,
  priority INTEGER DEFAULT 5, -- 1-10
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (agent_id, rag_document_id),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id),
  FOREIGN KEY (rag_document_id) REFERENCES rag_documents(id)
);

-- Estatísticas por agente
CREATE TABLE agent_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  date DATE NOT NULL,
  total_messages INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  avg_response_time REAL,
  rag_queries INTEGER DEFAULT 0,
  semantic_searches INTEGER DEFAULT 0,
  UNIQUE(agent_id, date),
  FOREIGN KEY (agent_id) REFERENCES ai_agents(id)
);
```

#### WhatsApp
```sql
-- Dispositivos WhatsApp
CREATE TABLE whatsapp_devices (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  name TEXT NOT NULL,
  owner_jid TEXT,
  profile_name TEXT,
  profile_pic_url TEXT,
  connection_status TEXT DEFAULT 'disconnected',
  ai_agent_enabled BOOLEAN DEFAULT 0,
  transcription_enabled BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Configuração de bot WAHA
CREATE TABLE waha_bot_config (
  session_name TEXT PRIMARY KEY,
  user_id INTEGER,
  bot_enabled BOOLEAN DEFAULT 0,
  custom_prompt TEXT,
  use_rag BOOLEAN DEFAULT 0,
  auto_respond BOOLEAN DEFAULT 1,
  response_delay_ms INTEGER DEFAULT 1000,
  total_messages_received INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Índices de Performance (18)
```sql
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_api_keys_user ON user_api_keys(user_id);
CREATE INDEX idx_api_keys_provider ON user_api_keys(user_id, provider);
CREATE INDEX idx_sessions_token ON user_sessions(token);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_transcriptions_user ON transcriptions(user_id);
CREATE INDEX idx_transcriptions_created ON transcriptions(created_at);
CREATE INDEX idx_rag_documents_user ON rag_documents(user_id);
CREATE INDEX idx_rag_documents_created ON rag_documents(created_at);
CREATE INDEX idx_embeddings_document ON embeddings_cache(document_id);
CREATE INDEX idx_embeddings_chunk ON embeddings_cache(document_id, chunk_index);
CREATE INDEX idx_prompts_user ON saved_prompts(user_id);
CREATE INDEX idx_prompts_default ON saved_prompts(user_id, is_default);
CREATE INDEX idx_chat_history_session ON chat_history(session_id);
CREATE INDEX idx_chat_history_user ON chat_history(user_id);
CREATE INDEX idx_chat_history_created ON chat_history(created_at);
CREATE INDEX idx_system_settings_key ON system_settings(key);
```

---

## Integrações Externas

### Groq API
| Modelo | Uso | Características |
|--------|-----|-----------------|
| `whisper-large-v3` | Transcrição | Precisão máxima, português BR |
| `llama-3.1-8b-instant` | Chat | 8B parâmetros, contexto 8K tokens |

### Google Generative AI (Gemini)
| Modelo | Uso | Características |
|--------|-----|-----------------|
| `gemini-2.5-flash-image` | Geração de imagens | Text-to-Image, Base64 output |
| `gemini-2.5-flash` | Chat multimodal | Análise de imagens |

### Evolution API
```
Base URL: Configurável via .env
Endpoints:
- POST /message/sendText/:deviceId - Enviar texto
- POST /message/sendMedia/:deviceId - Enviar mídia
- GET /instance/fetchInstances - Listar instâncias

Recursos:
- Múltiplos dispositivos WhatsApp
- QR Code para conexão
- Health check automático
- Normalização de números (código 55 - Brasil)
```

---

## Sistema Multi-Agentes

### Arquitetura
```
┌──────────────────────────────────────────┐
│   Base de Conhecimento Compartilhada     │
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
  Isolado    Isolado    Isolado
```

### Características
- **Múltiplos agentes**: Nome, descrição, emoji, cor personalizada
- **System prompt customizado**: Por agente
- **Contextos isolados**: Cada agente tem suas sessões
- **RAGs compartilhados**: Controle de acesso por agente
- **Estatísticas individuais**: Tokens, custo, tempo de resposta

---

## Sistema de Busca Semântica

### Algoritmo
1. Extração de palavras-chave da query
2. Busca em todos os chunks dos RAGs selecionados
3. Scoring por relevância (TF-IDF simplificado)
4. Suporte a sinônimos pré-definidos
5. Retorna top 5 chunks mais relevantes

### Temperature Adaptativa
| Contexto | Temperature | Comportamento |
|----------|-------------|---------------|
| Transcrição | 0.0 | Máxima precisão |
| Busca semântica | 0.2 | Preciso |
| Busca tradicional | 0.3 | Criativo |
| Chat geral | 0.7 | Normal |

---

## Autenticação

### Fluxo
1. Login com username + password
2. Validação bcrypt
3. Geração de JWT (24h)
4. Criação de sessão no banco
5. Token no header `Authorization: Bearer <token>`

### Usuário Padrão
```
Username: cleverson.pompeu
Password: 123456
is_admin: true
```

---

## Configuração

### Variáveis de Ambiente (.env)
```env
# Servidor
PORT=3004

# APIs de IA
GROQ_API_KEY=gsk_...
GOOGLE_API_KEY=AIzaSy...

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3004

# Recursos
ENABLE_SEMANTIC_SEARCH=true

# Evolution API (opcional)
EVOLUTION_API_URL=https://...
EVOLUTION_API_KEY=...
```

### Vite Config (vite.config.ts)
```typescript
export default defineConfig({
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['doitflow.holdge.com', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3004',
        changeOrigin: true,
      },
    },
  },
})
```

---

## Portas Utilizadas

| Porta | Serviço | Descrição |
|-------|---------|-----------|
| 3000 | Vite Dev Server | Frontend React |
| 3004 | Express | Backend API |
| **4000** | **PROIBIDA** | Outro projeto em produção |
| **4001** | **PROIBIDA** | Outro projeto em produção |

---

## Comandos

### Desenvolvimento
```bash
# Instalar dependências
npm install

# Rodar frontend + backend
npm run start:all

# Apenas frontend
npm run dev

# Apenas backend
npm run server
```

### Produção
```bash
# Build
npm run build

# Servir com PM2
pm2 start ecosystem.config.cjs
```

---

## Documentação Adicional

| Arquivo | Descrição |
|---------|-----------|
| `SISTEMA_IA_COMPLETO.md` | Setup técnico de IA |
| `SISTEMA_MULTI_AGENTES.md` | Arquitetura multi-agentes |
| `PERSISTENCIA_SQLITE_IMPLEMENTADA.md` | Sistema de banco de dados |
| `SEMANTIC_SEARCH_IMPLEMENTATION.md` | Busca semântica |
| `RAG_INTELIGENTE_GUIDE.md` | Sistema RAG |
| `CLAUDE.md` | Regras do projeto |

---

## Status do Projeto

### Implementado
- [x] Transcrição de áudio/vídeo (Groq Whisper)
- [x] Chat com RAG inteligente
- [x] Sistema multi-agentes
- [x] Persistência SQLite completa
- [x] Autenticação JWT
- [x] Integração WhatsApp/Evolution API
- [x] Geração de imagens (Gemini)
- [x] Upload de documentos (PDF, DOCX, XLSX)
- [x] Busca semântica
- [x] Temas light/dark
- [x] Estatísticas de uso
- [x] API keys por provider

### Métricas
- **Backend**: 4.982 linhas (server.cjs)
- **Componentes React**: 27
- **Endpoints REST**: 50+
- **Tabelas SQLite**: 15+
- **Documentação**: 25 arquivos .md

---

**Versão**: 2.1.0
**Última atualização**: 2025-12-01
