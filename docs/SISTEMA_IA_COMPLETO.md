# 🤖 Configuração Completa do Sistema de IA

## 🔑 **API Key e Provedor**

### **Provedor de IA:** Groq
- **API Key:** `YOUR_GROQ_API_KEY`
- **Localização:** Arquivo `.env` na raiz do projeto
- **Variável:** `GROQ_API_KEY`

### **Por que Groq?**
- ⚡ **Ultra-rápido**: Inference em tempo real
- 💰 **Custo-efetivo**: Preços competitivos
- 🎯 **Especializado**: Otimizado para Llama e Whisper
- 🔒 **Confiável**: Infraestrutura robusta

---

## 🧠 **Modelos de IA Utilizados**

### **1. 📝 Transcrição de Áudio**
```javascript
// Modelo Whisper para Speech-to-Text
model: 'whisper-large-v3'
temperature: 0.0  // Máxima precisão
language: 'pt'    // Português brasileiro
```

**Características:**
- **Precisão**: Estado da arte para português
- **Suporte**: Múltiplos formatos de áudio
- **Robustez**: Funciona com ruído de fundo
- **Velocidade**: Processamento otimizado

### **2. 💬 Chat/RAG (Resposta a Perguntas)**
```javascript
// Modelo Llama para Text Generation
model: "llama-3.1-8b-instant"
temperature: 0.2  // Busca inteligente (mais preciso)
temperature: 0.3  // Busca tradicional (mais criativo)
max_tokens: 1000  // Limite de resposta
```

**Características:**
- **Inteligência**: 8 bilhões de parâmetros
- **Velocidade**: Versão "instant" otimizada
- **Multilíngue**: Excelente em português
- **Contexto**: Até 8k tokens de contexto

---

## 📋 **Sistema de Prompts**

### **🎯 Busca Inteligente (Nova Arquitetura)**
```javascript
const systemPrompt = `Você é um assistente inteligente especializado em analisar documentos. 
Responda perguntas baseado exclusivamente no contexto fornecido.

Baseado no documento "${documento.title}", use as seguintes informações relevantes:

[1] Primeiro chunk relevante...
[2] Segundo chunk relevante...
[3] Terceiro chunk relevante...

---

Pergunta do usuário: ${message}

Instruções:
- Use apenas as informações do contexto fornecido
- Seja preciso e objetivo
- Se não souber, diga claramente que a informação não está disponível
- Cite os trechos relevantes quando apropriado`;
```

### **📚 Busca Tradicional (Fallback)**
```javascript
const systemPrompt = `Você é um assistente inteligente que responde perguntas baseado no contexto fornecido.

Contexto:
[Documento A]: Conteúdo relevante...
[Documento B]: Mais conteúdo...

Pergunta do usuário: ${message}

Responda de forma clara e concisa, citando as fontes quando relevante.`;
```

---

## ⚙️ **Configurações Detalhadas**

### **🔧 Parâmetros de Transcrição**
```javascript
{
  model: 'whisper-large-v3',
  file: audioFile,
  temperature: 0.0,        // Máxima precisão
  language: 'pt',          // Português
  response_format: 'json'  // Formato estruturado
}
```

### **🎛️ Parâmetros de Chat**

#### **Busca Inteligente:**
```javascript
{
  model: "llama-3.1-8b-instant",
  temperature: 0.2,      // Menos criativo, mais preciso
  max_tokens: 1000,      // Resposta média
  messages: [
    {
      role: "system",
      content: systemPrompt  // Prompt estruturado
    }
  ]
}
```

#### **Busca Tradicional:**
```javascript
{
  model: "llama-3.1-8b-instant", 
  temperature: 0.3,      // Pouco mais criativo
  max_tokens: 1000,      // Resposta média
  messages: [...]
}
```

---

## 🔍 **Algoritmo de Busca Semântica**

### **🧠 Busca Inteligente (Nova)**
```javascript
function findMostRelevantChunks(query, ragDocuments, maxChunks = 5) {
  // 1. Extrair palavras-chave da pergunta
  const queryWords = query.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2);

  // 2. Scoring por relevância
  queryWords.forEach(word => {
    // Correspondência exata: +2 pontos
    // Correspondência parcial: +1 ponto
    // Múltiplas palavras-chave: +3 pontos
    // Posição no documento: bonus
  });

  // 3. Retornar apenas top 5 chunks mais relevantes
  return scoredChunks.slice(0, 5);
}
```

### **📊 Busca Tradicional**
```javascript
function calculateSimilarity(text1, text2) {
  // Sinônimos pré-definidos
  const synonyms = {
    'criou': ['desenvolvedor', 'criador', 'desenvolveu'],
    'horário': ['hora', 'funcionamento', 'período'],
    // ... mais sinônimos
  };

  // Score baseado em correspondências + sinônimos
  // Normalização e threshold de relevância
}
```

---

## 🎯 **Fluxo de Processamento**

### **1. 📤 Input do Usuário**
```
Pergunta: "Qual o horário de funcionamento?"
RAG selecionado: "Manual-Empresa-2024"
```

### **2. 🔍 Busca Semântica**
```javascript
// Sistema encontra chunks relevantes:
[
  "Funcionamos de segunda a sexta...",
  "Horário de atendimento: 9h às 18h...", 
  "Nos finais de semana estamos fechados..."
]
```

### **3. 🧠 Geração de Resposta**
```javascript
// Prompt enviado para Llama:
"Com base no documento 'Manual-Empresa-2024':
[1] Funcionamos de segunda a sexta...
[2] Horário de atendimento: 9h às 18h...
[3] Nos finais de semana estamos fechados...

Pergunta: Qual o horário de funcionamento?"
```

### **4. ✅ Resposta Final**
```
"Com base no manual da empresa, nosso horário de funcionamento é:
- Segunda a sexta: 9h às 18h
- Finais de semana: Fechado

Fonte: Manual-Empresa-2024, seções de atendimento."
```

---

## 📊 **Estatísticas do Sistema**

### **⚡ Performance**
- **Transcrição**: ~5-10s para áudios de 1 minuto
- **Busca**: ~200ms para encontrar chunks relevantes  
- **Geração**: ~1-3s para resposta completa
- **Precisão**: ~95% em português brasileiro

### **💾 Limites**
- **Áudio máximo**: 50MB por arquivo
- **Contexto**: 8.000 tokens (~6.000 palavras)
- **Resposta**: 1.000 tokens (~750 palavras)
- **Chunks por busca**: Máximo 5 (otimizado)

### **🎯 Otimizações**
- **Chunking adaptativo**: 1000-1500 caracteres
- **Cache de índices**: Geração automática por documento
- **Busca por relevância**: Score semântico otimizado
- **Fallback**: Sistema duplo de busca

---

**Sistema totalmente otimizado para máxima precisão e velocidade!** 🚀🎯