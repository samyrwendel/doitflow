# 🤖 Plataforma Demo de Transcrição e Chat com RAG Inteligente

Uma aplicação web avançada que integra transcrição de áudio, chat com IA e sistema RAG (Retrieval-Augmented Generation) com sincronização visual em tempo real.

## ✨ Novidades v2.1.0

### 🔄 **Sistema de Sincronização Visual de Prompt**
- **🟢 Sincronizado**: Prompt ativo no chat
- **🟡 Modificado**: Prompt alterado, aguardando sincronização  
- **🔵 Sincronizando**: Sistema processando mudanças
- **Auto-sync**: 2 segundos após parar de digitar
- **Sync manual**: Botão "Sincronizar" quando necessário

### 💬 **Chat Livre + RAG Opcional**
- **Chat funciona normalmente** sem necessidade de RAG
- **RAG como complemento** para respostas especializadas
- **Flexibilidade total**: Alterna entre chat livre e RAG quando quiser

### 🗣️ **Instruções de Idioma Fortalecidas**
- **Detecção automática** de instruções de idioma no prompt
- **Fortalecimento inteligente** com exemplos e instruções críticas
- **Temperature adaptativa**: 0.3 para idiomas, 0.7 para chat geral
- **Suporte**: Inglês, Espanhol, Francês (extensível)

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ instalado
- NPM ou Yarn
- Chave de API do Groq (obtenha em https://console.groq.com)

### Configuração
```bash
# 1. Clone o repositório
git clone https://github.com/cleversonpompeu/demo.idx.ia.br.git
cd demo.idx.ia.br

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env e adicione sua GROQ_API_KEY

# 3. Instalar dependências
npm install
```

### Execução
```bash
# Opção 1: Executar frontend e backend separadamente
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run dev

# Opção 2: Executar ambos simultaneamente (recomendado)
npm run start:all
```

A aplicação estará disponível em:
- Frontend: http://localhost:3000
- Backend: http://localhost:3004

## 📋 Funcionalidades

### 🎯 Layout Principal
- **Coluna Esquerda (50%)**: Ambiente de Chat com agente IA
- **Coluna Direita (50%)**: 3 seções verticais
  - **Seção 1 (Topo)**: Bloco de Transcrição
  - **Seção 2 (Meio)**: Editor de Prompt
  - **Seção 3 (Inferior)**: Lista de RAGs

### 🎵 **Sistema de Transcrição Inteligente**
- **Upload avançado**: Drag & drop com suporte a múltiplos formatos
- **Processamento otimizado**: Chunks adaptativos para áudios grandes
- **Auto-save**: Transcrições salvas automaticamente ao completar
- **Lista minimalista**: Visualização em uma linha com ações rápidas
- **Download de chunks**: Individual ou em lote para análise

### 📝 **Editor de Prompt com Sincronização Visual**
- **Sincronização em tempo real**: Indicadores visuais de status
- **RAG Selector**: Dropdown inteligente para seleção de documentos
- **Preview de índice**: Visualização do contexto que será usado
- **Prompt customizado**: Realmente aplicado nas respostas da IA
- **Auto-sync + Manual**: Debounce de 2s ou botão manual

### 🧠 **Sistema RAG Revolucionário**
- **Busca inteligente**: Algoritmo de relevância semântica
- **Seleção de documentos**: Escolha específica em vez de busca global  
- **Chunking adaptativo**: Otimizado para diferentes tamanhos de conteúdo
- **Download de análises**: Chunks individuais ou completos
- **Context Window Visualizer**: Grid estilo GitHub mostrando ocupação

### 💬 **Chat Híbrido (Livre + RAG)**
- **Chat livre**: Funciona sem RAG como assistente geral
- **Chat especializado**: Com RAG para respostas baseadas em documentos
- **Instruções de idioma fortalecidas**: Detecção e aplicação automática
- **Flexibilidade total**: Alterna entre modos conforme necessidade

## 🔄 Fluxo de Trabalho Otimizado

### **🎯 Modo Chat Livre**
1. **Digite prompt customizado** → Sistema sincroniza visualmente
2. **Converse normalmente** → IA responde com base no prompt
3. **Instruções de idioma** → Automaticamente fortalecidas

### **� Modo RAG Especializado**  
1. **Upload de áudio** → Transcrição automática
2. **Transformar em chunks** → Base de conhecimento criada
3. **Selecionar documento** → RAG específico ativo
4. **Chat especializado** → Respostas baseadas no documento

## 🛠️ Stack Tecnológico Avançado

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Estilização**: Tailwind CSS
- **Componentes**: Componentes customizados com design responsivo

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Transcrição**: Groq SDK (Whisper Large V3)
- **Processamento**: Sistema de chunking baseado na tecnologia da pasta `transc/`

## 📁 Estrutura de Arquivos

```
├── src/
│   ├── components/
│   │   ├── ChatInterface.tsx      # Interface de chat completa
│   │   ├── TranscriptionPanel.tsx # Painel de transcrição
│   │   ├── PromptEditor.tsx       # Editor de prompt
│   │   └── RAGList.tsx           # Lista de documentos RAG
│   ├── types/index.ts              # Tipos TypeScript
│   ├── lib/utils.ts               # Utilitários
│   ├── App.tsx                    # Componente principal
│   ├── main.tsx                   # Entry point
│   └── index.css                   # Estilos globais
├── server.js                       # Backend com APIs
├── package.json                    # Dependências e scripts
├── vite.config.ts                  # Configuração Vite
├── tailwind.config.js              # Configuração Tailwind
└── tsconfig.json                   # Configuração TypeScript
```

## 🎨 Características Técnicas

- **Arquitetura Modular**: Componentes reutilizáveis e bem estruturados
### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Estilização**: Tailwind CSS + Design System customizado
- **Estado**: React Hooks + Context para gerenciamento
- **Sincronização**: Sistema visual em tempo real
- **Responsividade**: Interface adaptável e mobile-friendly

### Backend  
- **Runtime**: Node.js + Express
- **IA**: Groq SDK (Llama 3.1 8B + Whisper Large V3)
- **Upload**: Multer para processamento de áudio
- **CORS**: Configurado para frontend
- **Logs**: Sistema detalhado para debug
- **Temperature adaptativa**: 0.3 para idiomas, 0.7 para chat geral

### Inteligência Artificial
- **Chat**: Llama 3.1 8B Instant (ultra-rápido)
- **Transcrição**: Whisper Large V3 (precisão máxima em português)
- **RAG**: Busca semântica inteligente com scoring de relevância
- **Prompt Engineering**: Instruções fortalecidas com detecção automática

## 📚 Documentação Técnica

### **🔄 Sincronização de Prompt**
- [SINCRONIZACAO_PROMPT.md](./SINCRONIZACAO_PROMPT.md) - Sistema visual completo

### **💬 Chat Livre** 
- [CORRECAO_CHAT_LIVRE.md](./CORRECAO_CHAT_LIVRE.md) - Como funciona sem RAG

### **📝 Prompt Customizado**
- [CORRECAO_PROMPT_CUSTOMIZADO.md](./CORRECAO_PROMPT_CUSTOMIZADO.md) - Aplicação real do prompt

### **🗣️ Instruções de Idioma**
- [CORRECAO_IDIOMA_FORTALECIDO.md](./CORRECAO_IDIOMA_FORTALECIDO.md) - Sistema fortalecido

### **🤖 Configuração da IA** 
- [SISTEMA_IA_COMPLETO.md](./SISTEMA_IA_COMPLETO.md) - Setup técnico completo

## 🔧 Configuração Avançada

### Variáveis de Ambiente
```bash
# .env
PORT=3004
GROQ_API_KEY=gsk_sua_chave_groq_aqui
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3004
```

### Deployment com PM2
```bash
# Instalar dependências
npm install

# Build do projeto  
npm run build

# Iniciar com PM2
pm2 start ecosystem.config.cjs

# Ver logs
pm2 logs demo-backend:3004
```

## � Como Usar (Guia Rápido)

### **💬 Chat Livre (Sem RAG)**
1. **Digite prompt**: `"Seu nome é Sofia, você só responde em inglês"`
2. **Aguarde sync**: 🟡 Modificado → 🟢 Sincronizado  
3. **Converse**: "como se chama?" → "My name is Sofia"

### **📚 Chat Especializado (Com RAG)**
1. **Upload áudio**: Drag & drop na Base de Conhecimento
2. **Transformar**: Clique "Converter para Chunks"
3. **Selecionar RAG**: Dropdown no Editor de Prompt
4. **Perguntar**: "qual o horário?" → Resposta baseada no documento

### **🔧 Debug e Monitoramento**
```bash
# Ver logs em tempo real
pm2 logs demo-backend:3004 --lines 20

# Verificar status
pm2 status

# Reiniciar se necessário  
pm2 restart demo-backend:3004
```

## ✨ Funcionalidades Avançadas

- **🔄 Sincronização Visual**: Status em tempo real do prompt
- **🧠 RAG Inteligente**: Busca semântica otimizada
- **🗣️ Multilíngue**: Instruções de idioma fortalecidas
- **📊 Analytics**: Visualizador de contexto estilo GitHub
- **⚡ Performance**: Temperature adaptativa e chunking otimizado
- **🎯 Flexibilidade**: Chat livre + RAG especializado

---

## 🎯 **v2.1.0 - Sistema de Chat Inteligente com Sincronização Visual**

**Transformando transcrição de áudio em experiência de IA conversacional avançada!** 🚀✨
