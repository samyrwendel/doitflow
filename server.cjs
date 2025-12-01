const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Groq = require('groq-sdk').default;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const { getDatabase } = require('./database/db.cjs');
const { AuthService, authMiddleware, optionalAuthMiddleware } = require('./auth.cjs');
const { AgentScheduler, createSchedulerRoutes } = require('./scheduler.cjs');
const { ExpenseTracker, createExpenseRoutes } = require('./expense-tracker.cjs');
require('dotenv').config();

// Polyfill para fetch em versões antigas do Node
if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}

const app = express();
const port = process.env.PORT || 3002;

// Inicializar banco de dados, scheduler e expense tracker
let db = null;
let agentScheduler = null;
let expenseTracker = null;

(async () => {
  try {
    db = await getDatabase();
    console.log('🗄️ Sistema de persistência SQLite inicializado');

    // Inicializar scheduler (será configurado depois que as funções estiverem disponíveis)
    setTimeout(() => {
      if (db && typeof getEvolutionConfig === 'function' && typeof sendWhatsAppMessage === 'function') {
        agentScheduler = new AgentScheduler(db, getEvolutionConfig, sendWhatsAppMessage);
        // Registrar rotas do scheduler
        const schedulerRoutes = createSchedulerRoutes(agentScheduler, authMiddleware);
        app.use('/api/scheduler', schedulerRoutes);
        // Iniciar scheduler automaticamente
        agentScheduler.start(60000); // Verificar a cada minuto
        console.log('📅 Sistema de agendamento de agentes inicializado');
      }

      // Inicializar expense tracker
      if (db) {
        expenseTracker = new ExpenseTracker(db);
        const expenseRoutes = createExpenseRoutes(expenseTracker, authMiddleware);
        app.use('/api/expenses', expenseRoutes);
        console.log('💰 Sistema de monitoramento de gastos inicializado');
      }
    }, 2000);
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  }
})();

// Configuração do CORS
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Middleware de logging para todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Configuração do Groq SDK
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Configuração do Google Generative AI
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  console.warn('⚠️ GOOGLE_API_KEY não configurada no .env');
}
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

// Configuração da Evolution API (fallback para variáveis de ambiente)
const EVOLUTION_CONFIG = {
  baseUrl: process.env.EVOLUTION_API_URL || '',
  apiKey: process.env.EVOLUTION_API_KEY || ''
};

// Função para obter configuração dinâmica da Evolution API do banco de dados
async function getEvolutionConfig() {
  try {
    const config = await db.get(
      'SELECT * FROM system_settings WHERE key = ?',
      ['evolution_api_config']
    );

    if (config && config.value) {
      const parsed = JSON.parse(config.value);
      return {
        baseUrl: parsed.baseUrl || EVOLUTION_CONFIG.baseUrl,
        apiKey: parsed.apiKey || EVOLUTION_CONFIG.apiKey
      };
    }
  } catch (error) {
    console.error('Erro ao buscar config Evolution do banco:', error);
  }

  // Fallback para variáveis de ambiente
  return EVOLUTION_CONFIG;
}

// Função para enviar mensagem WhatsApp via Evolution API
async function sendWhatsAppMessage(deviceId, recipientNumber, messageText, apiKey = null) {
  try {
    const url = `${EVOLUTION_CONFIG.baseUrl}/message/sendText/${deviceId}`;
    
    // Normalizar número: remover caracteres não numéricos
    let normalizedNumber = recipientNumber.replace(/\D/g, '');
    
    // Se não começar com 55 (Brasil), adicionar
    if (!normalizedNumber.startsWith('55')) {
      normalizedNumber = '55' + normalizedNumber;
    }
    
    console.log(`[WHATSAPP] Número original: ${recipientNumber}, normalizado: ${normalizedNumber}`);
    
    // Usar API key do dispositivo ou fallback para a padrão
    const authKey = apiKey || EVOLUTION_CONFIG.apiKey;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': authKey
      },
      body: JSON.stringify({
        number: normalizedNumber,
        text: messageText, // Evolution API v2 usa "text" diretamente, não "textMessage"
        delay: 1200
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WHATSAPP] Erro ao enviar: ${response.status} - ${errorText}`);
      throw new Error(`Erro ao enviar mensagem WhatsApp: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[WHATSAPP] Mensagem enviada com sucesso:', result);
    return result;
  } catch (error) {
    console.error('[WHATSAPP] Erro na função sendWhatsAppMessage:', error);
    throw error;
  }
}

// Função para enviar IMAGEM via WhatsApp via Evolution API
async function sendWhatsAppMedia(deviceId, recipientNumber, imageBase64, caption, apiKey = null) {
  try {
    const url = `${EVOLUTION_CONFIG.baseUrl}/message/sendMedia/${deviceId}`;
    
    // Normalizar número: remover caracteres não numéricos
    let normalizedNumber = recipientNumber.replace(/\D/g, '');
    
    // Se não começar com 55 (Brasil), adicionar
    if (!normalizedNumber.startsWith('55')) {
      normalizedNumber = '55' + normalizedNumber;
    }
    
    console.log(`[WHATSAPP MEDIA] Número original: ${recipientNumber}, normalizado: ${normalizedNumber}`);
    
    // Usar API key do dispositivo ou fallback para a padrão
    const authKey = apiKey || EVOLUTION_CONFIG.apiKey;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': authKey
      },
      body: JSON.stringify({
        number: normalizedNumber,
        mediatype: 'image',
        mimetype: 'image/png',
        caption: caption || '',
        media: imageBase64, // Base64 da imagem
        fileName: 'image.png',
        delay: 1200
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WHATSAPP MEDIA] Erro ao enviar: ${response.status} - ${errorText}`);
      throw new Error(`Erro ao enviar mídia WhatsApp: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[WHATSAPP MEDIA] Imagem enviada com sucesso:', result);
    return result;
  } catch (error) {
    console.error('[WHATSAPP MEDIA] Erro na função sendWhatsAppMedia:', error);
    throw error;
  }
}

// Função auxiliar para gerar instruções de ferramentas
function getToolInstructions(hasEvolutionApi, evolutionInstance) {
  if (!hasEvolutionApi || !evolutionInstance) return '';
  
  return `

## FERRAMENTA: WhatsApp (${evolutionInstance.name})

Você pode enviar mensagens WhatsApp! Para isso, use o comando:

WHATSAPP_SEND:{"recipient":"Nome","number":"67999999999","message":"Texto"}

Para enviar IMAGENS (gráficos, desenhos), use:

WHATSAPP_MEDIA:{"recipient":"Nome","number":"67999999999","caption":"Legenda da imagem","imageBase64":"data:image/png;base64,..."}

REGRAS:
1. Se o usuário fornecer nome E número → envie imediatamente
2. Se faltar o número → peça educadamente
3. Aceite números com ou sem código do país (55 será adicionado automaticamente se necessário)
4. Para imagens: SEMPRE gere a imagem primeiro com Nano Banana, depois use WHATSAPP_MEDIA

EXEMPLOS:
- "manda oi pro João 67991234567" → WHATSAPP_SEND:{"recipient":"João","number":"67991234567","message":"Oi"}
- "envia teste pra Maria 5567998765432" → WHATSAPP_SEND:{"recipient":"Maria","number":"5567998765432","message":"teste"}
- "envia teste pra Angela" → "Qual o número da Angela?"
- "gera um gráfico de vendas e manda pro Carlos 67991234567" → 1) Gera imagem com Nano Banana 2) WHATSAPP_MEDIA com o base64
`;
}

// Função para detectar se o usuário quer ENVIAR a última imagem gerada via WhatsApp
function isWhatsAppSendLastImageRequest(message) {
  const lowerMessage = message.toLowerCase();
  
  // Detectar palavras de envio
  const sendKeywords = ['envia', 'envie', 'manda', 'mande', 'send'];
  const hasSendKeyword = sendKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Detectar palavras relacionadas a WhatsApp ou destinatário  
  const whatsappKeywords = ['whatsapp', 'pra ', 'para ', 'pro ', 'telefone', 'número', 'numero'];
  const hasWhatsAppKeyword = whatsappKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Detectar se menciona "essa imagem", "essa foto", "isso", etc
  const imageReferenceKeywords = ['essa imagem', 'essa foto', 'isso', 'esta imagem', 'a imagem'];
  const hasImageReference = imageReferenceKeywords.some(keyword => lowerMessage.includes(keyword));
  
  return (hasSendKeyword && hasWhatsAppKeyword) || (hasSendKeyword && hasImageReference);
}

// Função para detectar se o usuário quer gerar E ENVIAR imagem via WhatsApp
function isWhatsAppImageRequest(message) {
  const lowerMessage = message.toLowerCase();
  
  // Detectar palavras de geração de imagem
  const imageKeywords = ['desenhe', 'desenhar', 'gráfico', 'grafico', 'chart', 'crie uma imagem', 'gere uma imagem', 'faça uma imagem'];
  const hasImageKeyword = imageKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Detectar palavras de envio
  const sendKeywords = ['envia', 'envie', 'manda', 'mande', 'send'];
  const hasSendKeyword = sendKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Detectar palavras relacionadas a WhatsApp ou destinatário
  const whatsappKeywords = ['whatsapp', 'pra ', 'para ', 'pro '];
  const hasWhatsAppKeyword = whatsappKeywords.some(keyword => lowerMessage.includes(keyword));
  
  return hasImageKeyword && (hasSendKeyword || hasWhatsAppKeyword);
}

// Função para detectar se o usuário quer gerar uma imagem
function isImageGenerationRequest(message) {
  const imageKeywords = [
    // Português
    'desenhe', 'desenhar', 'desenha',
    'crie uma imagem', 'crie um desenho', 'crie uma ilustração',
    'gere uma imagem', 'gere um desenho', 'gere uma ilustração',
    'faça uma imagem', 'faça um desenho', 'faça uma ilustração',
    'gráfico', 'grafico', 'chart', 'plot',
    'ilustre', 'ilustração', 'ilustracao',
    'logo', 'logotipo', 'ícone', 'icone',
    'banner', 'poster', 'cartaz',
    'visualize', 'visualização', 'visualizacao',
    // Inglês
    'draw', 'drawing', 'create an image', 'generate an image',
    'make an image', 'design', 'sketch', 'illustration',
    'picture of', 'image of'
  ];
  
  const lowerMessage = message.toLowerCase();
  return imageKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Função para enriquecer prompt de imagem com contexto
function enrichImagePromptWithContext(currentMessage, conversationHistory) {
  // Se a mensagem é muito curta ou usa pronomes demonstrativos, precisa de contexto
  const needsContext = currentMessage.length < 50 || 
                       /\b(isso|este|esta|esse|essa|aquilo)\b/i.test(currentMessage);
  
  if (!needsContext || !conversationHistory || conversationHistory.length === 0) {
    return currentMessage;
  }
  
  // Buscar contexto relevante nas últimas 3 mensagens do usuário
  const recentUserMessages = conversationHistory
    .filter(msg => msg.role === 'user')
    .slice(-3)
    .map(msg => msg.content)
    .join('\n');
  
  // Extrair informações estruturadas (tabelas, dados, números)
  const hasStructuredData = /tabela|dados|estoque|quantidade|preço|valor|\d+/i.test(recentUserMessages);
  
  if (hasStructuredData) {
    // Criar prompt enriquecido
    const enrichedPrompt = `${currentMessage}

CONTEXTO ANTERIOR:
${recentUserMessages}

Crie uma visualização profissional baseada nos dados e informações do contexto acima.`;
    
    console.log('[CONTEXT] Prompt enriquecido com contexto:', enrichedPrompt.substring(0, 200) + '...');
    return enrichedPrompt;
  }
  
  return currentMessage;
}

// Função para gerar imagem com Nano Banana (Gemini 2.5 Flash Image)
async function generateImageWithNanoBanana(prompt, apiKey) {
  try {
    console.log('[NANO BANANA] Gerando imagem com prompt:', prompt);
    
    const genAIClient = new GoogleGenerativeAI(apiKey);
    const model = genAIClient.getGenerativeModel({ 
      model: 'gemini-2.5-flash-image'
    });

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['Image'],  // Apenas imagem, sem texto
      }
    });

    const response = result.response;
    
    // Extrair imagem da resposta
    if (response.candidates && response.candidates[0] && response.candidates[0].content) {
      const parts = response.candidates[0].content.parts;
      
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          console.log('[NANO BANANA] Imagem gerada com sucesso');
          return {
            imageData: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png'
          };
        }
      }
    }
    
    throw new Error('Formato de resposta inesperado do Nano Banana');
  } catch (error) {
    console.error('[NANO BANANA] Erro ao gerar imagem:', error);
    throw error;
  }
}

// Função para gerar imagem com DALL-E 3 (OpenAI) - REMOVIDA
// Não é mais necessária, usando Nano Banana nativo do Google

// Cache de embeddings em memória (será movido para SQLite depois)
const embeddingsCache = new Map();

// Estatísticas de uso
const usageStats = {
  embeddingsGenerated: 0,
  totalEmbeddingCost: 0,
  totalLLMCost: 0,
  requestsWithSemanticSearch: 0,
  requestsWithKeywordSearch: 0,
  requestsWithoutRAG: 0
};

// === FUNÇÕES DE CÁLCULO DE CUSTO ===

/**
 * Calcula o custo de embeddings do Google
 * @param {number} textLength - Comprimento do texto em caracteres
 * @returns {number} Custo em dólares
 */
function calculateEmbeddingCost(textLength) {
  // Google AI: $0.00001 por 1000 caracteres
  const costPer1kChars = 0.00001;
  return (textLength / 1000) * costPer1kChars;
}

/**
 * Calcula o custo de geração de imagem com Nano Banana
 * Gemini 2.5 Flash Image gera ~1290 tokens por imagem
 * @returns {number} Custo em dólares
 */
function calculateImageCost() {
  // Gemini 2.5 Flash Image: ~1290 tokens output por imagem
  const imageTokens = 1290;
  const outputCost = (imageTokens / 1000000) * 0.00075;
  return outputCost;
}

/**
 * Calcula o custo do LLM baseado no provedor e modelo
 * @param {number} inputTokens - Tokens de entrada
 * @param {number} outputTokens - Tokens de saída
 * @param {string} model - Nome do modelo
 * @returns {number} Custo em dólares
 */
function calculateLLMCost(inputTokens, outputTokens, model = 'llama-3.1-8b-instant') {
  // Gemini 2.5 Flash: $0.0001875 por 1M input, $0.00075 por 1M output (MUITO BARATO!)
  if (model.includes('gemini-2.5-flash')) {
    const inputCost = (inputTokens / 1000000) * 0.0001875;
    const outputCost = (outputTokens / 1000000) * 0.00075;
    return inputCost + outputCost;
  }
  
  // Gemini 2.0 Flash: mesmos preços do 2.5
  if (model.includes('gemini-2.0-flash')) {
    const inputCost = (inputTokens / 1000000) * 0.0001875;
    const outputCost = (outputTokens / 1000000) * 0.00075;
    return inputCost + outputCost;
  }
  
  // Groq Llama 3.1 8B: $0.05 por 1M input tokens, $0.08 por 1M output tokens
  const inputCost = (inputTokens / 1000000) * 0.05;
  const outputCost = (outputTokens / 1000000) * 0.08;
  return inputCost + outputCost;
}

/**
 * Estima tokens a partir de caracteres (aproximação: 1 token ≈ 4 caracteres)
 * @param {number} charCount - Número de caracteres
 * @returns {number} Número estimado de tokens
 */
function estimateTokens(charCount) {
  return Math.ceil(charCount / 4);
}

/**
 * Chama o LLM apropriado baseado no provedor
 * @param {string} provider - Provedor (groq, google, openai, etc)
 * @param {string} apiKey - API Key
 * @param {Array} messages - Array de mensagens [{role, content}]
 * @param {string} model - Nome do modelo
 * @param {Object} options - Opções adicionais (temperature, max_tokens, etc)
 * @returns {Promise<string>} Resposta do LLM
 */
async function callLLM(provider, apiKey, messages, model, options = {}) {
  const { temperature = 0.7, max_tokens = 500 } = options;
  
  if (provider === 'google') {
    // Google Gemini
    const genAIInstance = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAIInstance.getGenerativeModel({ model });
    
    // Converter mensagens para formato Gemini
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role === 'user');
    
    const prompt = systemMessage 
      ? `${systemMessage.content}\n\n${userMessages.map(m => m.content).join('\n')}`
      : userMessages.map(m => m.content).join('\n');
    
    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
    
  } else if (provider === 'groq') {
    // Groq
    const groqInstance = new Groq({ apiKey });
    const completion = await groqInstance.chat.completions.create({
      messages,
      model,
      temperature,
      max_tokens,
    });
    return completion.choices[0]?.message?.content || 'Erro ao processar resposta';
    
  } else {
    throw new Error(`Provedor ${provider} não suportado ainda`);
  }
}

// === FUNÇÕES DE EMBEDDINGS SEMÂNTICOS ===

/**
 * Gera embedding vetorial usando Google Generative AI
 * @param {string} text - Texto para gerar embedding
 * @param {string} userId - ID do usuário para estatísticas (opcional)
 * @returns {Promise<number[]>} Array de 768 dimensões
 */
async function generateEmbedding(text, userId = null) {
  try {
    // Verificar cache
    const cacheKey = text.substring(0, 100); // Primeiros 100 chars como chave
    if (embeddingsCache.has(cacheKey)) {
      console.log('📦 Embedding recuperado do cache');
      return embeddingsCache.get(cacheKey);
    }

    const model = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;
    
    // Cachear resultado
    embeddingsCache.set(cacheKey, embedding);
    
    // Rastrear estatísticas
    const cost = calculateEmbeddingCost(text.length);
    
    if (userId) {
      await incrementStats(userId, 'embeddings_generated', 1);
      await incrementStats(userId, 'total_embedding_cost', cost);
    }
    
    console.log(`✅ Embedding gerado: ${embedding.length} dimensões (custo: $${cost.toFixed(6)})`);
    
    return embedding;
  } catch (error) {
    console.error('❌ Erro ao gerar embedding:', error.message);
    return null;
  }
}

/**
 * Calcula similaridade coseno entre dois vetores
 * @param {number[]} vecA - Primeiro vetor
 * @param {number[]} vecB - Segundo vetor
 * @returns {number} Similaridade entre 0 e 1
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Busca semântica usando embeddings do Google
 * @param {string} query - Pergunta do usuário
 * @param {Array} ragDocuments - Documentos RAG
 * @param {number} maxChunks - Número máximo de chunks a retornar
 * @param {string} userId - ID do usuário para estatísticas
 * @returns {Promise<Object>} Chunks mais relevantes + métricas
 */
async function findSemanticChunks(query, ragDocuments, maxChunks = 5, userId = null) {
  const startTime = Date.now();
  
  if (!ragDocuments || ragDocuments.length === 0) {
    return { chunks: [], metrics: null };
  }

  console.log('🔍 Iniciando busca semântica com embeddings...');
  
  // 1. Gerar embedding da query
  const queryEmbedding = await generateEmbedding(query, userId);
  if (!queryEmbedding) {
    console.warn('⚠️ Falha ao gerar embedding da query, usando busca tradicional');
    return { chunks: [], metrics: null };
  }

  // 2. Calcular similaridade com cada chunk
  const scoredChunks = [];
  
  for (const doc of ragDocuments) {
    if (!doc.chunks || !Array.isArray(doc.chunks)) {
      continue;
    }
    
    for (let chunkIndex = 0; chunkIndex < doc.chunks.length; chunkIndex++) {
      const chunk = doc.chunks[chunkIndex];
      
      // Gerar embedding do chunk
      const chunkEmbedding = await generateEmbedding(chunk, userId);
      if (!chunkEmbedding) {
        continue;
      }
      
      // Calcular similaridade
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
      
      scoredChunks.push({
        text: chunk,
        similarity: similarity,
        docTitle: doc.title || doc.id,
        chunkIndex: chunkIndex
      });
    }
  }

  // 3. Ordenar por similaridade e retornar os melhores
  const results = scoredChunks
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxChunks);
  
  const processingTime = Date.now() - startTime;
  
  console.log(`✅ Busca semântica: ${results.length} chunks encontrados (${processingTime}ms)`);
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. Similaridade: ${(r.similarity * 100).toFixed(1)}% - "${r.text.substring(0, 60)}..."`);
  });
  
  // Rastrear estatísticas
  // usageStats.requestsWithSemanticSearch++; // Agora no banco de dados
  
  // Retornar chunks + métricas
  return {
    chunks: results.map(r => r.text),
    metrics: {
      searchMethod: 'semantic',
      chunksUsed: results.length,
      similarityScore: results.length > 0 ? results[0].similarity : 0,
      processingTime: processingTime,
      embeddingsGenerated: usageStats.embeddingsGenerated
    }
  };
}

// === ROTAS DE AUTENTICAÇÃO ===

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username e senha são obrigatórios' });
    }

    const result = await AuthService.login(username, password);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json({ error: result.error });
    }
  } catch (error) {
    console.error('Erro na rota de login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logout
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const result = await AuthService.logout(token);
    res.json(result);
  } catch (error) {
    console.error('Erro na rota de logout:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token
app.get('/api/auth/verify', authMiddleware, async (req, res) => {
  try {
    res.json({ 
      valid: true, 
      user: req.user 
    });
  } catch (error) {
    console.error('Erro na verificação de token:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar API keys do usuário
app.get('/api/auth/api-keys', authMiddleware, async (req, res) => {
  try {
    const apiKeys = await AuthService.getUserApiKeys(req.user.id);
    res.json({ apiKeys });
  } catch (error) {
    console.error('Erro ao buscar API keys:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar API keys para o modal de configuração (com keys mascaradas)
app.get('/api/auth/api-keys/modal', authMiddleware, async (req, res) => {
  try {
    const apiKeys = await AuthService.getUserApiKeysForModal(req.user.id);
    res.json({ success: true, apiKeys });
  } catch (error) {
    console.error('Erro ao buscar API keys para modal:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Salvar API key do usuário
app.post('/api/auth/api-keys', authMiddleware, async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    
    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider e API key são obrigatórios' });
    }

    const result = await AuthService.saveUserApiKey(req.user.id, provider, apiKey);
    res.json(result);
  } catch (error) {
    console.error('Erro ao salvar API key:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// === CONFIGURAÇÃO DO MULTER E OUTRAS CONFIGURAÇÕES ===

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + Date.now() + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB para vídeos e documentos grandes
  },
  fileFilter: (req, file, cb) => {
    // Aceitar áudio, vídeo e documentos
    const allowedMimeTypes = [
      // Áudio
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac', 'audio/ogg', 
      'audio/webm', 'audio/m4a', 'audio/x-m4a', 'audio/mp4',
      // Vídeo
      'video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/quicktime',
      'video/x-msvideo', 'video/mkv', 'video/x-matroska',
      // Documentos
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    
    const allowedExtensions = [
      '.mp3', '.wav', '.flac', '.ogg', '.m4a', '.webm', // Áudio
      '.mp4', '.webm', '.avi', '.mov', '.mkv', // Vídeo
      '.pdf', '.txt', '.md', '.docx', '.doc', '.xlsx', '.xls' // Documentos
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Formato não suportado: ${file.mimetype || ext}. Formatos aceitos: áudio (MP3, WAV, FLAC, OGG, M4A), vídeo (MP4, WebM, AVI, MOV, MKV) e documentos (PDF, TXT, DOC, DOCX, XLS, XLSX)`));
    }
  }
});

// Função para detectar se um arquivo é vídeo
function isVideoFile(file) {
  const videoMimeTypes = [
    'video/mp4',
    'video/webm',
    'video/avi',
    'video/mov',
    'video/quicktime',
    'video/x-msvideo',
    'video/mkv',
    'video/x-matroska',
    'video/flv',
    'video/x-flv'
  ];
  
  const videoExtensions = ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv', '.m4v'];
  
  if (file.mimetype && videoMimeTypes.includes(file.mimetype)) {
    return true;
  }
  
  if (file.originalname) {
    const ext = path.extname(file.originalname).toLowerCase();
    return videoExtensions.includes(ext);
  }
  
  return false;
}

// Função para extrair áudio de vídeo usando FFmpeg
function extractAudioFromVideo(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`🎬 Extraindo áudio de: ${videoPath}`);
    console.log(`🎵 Salvando em: ${outputPath}`);
    
    ffmpeg(videoPath)
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .format('wav')
      .on('start', (commandLine) => {
        console.log('FFmpeg comando:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`🔄 Progresso da extração: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('✅ Extração de áudio concluída com sucesso');
        resolve(outputPath);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('❌ Erro na extração de áudio:', err.message);
        console.error('FFmpeg stderr:', stderr);
        reject(err);
      })
      .save(outputPath);
  });
}

// === FUNÇÕES DE EXTRAÇÃO DE TEXTO DE DOCUMENTOS ===

/**
 * Extrai texto de diferentes formatos de documento
 * @param {string} filePath - Caminho do arquivo
 * @param {string} mimeType - Tipo MIME do arquivo
 * @param {string} originalName - Nome original do arquivo
 * @returns {Promise<string>} Texto extraído
 */
async function extractTextFromDocument(filePath, mimeType, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  
  console.log(`📄 Extraindo texto de: ${originalName} (${mimeType || ext})`);
  
  try {
    // PDF
    if (mimeType === 'application/pdf' || ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfParser = new PDFParse({ data: dataBuffer });
      const data = await pdfParser.getText();
      console.log(`✅ PDF processado: ${data.total} páginas, ${data.text.length} caracteres`);
      return data.text;
    }
    
    // TXT e outros arquivos de texto
    if (mimeType === 'text/plain' || ext === '.txt' || ext === '.md') {
      const text = fs.readFileSync(filePath, 'utf-8');
      console.log(`✅ Arquivo de texto processado: ${text.length} caracteres`);
      return text;
    }
    
    // DOC/DOCX
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        mimeType === 'application/msword' ||
        ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ path: filePath });
      console.log(`✅ Word processado: ${result.value.length} caracteres`);
      if (result.messages.length > 0) {
        console.warn('⚠️ Avisos durante extração:', result.messages);
      }
      return result.value;
    }
    
    // XLSX/XLS
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel' ||
        ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(filePath);
      let allText = '';
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetText = xlsx.utils.sheet_to_csv(worksheet);
        allText += `\n=== ${sheetName} ===\n${sheetText}\n`;
      });
      
      console.log(`✅ Excel processado: ${workbook.SheetNames.length} planilhas, ${allText.length} caracteres`);
      return allText;
    }
    
    throw new Error(`Formato não suportado: ${mimeType || ext}`);
    
  } catch (error) {
    console.error('❌ Erro ao extrair texto:', error);
    throw error;
  }
}

/**
 * Divide texto em chunks inteligentes
 * @param {string} text - Texto completo
 * @param {number} maxChunkSize - Tamanho máximo de cada chunk em caracteres
 * @returns {string[]} Array de chunks
 */
function splitTextIntoChunks(text, maxChunkSize = 1000) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/); // Divide por parágrafos
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // Se o parágrafo sozinho é maior que maxChunkSize, divide por sentenças
    if (paragraph.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize) {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk += ' ' + sentence;
        }
      }
    } else {
      // Adiciona parágrafo ao chunk atual
      if (currentChunk.length + paragraph.length > maxChunkSize) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

// Middleware removido - tratamento de erro será feito nos endpoints específicos

// WebAudioChunker simplificado (baseado na pasta transc/)
class WebAudioChunker {
  async getAudioDuration(file) {
    try {
      // Estimar duração baseada no tamanho do arquivo
      return (file.size / (1024 * 1024)) * 3 * 60; // 1MB ≈ 3 minutos
    } catch (error) {
      console.error('Erro ao obter duração do áudio:', error);
      return 120; // 2 minutos como fallback
    }
  }

  calculateOptimalChunkDuration(fileSizeBytes, totalDurationSeconds) {
    const maxChunkSizeMB = 20;
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    const estimatedWavSizeMB = fileSizeMB * 6;
    
    if (estimatedWavSizeMB <= maxChunkSizeMB) {
      return totalDurationSeconds;
    }
    
    const numberOfChunks = Math.ceil(estimatedWavSizeMB / maxChunkSizeMB);
    const chunkDuration = totalDurationSeconds / numberOfChunks;
    
    return Math.max(chunkDuration, 30);
  }

  async createTimeBasedChunks(file, chunkDurationSeconds) {
    // Simulação simplificada - na implementação real usaria Web Audio API
    const totalDuration = await this.getAudioDuration(file);
    const chunkDuration = this.calculateOptimalChunkDuration(file.size, totalDuration);
    const numberOfChunks = Math.ceil(totalDuration / chunkDuration);
    
    const chunks = [];
    for (let i = 0; i < numberOfChunks; i++) {
      chunks.push({
        blob: file, // Simulação - na implementação real criaria chunks reais
        index: i,
        startTime: i * chunkDuration,
        endTime: Math.min((i + 1) * chunkDuration, totalDuration),
        duration: Math.min(chunkDuration, totalDuration - i * chunkDuration)
      });
    }
    
    return chunks;
  }

  async processFile(file) {
    try {
      const duration = await this.getAudioDuration(file);
      const chunkDuration = this.calculateOptimalChunkDuration(file.size, duration);
      
      if (chunkDuration >= duration) {
        return [{
          blob: file,
          index: 0,
          startTime: 0,
          endTime: duration,
          duration: duration
        }];
      }
      
      return await this.createTimeBasedChunks(file, chunkDuration);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      throw error;
    }
  }
}

// Endpoint para transcrever chunks de áudio
app.post('/api/transcribe-chunk', upload.single('audio'), async (req, res) => {
  console.log('=== INÍCIO TRANSCRIBE-CHUNK ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('File:', req.file);
  
  try {
    if (!req.file) {
      console.log('ERRO: Nenhum arquivo foi enviado');
      return res.status(400).json({ error: 'Nenhum arquivo de áudio foi enviado' });
    }

    const filePath = req.file.path;
    const chunkIndex = req.body.chunkIndex || '0';
    const totalChunks = req.body.totalChunks || '1';
    
    console.log(`Transcrevendo chunk ${parseInt(chunkIndex) + 1}/${totalChunks}: ${filePath}`);
    console.log(`Tamanho do chunk: ${fs.statSync(filePath).size} bytes`);
    console.log('Iniciando chamada para API Groq...');

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'pt',
      temperature: 0.0,
    });

    console.log(`Chunk ${parseInt(chunkIndex) + 1}/${totalChunks} transcrito com sucesso.`);
    res.json({ 
      transcription: transcription.text,
      chunkIndex: parseInt(chunkIndex),
      totalChunks: parseInt(totalChunks)
    });

  } catch (error) {
    const safeChunkIndex = req.body.chunkIndex || '0';
    console.error(`Erro durante a transcrição do chunk ${safeChunkIndex}:`, error);
    
    // Log detalhado do erro
    if (error.status) {
      console.error(`Status HTTP: ${error.status}`);
    }
    if (error.cause) {
      console.error(`Causa do erro: ${error.cause.message}`);
      console.error(`Código do erro: ${error.cause.code}`);
    }
    
    // Mensagem de erro mais específica
    let errorMessage = `Erro ao processar chunk ${parseInt(safeChunkIndex || 0) + 1}.`;
    if (error.cause && error.cause.code === 'ECONNRESET') {
      errorMessage = 'Erro de conexão com a API do Groq. Verifique sua conexão com a internet.';
    } else if (error.status === 401) {
      errorMessage = 'Chave de API inválida ou expirada.';
    } else if (error.status === 429) {
      errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
    } else if (error.status === 400 && error.error?.error?.message?.includes('file must be one of the following types')) {
      errorMessage = 'Formato de arquivo não suportado. Use: flac, mp3, mp4, mpeg, mpga, m4a, ogg, opus, wav ou webm.';
    }
    
    res.status(500).json({ error: errorMessage });
  } finally {
    // Clean up the uploaded file
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error(`Falha ao remover o arquivo temporário: ${req.file.path}`, err);
        }
      });
    }
  }
});

// Endpoint para transcrição completa de áudio
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio foi enviado' });
    }

    const filePath = req.file.path;
    console.log(`Transcrevendo arquivo: ${filePath}`);
    console.log(`Tamanho do arquivo: ${fs.statSync(filePath).size} bytes`);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'pt',
      temperature: 0.0,
    });

    console.log('Transcrição bem-sucedida.');
    res.json({ transcription: transcription.text });

  } catch (error) {
    console.error('Erro durante a transcrição:', error);
    
    // Log detalhado do erro
    if (error.status) {
      console.error(`Status HTTP: ${error.status}`);
    }
    if (error.cause) {
      console.error(`Causa do erro: ${error.cause.message}`);
      console.error(`Código do erro: ${error.cause.code}`);
    }
    
    // Mensagem de erro mais específica
    let errorMessage = 'Ocorreu um erro ao processar o áudio.';
    if (error.cause && error.cause.code === 'ECONNRESET') {
      errorMessage = 'Erro de conexão com a API do Groq. Verifique sua conexão com a internet.';
    } else if (error.status === 401) {
      errorMessage = 'Chave de API inválida ou expirada.';
    } else if (error.status === 429) {
      errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
    } else if (error.status === 400 && error.error?.error?.message?.includes('file must be one of the following types')) {
      errorMessage = 'Formato de arquivo não suportado. Use: flac, mp3, mp4, mpeg, mpga, m4a, ogg, opus, wav ou webm.';
    }
    
    res.status(500).json({ error: errorMessage });
  } finally {
    // Clean up the uploaded file
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error(`Falha ao remover o arquivo temporário: ${req.file.path}`, err);
        }
      });
    }
  }
});

// === ENDPOINT PARA UPLOAD DE DOCUMENTOS (PDF, TXT, DOC, DOCX, XLSX) ===
app.post('/api/upload-document', authMiddleware, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum documento foi enviado' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;
    
    console.log(`📄 Processando documento: ${fileName}`);
    console.log(`📁 Tamanho: ${(fileSize / 1024).toFixed(2)} KB`);
    console.log(`🏷️ Tipo: ${mimeType}`);

    // Extrair texto do documento
    let extractedText;
    try {
      extractedText = await extractTextFromDocument(filePath, mimeType, fileName);
    } catch (error) {
      console.error('❌ Erro ao extrair texto:', error);
      return res.status(400).json({ 
        error: `Não foi possível processar o documento: ${error.message}` 
      });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ 
        error: 'O documento não contém texto extraível' 
      });
    }

    console.log(`📝 Texto extraído: ${extractedText.length} caracteres`);

    // Dividir em chunks
    const chunks = splitTextIntoChunks(extractedText, 1000);
    console.log(`✂️ Documento dividido em ${chunks.length} chunks`);

    // Gerar ID único para o documento
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Gerar embeddings para todos os chunks (se habilitado)
    const enableSemanticSearch = process.env.ENABLE_SEMANTIC_SEARCH === 'true';
    let totalEmbeddingCost = 0;
    
    if (enableSemanticSearch) {
      console.log('🧠 Gerando embeddings para os chunks...');
      for (let i = 0; i < chunks.length; i++) {
        try {
          await generateEmbedding(chunks[i], req.user.id);
          totalEmbeddingCost += calculateEmbeddingCost(chunks[i].length);
          
          if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
            console.log(`   Progresso: ${i + 1}/${chunks.length} embeddings gerados`);
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao gerar embedding para chunk ${i + 1}:`, error.message);
        }
      }
      console.log(`💰 Custo total de embeddings: $${totalEmbeddingCost.toFixed(6)}`);
    }

    // Salvar no banco de dados
    const ragDocument = {
      id: documentId,
      title: fileName,
      content: extractedText,
      chunks: JSON.stringify(chunks),
      source: 'document',
      fileType: path.extname(fileName).toLowerCase(),
      fileSize: fileSize,
      chunkCount: chunks.length,
      characterCount: extractedText.length,
      embeddingCost: totalEmbeddingCost,
      createdAt: new Date().toISOString(),
      userId: req.user.id
    };

    await db.run(
      `INSERT INTO rag_documents (
        id, title, content, chunks, source, file_type, file_size, 
        chunk_count, character_count, embedding_cost, created_at, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ragDocument.id,
        ragDocument.title,
        ragDocument.content,
        ragDocument.chunks,
        ragDocument.source,
        ragDocument.fileType,
        ragDocument.fileSize,
        ragDocument.chunkCount,
        ragDocument.characterCount,
        ragDocument.embeddingCost,
        ragDocument.createdAt,
        ragDocument.userId
      ]
    );

    console.log(`✅ Documento salvo no banco: ${documentId}`);

    // Retornar resposta
    res.json({
      success: true,
      document: {
        id: ragDocument.id,
        title: ragDocument.title,
        chunks: chunks,
        chunkCount: chunks.length,
        characterCount: extractedText.length,
        embeddingCost: totalEmbeddingCost,
        fileType: ragDocument.fileType,
        fileSize: ragDocument.fileSize,
        createdAt: ragDocument.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Erro ao processar documento:', error);
    res.status(500).json({ 
      error: 'Erro ao processar documento',
      details: error.message 
    });
  } finally {
    // Limpar arquivo temporário
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error(`Falha ao remover arquivo temporário: ${req.file.path}`, err);
        }
      });
    }
  }
});

// Endpoint para transcrição de vídeos
app.post('/api/video-transcription', upload.single('video'), async (req, res) => {
  let extractedAudioPath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de vídeo foi enviado' });
    }

    // Verificar se é realmente um arquivo de vídeo
    if (!isVideoFile(req.file)) {
      return res.status(400).json({ 
        error: 'Formato de arquivo não suportado. Envie um arquivo de vídeo (MP4, WebM, AVI, MOV, MKV, FLV)' 
      });
    }

    const videoPath = req.file.path;
    const videoName = path.basename(req.file.originalname, path.extname(req.file.originalname));
    extractedAudioPath = path.join(os.tmpdir(), `audio_${Date.now()}_${videoName}.wav`);
    
    console.log(`🎬 Processando vídeo: ${req.file.originalname}`);
    console.log(`📁 Tamanho: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`🎵 Extraindo áudio para: ${extractedAudioPath}`);

    // Extrair áudio do vídeo
    try {
      await extractAudioFromVideo(videoPath, extractedAudioPath);
    } catch (extractError) {
      console.error('Erro na extração de áudio:', extractError);
      return res.status(500).json({ 
        error: 'Erro ao extrair áudio do vídeo. Verifique se o arquivo é um vídeo válido.' 
      });
    }

    // Verificar se o arquivo de áudio foi criado
    if (!fs.existsSync(extractedAudioPath)) {
      return res.status(500).json({ 
        error: 'Falha na extração do áudio do vídeo' 
      });
    }

    const audioStats = fs.statSync(extractedAudioPath);
    console.log(`✅ Áudio extraído: ${(audioStats.size / (1024 * 1024)).toFixed(2)} MB`);

    // Processar o arquivo de áudio com o sistema de chunks existente
    const chunker = new WebAudioChunker();
    const chunks = await chunker.processFile({
      ...req.file,
      path: extractedAudioPath,
      size: audioStats.size
    });

    console.log(`📦 Arquivo dividido em ${chunks.length} chunks`);

    // Processar todos os chunks automaticamente
    const transcriptions = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`🎵 Transcrevendo chunk ${i + 1}/${chunks.length} do vídeo...`);
      
      // Criar chunk de áudio temporário
      const chunkPath = path.join(os.tmpdir(), `video_chunk_${Date.now()}_${i}.wav`);
      
      try {
        // Para vídeos, precisamos extrair cada chunk do áudio principal
        // Por simplicidade, vamos usar o áudio completo dividindo por tempo
        const duration = audioStats.size / (1024 * 1024) * 60; // Estimativa
        const chunkDuration = duration / chunks.length;
        const startTime = i * chunkDuration;
        const endTime = Math.min((i + 1) * chunkDuration, duration);
        
        // Extrair chunk específico do áudio
        await new Promise((resolve, reject) => {
          ffmpeg(extractedAudioPath)
            .seekInput(startTime)
            .duration(chunkDuration)
            .audioCodec('pcm_s16le')
            .audioFrequency(16000)
            .audioChannels(1)
            .format('wav')
            .on('end', resolve)
            .on('error', reject)
            .save(chunkPath);
        });

        // Transcrever chunk
        const transcription = await groq.audio.transcriptions.create({
          file: fs.createReadStream(chunkPath),
          model: 'whisper-large-v3',
          response_format: 'json',
          language: 'pt',
          temperature: 0.0,
        });

        transcriptions.push({
          text: transcription.text,
          startTime: startTime,
          endTime: endTime,
          index: i
        });

        console.log(`✅ Chunk ${i + 1}/${chunks.length} transcrito`);

      } catch (chunkError) {
        console.error(`❌ Erro no chunk ${i + 1}:`, chunkError);
        // Tentar transcrever o arquivo completo como fallback
        if (i === 0) {
          console.log('🔄 Fallback: transcrevendo áudio completo...');
          const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(extractedAudioPath),
            model: 'whisper-large-v3',
            response_format: 'json',
            language: 'pt',
            temperature: 0.0,
          });

          console.log('✅ Transcrição de vídeo (completa) concluída com sucesso');
          return res.json({ 
            transcription: transcription.text,
            source: 'video',
            filename: req.file.originalname,
            chunks: 1,
            method: 'complete'
          });
        }
      } finally {
        // Limpar chunk temporário
        if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath);
        }
      }
    }

    // Combinar todas as transcrições
    if (transcriptions.length > 0) {
      const fullTranscription = transcriptions
        .sort((a, b) => a.index - b.index)
        .map(t => t.text)
        .join(' ');

      console.log('✅ Transcrição de vídeo (chunks) concluída com sucesso');
      res.json({
        transcription: fullTranscription,
        source: 'video',
        filename: req.file.originalname,
        chunks: transcriptions.length,
        method: 'chunks',
        duration: transcriptions[transcriptions.length - 1]?.endTime || 0
      });
    } else {
      throw new Error('Falha ao transcrever qualquer chunk do vídeo');
    }

  } catch (error) {
    console.error('❌ Erro durante transcrição de vídeo:', error);
    
    let errorMessage = 'Erro ao processar vídeo.';
    if (error.status === 401) {
      errorMessage = 'Chave de API inválida ou expirada.';
    } else if (error.status === 429) {
      errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
    } else if (error.message.includes('ffmpeg')) {
      errorMessage = 'Erro no processamento do vídeo. Verifique se o arquivo não está corrompido.';
    }
    
    res.status(500).json({ error: errorMessage });
  } finally {
    // Limpeza dos arquivos temporários
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error(`Falha ao remover vídeo temporário: ${req.file.path}`, err);
        }
      });
    }
    
    // Remover áudio extraído
    if (extractedAudioPath && fs.existsSync(extractedAudioPath)) {
      fs.unlink(extractedAudioPath, (err) => {
        if (err) {
          console.error(`Falha ao remover áudio extraído: ${extractedAudioPath}`, err);
        }
      });
    }
  }
});

// Função para calcular similaridade melhorada entre textos
function calculateSimilarity(text1, text2) {
  // Dicionário de sinônimos e palavras relacionadas
  const synonyms = {
    'criou': ['desenvolvedor', 'criador', 'criado', 'criação', 'desenvolveu', 'fez', 'construiu'],
    'criador': ['desenvolvedor', 'criou', 'criado', 'criação', 'desenvolveu', 'fez', 'construiu'],
    'desenvolvedor': ['criador', 'criou', 'criado', 'criação', 'desenvolveu', 'fez', 'construiu'],
    'quem': ['nome', 'pessoa', 'indivíduo', 'autor'],
    'sofia': ['sofia', 'sistema', 'software', 'ferramenta', 'plataforma'],
    'nome': ['quem', 'pessoa', 'indivíduo', 'chamado', 'sou'],
    'horário': ['hora', 'horas', 'tempo', 'funcionamento', 'atendimento', 'período', 'das', 'às', 'segunda', 'sexta', 'dias'],
    'funcionamento': ['horário', 'hora', 'horas', 'tempo', 'atendimento', 'período', 'das', 'às', 'segunda', 'sexta', 'dias'],
    'agendamento': ['agendar', 'consulta', 'consultas', 'marcar', 'marcação', 'appointment'],
    'agendar': ['agendamento', 'consulta', 'consultas', 'marcar', 'marcação', 'appointment'],
    'consulta': ['agendamento', 'agendar', 'consultas', 'marcar', 'marcação', 'appointment'],
    'consultas': ['agendamento', 'agendar', 'consulta', 'marcar', 'marcação', 'appointment'],
    'das': ['horário', 'funcionamento', 'hora', 'horas', 'tempo', 'período'],
    'às': ['horário', 'funcionamento', 'hora', 'horas', 'tempo', 'período'],
    'segunda': ['horário', 'funcionamento', 'dias', 'período', 'semana'],
    'sexta': ['horário', 'funcionamento', 'dias', 'período', 'semana']
  };
  
  // Remove pontuação e normaliza o texto
  const normalize = (text) => text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .split(/\s+/)
    .filter(word => word.length > 2); // Remove palavras muito curtas
  
  const words1 = normalize(text1);
  const words2 = normalize(text2);
  
  let score = 0;
  let totalWords = words1.length;
  
  // Pontuação por correspondência exata
  words1.forEach(word1 => {
    if (words2.includes(word1)) {
      score += 1.0; // Correspondência exata vale mais
    } else {
      // Verificar sinônimos
      const relatedWords = synonyms[word1] || [];
      const hasRelated = relatedWords.some(related => words2.includes(related));
      if (hasRelated) {
        score += 0.7; // Sinônimos valem menos que correspondência exata
      }
    }
  });
  
  // Verificar correspondências inversas (palavras do texto2 que estão em texto1)
  words2.forEach(word2 => {
    if (words1.includes(word2)) {
      score += 0.5; // Correspondência inversa vale menos
    } else {
      const relatedWords = synonyms[word2] || [];
      const hasRelated = relatedWords.some(related => words1.includes(related));
      if (hasRelated) {
        score += 0.3; // Sinônimos inversos valem ainda menos
      }
    }
  });
  
  // Normalizar o score
  const maxPossibleScore = totalWords + words2.length;
  return maxPossibleScore > 0 ? score / maxPossibleScore : 0;
}

// Função para buscar chunks relevantes
function findRelevantChunks(query, ragDocuments, maxChunks = 5) {
  if (!ragDocuments || ragDocuments.length === 0) {
    console.log('Nenhum documento RAG disponível');
    return [];
  }
  
  console.log(`Processando ${ragDocuments.length} documentos RAG`);
  const allChunks = [];
  let hasLongDocuments = false;
  
  ragDocuments.forEach((doc, docIndex) => {
    console.log(`Documento ${docIndex + 1}:`, {
      id: doc.id,
      title: doc.title,
      hasChunks: !!doc.chunks,
      chunksLength: doc.chunks?.length,
      hasContent: !!doc.content,
      contentLength: doc.content?.length,
      isLongDocument: doc.metadata?.isLongDocument
    });
    
    // Detectar se temos documentos longos
    if (doc.metadata?.isLongDocument || (doc.chunks && doc.chunks.length > 10)) {
      hasLongDocuments = true;
    }
    
    // Verificar se o documento tem chunks ou se é um documento simples
    if (doc.chunks && Array.isArray(doc.chunks)) {
      // Documento com chunks (estrutura do frontend)
      doc.chunks.forEach((chunk, chunkIndex) => {
        const similarity = calculateSimilarity(query, chunk);
        console.log(`Chunk ${chunkIndex + 1} similaridade: ${similarity.toFixed(3)}`);
        allChunks.push({
          content: chunk,
          similarity: similarity,
          source: doc.title || doc.id,
          chunkIndex: chunkIndex,
          isFromLongDoc: doc.metadata?.isLongDocument || false
        });
      });
    } else if (doc.content) {
      // Documento simples (estrutura de teste)
      const similarity = calculateSimilarity(query, doc.content);
      console.log(`Documento simples similaridade: ${similarity.toFixed(3)}`);
      allChunks.push({
        content: doc.content,
        similarity: similarity,
        source: doc.title || doc.id || 'Documento',
        chunkIndex: 0,
        isFromLongDoc: false
      });
    }
  });
  
  console.log(`Total de chunks processados: ${allChunks.length}`);
  
  // Ajustar número máximo de chunks para documentos longos
  const adaptiveMaxChunks = hasLongDocuments ? Math.min(maxChunks * 2, 8) : maxChunks;
  
  // Ordenar por similaridade e retornar os mais relevantes
  const relevantChunks = allChunks
    .sort((a, b) => {
      // Priorizar chunks de documentos longos com boa similaridade
      if (a.isFromLongDoc && !b.isFromLongDoc && a.similarity > 0.1) return -1;
      if (b.isFromLongDoc && !a.isFromLongDoc && b.similarity > 0.1) return 1;
      return b.similarity - a.similarity;
    })
    .slice(0, adaptiveMaxChunks)
    .filter(chunk => chunk.similarity > 0.01); // Threshold mais baixo para documentos longos
    
  console.log(`Chunks relevantes encontrados: ${relevantChunks.length} (max adaptativo: ${adaptiveMaxChunks})`);
  relevantChunks.forEach((chunk, index) => {
    console.log(`Chunk relevante ${index + 1}: similaridade ${chunk.similarity.toFixed(3)} ${chunk.isFromLongDoc ? '(doc longo)' : ''}`);
  });
  
  return relevantChunks;
}

// Endpoint de chat com RAG
app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { message, ragDocuments, useSmartSearch, customPrompt, sessionId, model, agentId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Verificar se o agente tem ferramentas habilitadas
    let agentTools = [];
    let hasEvolutionApi = false;
    let evolutionInstance = null;
    
    if (agentId && db) {
      try {
        agentTools = await db.getAgentTools(agentId);
        const evolutionTool = agentTools.find(tool => 
          tool.name === 'evolution_api' && (tool.is_enabled === 1 || tool.is_enabled === true)
        );
        
        if (evolutionTool) {
          hasEvolutionApi = true;
          // Buscar instância Evolution (dispositivo WhatsApp)
          const devices = await db.all(
            'SELECT * FROM whatsapp_devices WHERE user_id = ? AND connection_status = ? ORDER BY created_at DESC LIMIT 1',
            [req.user.id, 'open']
          );
          if (devices && devices.length > 0) {
            evolutionInstance = devices[0];
            console.log('[TOOLS] Evolution API habilitada, dispositivo:', evolutionInstance.name);
          }
        }
      } catch (toolError) {
        console.warn('[TOOLS] Erro ao verificar ferramentas do agente:', toolError.message);
      }
    }

    // Buscar API key do usuário para o provedor selecionado
    let apiKey = null;
    let provider = 'google'; // Default (Gemini)

    // Determinar o provedor baseado no modelo
    if (model?.includes('gpt-') || model?.includes('o3') || model?.includes('openai/')) {
      provider = 'openai';
    } else if (model?.includes('claude-')) {
      provider = 'anthropic';
    } else if (model?.includes('deepseek-')) {
      provider = 'deepseek';
    } else if (model?.includes('mistral-') || model?.includes('magistral-') || model?.includes('codestral-')) {
      provider = 'mistral';
    } else if (model?.includes('gemini-')) {
      provider = 'google';
    } else if (model?.includes('llama') || model?.includes('mixtral') || model?.includes('gemma')) {
      provider = 'groq';
    }

    // Buscar API key do usuário
    apiKey = await AuthService.getUserApiKey(req.user.id, provider);
    
    if (!apiKey) {
      // Se não tiver API key do usuário, usar a padrão do sistema
      if (provider === 'groq') {
        apiKey = process.env.GROQ_API_KEY;
      } else if (provider === 'google') {
        apiKey = process.env.GOOGLE_API_KEY;
      } else {
        return res.status(400).json({ 
          error: `API Key do ${provider} não configurada. Configure na seção de API Keys.`
        });
      }
    }

    // Modelo padrão se não especificado
    const selectedModel = model || 'gemini-2.5-flash';

    // Gerar ID de sessão se não fornecido
    const currentSessionId = sessionId || 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    console.log('Recebida mensagem:', message);
    console.log('Usuário:', req.user.username);
    console.log('Modelo LLM:', selectedModel);
    console.log('Provider:', provider);
    console.log('Sessão:', currentSessionId);
    console.log('AgentId:', agentId);
    console.log('Documentos RAG disponíveis:', ragDocuments?.length || 0);
    console.log('Busca inteligente:', useSmartSearch ? 'Ativada' : 'Desativada');
    console.log('Prompt customizado:', customPrompt ? 'Sim (' + customPrompt.substring(0, 50) + '...)' : 'Não');

    // Criar ou obter sessão do agente
    if (agentId && db) {
      try {
        const existingSession = await db.getAgentSessionById(currentSessionId);
        if (!existingSession) {
          await db.createAgentSession({
            id: currentSessionId,
            agentId: agentId,
            userId: req.user.id,
            sessionName: null,
            isActive: true
          });
          console.log('📝 Nova sessão de agente criada:', currentSessionId);
        }
      } catch (sessionError) {
        console.warn('Aviso: Erro ao criar/verificar sessão:', sessionError.message);
      }
    }

    // Salvar mensagem do usuário usando agent_messages
    if (db && agentId) {
      try {
        await db.createAgentMessage({
          id: 'msg_user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          sessionId: currentSessionId,
          agentId: agentId,
          userId: req.user.id,
          role: 'user',
          content: message,
          ragDocumentIds: ragDocuments?.map(d => d.id) || null,
          metadata: {
            hasRAG: Boolean(ragDocuments?.length),
            useSmartSearch: Boolean(useSmartSearch),
            hasCustomPrompt: Boolean(customPrompt)
          }
        });
      } catch (dbError) {
        console.warn('Aviso: Erro ao salvar mensagem do usuário:', dbError.message);
      }
    }
    
    let response;
    let responseMetadata = {};
    
    // DETECÇÃO DE FERRAMENTA: Evolution API (Enviar mensagem WhatsApp)
    if (hasEvolutionApi && evolutionInstance) {
      const sendMessagePattern = /(?:mand[ae]|envi[ae]|enviar)\s+(?:uma\s+)?mensagem\s+(?:para|pro)\s+(?:o\s+)?(\w+)/i;
      const match = message.match(sendMessagePattern);
      
      if (match) {
        const recipientName = match[1];
        console.log(`[TOOLS] Detectado pedido para enviar mensagem para: ${recipientName}`);
        
        try {
          // Extrair conteúdo da mensagem (texto após o nome do destinatário)
          const messageContent = message.replace(sendMessagePattern, '').trim() || 'Olá! Esta é uma mensagem enviada via IA.';
          
          // Usar o owner_jid do dispositivo como número de destino (por simplicidade)
          // Em produção, você deveria ter um mapeamento nome -> número
          const recipientNumber = evolutionInstance.owner_jid;
          
          console.log(`[TOOLS] Enviando mensagem WhatsApp...`);
          console.log(`[TOOLS] Dispositivo: ${evolutionInstance.id}`);
          console.log(`[TOOLS] Destinatário: ${recipientNumber}`);
          console.log(`[TOOLS] Mensagem: ${messageContent}`);
          
          const result = await sendWhatsAppMessage(
            evolutionInstance.id,
            recipientNumber,
            messageContent
          );
          
          console.log('[TOOLS] ✅ Mensagem enviada com sucesso!', result);
          
          response = `Mensagem enviada com sucesso para ${recipientName} via WhatsApp!`;
          responseMetadata = {
            toolUsed: 'evolution_api',
            action: 'send_message',
            recipient: recipientName,
            number: recipientNumber,
            deviceUsed: evolutionInstance.name,
            sentMessage: messageContent,
            success: true
          };
          
          // Salvar resposta do assistente e retornar
          if (db) {
            try {
              await db.createChatMessage({
                id: 'msg_assistant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                userId: req.user.id,
                sessionId: currentSessionId,
                role: 'assistant',
                content: response,
                metadata: responseMetadata
              });
            } catch (dbError) {
              console.warn('Aviso: Erro ao salvar mensagem do assistente:', dbError.message);
            }
          }
          
          return res.json({
            response,
            metadata: responseMetadata,
            sessionId: currentSessionId
          });
          
        } catch (toolError) {
          console.error('[TOOLS] ❌ Erro ao enviar mensagem WhatsApp:', toolError);
          response = `Desculpe, não consegui enviar a mensagem via WhatsApp. Erro: ${toolError.message}`;
          responseMetadata = {
            toolUsed: 'evolution_api',
            action: 'send_message',
            success: false,
            error: toolError.message
          };
        }
      }
    }
    
    // DETECÇÃO PRIORITÁRIA: Geração de Imagem + Envio WhatsApp (COM NÚMERO)
    if (isWhatsAppImageRequest(message) && hasEvolutionApi && evolutionInstance && apiKey) {
      // Extrair número de telefone da mensagem
      const phoneMatch = message.match(/(\d{10,13})/);
      
      if (phoneMatch) {
        // TEM NÚMERO: Gerar e enviar
        console.log('[WHATSAPP+IMAGE] Detectado pedido de gerar e enviar imagem via WhatsApp COM número');
        
        const recipientNumber = phoneMatch[0];
        
        // Validar número de exemplo
        const dangerousNumbers = ['5567912345678', '5567991234567', '556799123456', '11999999999', '5511999999999'];
        if (dangerousNumbers.includes(recipientNumber.replace(/\D/g, ''))) {
          response = `❌ ERRO CRÍTICO: Número de exemplo detectado. Nunca envie mensagens para números de exemplo!`;
          responseMetadata = { searchMethod: 'casual', toolUsed: 'evolution_api', error: 'Número de exemplo bloqueado' };
        } else {
          try {
            // 1. Gerar imagem com Nano Banana
            console.log('[WHATSAPP+IMAGE] Etapa 1: Gerando imagem...');
            const { imageData, mimeType } = await generateImageWithNanoBanana(message, apiKey);
            
            // 2. Enviar via WhatsApp
            console.log('[WHATSAPP+IMAGE] Etapa 2: Enviando para WhatsApp...');
            const recipientName = message.match(/pra?\s+([a-záàâãéèêíïóôõöúçñ]+)/i)?.[1] || 'destinatário';
            const caption = message.match(/(gráfico|grafico|chart|desenho|imagem)[^\d]*/i)?.[0]?.trim() || 'Imagem gerada';
            
            const result = await sendWhatsAppMedia(
              evolutionInstance.name,
              recipientNumber,
              imageData,
              caption,
              evolutionInstance.api_key
            );
            
            console.log('[WHATSAPP+IMAGE] ✅ Imagem gerada e enviada com sucesso!');
            
            response = `🖼️✅ Imagem gerada e enviada para ${recipientName} (${recipientNumber}) via WhatsApp!\n\n**Dispositivo:** ${evolutionInstance.name}\n**Legenda:** "${caption}"`;
            
            responseMetadata = {
              searchMethod: 'casual',
              toolUsed: 'evolution_api',
              action: 'send_media',
              recipient: recipientName,
              number: recipientNumber,
              deviceUsed: evolutionInstance.name,
              sentCaption: caption,
              imageData: imageData,
              imageFormat: mimeType.replace('image/', ''),
              prompt: message,
              success: true
            };
            
            // Salvar mensagem
            if (db && agentId) {
              try {
                await db.createAgentMessage({
                  id: 'msg_assistant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                  sessionId: currentSessionId,
                  agentId: agentId,
                  userId: req.user.id,
                  role: 'assistant',
                  content: response,
                  toolUsed: 'evolution_api',
                  metadata: responseMetadata
                });
              } catch (dbError) {
                console.warn('Aviso: Erro ao salvar mensagem:', dbError.message);
              }
            }
            
            return res.json({
              response,
              metadata: responseMetadata,
              sessionId: currentSessionId
            });
            
          } catch (error) {
            console.error('[WHATSAPP+IMAGE] ❌ Erro:', error);
            response = `❌ Erro ao gerar/enviar imagem: ${error.message}`;
            responseMetadata = {
              searchMethod: 'casual',
              toolUsed: 'evolution_api',
              error: error.message
            };
          }
        }
        
        // Salvar resposta (sucesso ou erro)
        if (db && agentId) {
          try {
            await db.createAgentMessage({
              id: 'msg_assistant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
              sessionId: currentSessionId,
              agentId: agentId,
              userId: req.user.id,
              role: 'assistant',
              content: response,
              metadata: responseMetadata
            });
          } catch (dbError) {
            console.warn('Aviso: Erro ao salvar mensagem:', dbError.message);
          }
        }
        
        return res.json({
          response,
          metadata: responseMetadata,
          sessionId: currentSessionId
        });
      }
      // Se não tem número, cai para geração normal de imagem abaixo
    }
    
    // DETECÇÃO: Geração de Imagem com Nano Banana (Gemini 2.5 Flash Image)
    if (isImageGenerationRequest(message) && apiKey) {
      console.log('[NANO BANANA] Detectado pedido de geração de imagem');
      
      // Buscar contexto para enriquecer o prompt
      let conversationHistory = [];
      if (db && agentId) {
        try {
          const historyMessages = await db.getAgentMessages(currentSessionId, 10);
          conversationHistory = historyMessages;
        } catch (error) {
          console.warn('[CONTEXT] Erro ao buscar histórico:', error.message);
        }
      }
      
      // Enriquecer prompt com contexto
      const enrichedPrompt = enrichImagePromptWithContext(message, conversationHistory);
      
      try {
        const { imageData, mimeType } = await generateImageWithNanoBanana(enrichedPrompt, apiKey);
        
        // Extrair tags do contexto para facilitar referências futuras
        const tags = [];
        if (/gráfico|grafico|chart/i.test(message)) tags.push('gráfico');
        if (/tabela|dados|estoque/i.test(message)) tags.push('dados');
        if (/limonada|produto|item/i.test(conversationHistory.map(m => m.content).join(' '))) tags.push('produtos');
        if (/financeiro|vendas|receita|despesa/i.test(message)) tags.push('financeiro');
        if (/mockup|mock|exemplo/i.test(message)) tags.push('mockup');
        
        // Calcular custo da geração de imagem
        const imageCost = calculateImageCost();
        await incrementStats(req.user.id, 'total_llm_cost', imageCost);
        await incrementStats(req.user.id, 'images_generated', 1); // Contador de imagens
        
        response = `Imagem gerada com sucesso! 🎨`;
        responseMetadata = {
          toolUsed: 'nano_banana',
          action: 'generate_image',
          prompt: message, // Prompt original do usuário
          enrichedPrompt: enrichedPrompt, // Prompt enriquecido com contexto
          tags: tags, // Tags para facilitar busca futura
          imageData: imageData,
          imageFormat: mimeType.replace('image/', ''),
          model: 'gemini-2.5-flash-image',
          cost: imageCost,
          tokensEstimated: 1290,
          success: true
        };
        
        console.log('[NANO BANANA] Tags extraídas:', tags.join(', '));
        console.log(`[NANO BANANA] 💰 Custo: $${imageCost.toFixed(6)} (~1290 tokens)`);
        
        // Salvar mensagem do assistente com imagem
        if (db && agentId) {
          try {
            await db.createAgentMessage({
              id: 'msg_assistant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
              sessionId: currentSessionId,
              agentId: agentId,
              userId: req.user.id,
              role: 'assistant',
              content: response,
              toolUsed: 'nano_banana',
              metadata: responseMetadata
            });
          } catch (dbError) {
            console.warn('Aviso: Erro ao salvar mensagem do assistente:', dbError.message);
          }
        }
        
        return res.json({
          response,
          metadata: responseMetadata,
          sessionId: currentSessionId
        });
        
      } catch (nanoBananaError) {
        console.error('[NANO BANANA] ❌ Erro ao gerar imagem:', nanoBananaError);
        response = `Desculpe, não consegui gerar a imagem. Erro: ${nanoBananaError.message}`;
        responseMetadata = {
          toolUsed: 'nano_banana',
          action: 'generate_image',
          success: false,
          error: nanoBananaError.message
        };
      }
    }
    
    // Detectar se é uma conversa casual que não precisa de RAG
    const hasRAGDocs = Boolean(ragDocuments && ragDocuments.length > 0);
    const isCasual = isCasualConversation(message, hasRAGDocs);
    
    if (isCasual) {
      console.log('💬 Mensagem casual detectada - respondendo sem RAG');
      
      // Buscar histórico da conversa usando agent_messages
      let conversationHistory = [];
      let availableImages = []; // Imagens geradas no histórico
      
      if (db && agentId) {
        try {
          const historyMessages = await db.getAgentMessages(currentSessionId, 10);
          conversationHistory = historyMessages;
          
          // Extrair imagens do histórico
          availableImages = historyMessages
            .filter(msg => msg.metadata && msg.metadata.imageData)
            .map((msg, index) => ({
              index: index + 1,
              prompt: msg.metadata.prompt || msg.content,
              enrichedPrompt: msg.metadata.enrichedPrompt || msg.metadata.prompt || msg.content,
              tags: msg.metadata.tags || [],
              imageData: msg.metadata.imageData,
              mimeType: msg.metadata.imageFormat ? `image/${msg.metadata.imageFormat}` : 'image/png',
              messageId: msg.id
            }));
          
          console.log(`📜 Histórico carregado: ${conversationHistory.length} mensagens`);
          console.log(`🖼️ Imagens disponíveis no contexto: ${availableImages.length}`);
          if (availableImages.length > 0) {
            availableImages.forEach(img => {
              console.log(`   - Imagem ${img.index}: "${img.prompt.substring(0, 50)}..." [${img.tags.join(', ')}]`);
            });
          }
        } catch (historyError) {
          console.warn('Aviso: Erro ao carregar histórico:', historyError.message);
        }
      }
      
      // Usar prompt customizado se fornecido
      let systemPrompt = '';
      
      // PRIORIDADE 1: Instruções de ferramentas habilitadas (SEMPRE NO TOPO)
      const toolInstructions = getToolInstructions(hasEvolutionApi, evolutionInstance);
      if (toolInstructions) {
        systemPrompt = toolInstructions + '\n\n---\n\n';
      }
      
      // Informar sobre imagens disponíveis no contexto
      if (availableImages.length > 0) {
        systemPrompt += `\n## IMAGENS DISPONÍVEIS NO CONTEXTO:\n\n`;
        availableImages.forEach((img, idx) => {
          const tagsStr = img.tags.length > 0 ? ` [${img.tags.join(', ')}]` : '';
          systemPrompt += `${idx + 1}. "${img.prompt.substring(0, 60)}..."${tagsStr}\n`;
        });
        systemPrompt += `\nSe o usuário pedir para enviar uma dessas imagens via WhatsApp, use:\n`;
        systemPrompt += `WHATSAPP_MEDIA:{"recipient":"Nome","number":"TELEFONE","caption":"Legenda","imageBase64":"USE_IMAGE_N"}\n`;
        systemPrompt += `Substitua USE_IMAGE_N pelo número da imagem (ex: USE_IMAGE_1, USE_IMAGE_2).\n\n---\n\n`;
      }
      
      // PRIORIDADE 2: Prompt customizado ou padrão
      const basePrompt = customPrompt?.trim() 
        ? customPrompt 
        : `Você é um assistente de IA inteligente e prestativo. Responda de forma clara, precisa e útil.`;
      
      systemPrompt += basePrompt;
      
      // IMPORTANTE: Instruir o LLM a NÃO tentar gerar imagens manualmente
      systemPrompt += `\n\n**IMPORTANTE SOBRE GERAÇÃO DE IMAGENS:**
- NUNCA use comandos como NANO_BANANA, GENERATE_IMAGE, ou similares
- A geração de imagens é AUTOMÁTICA - apenas responda naturalmente ao usuário
- Se o usuário pedir para gerar uma imagem, apenas confirme que está gerando (ex: "Gerando a imagem...")
- O sistema detecta automaticamente pedidos de imagem e gera via Nano Banana
`;
      
      // Construir array de mensagens com histórico
      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
        { role: "user", content: message }
      ];
      
      try {
        response = await callLLM(provider, apiKey, messages, selectedModel, { temperature: 0.7, max_tokens: 500 });
        
        console.log('[TOOLS] Resposta do LLM:', response.substring(0, 200));
        
        // Detectar e executar comando WHATSAPP_SEND (com ou sem backticks)
        let whatsappCommandMatch = response.match(/```\s*WHATSAPP_SEND:\s*(\{[^}]+\})\s*```/);
        if (!whatsappCommandMatch) {
          whatsappCommandMatch = response.match(/WHATSAPP_SEND:\s*(\{[^}]+\})/);
        }
        
        if (whatsappCommandMatch && hasEvolutionApi && evolutionInstance) {
          try {
            const commandData = JSON.parse(whatsappCommandMatch[1]);
            const { recipient, number, message: messageText } = commandData;
            
            if (!number) {
              console.log('[TOOLS] ⚠️ Comando sem número de telefone, ignorando');
              // Deixar a resposta do LLM pedindo o número
            } else {
              // VALIDAÇÃO CRÍTICA: Verificar se o número parece ser de exemplo
              const dangerousNumbers = [
                '5567912345678',
                '5567991234567', 
                '556799123456',
                '11999999999',
                '5511999999999'
              ];
              
              if (dangerousNumbers.includes(number.replace(/\D/g, ''))) {
                console.log('[TOOLS] 🚨 NÚMERO DE EXEMPLO DETECTADO! Bloqueando envio:', number);
                response = `❌ ERRO CRÍTICO: Detectei que você tentou usar um número de exemplo (${number}). \n\n**NUNCA envie mensagens para números de exemplo!** \n\nPor favor, peça ao usuário o número de telefone real antes de enviar qualquer mensagem.`;
                responseMetadata = {
                  searchMethod: 'casual',
                  toolUsed: 'evolution_api',
                  error: 'Número de exemplo bloqueado por segurança'
                };
              } else {
                console.log(`[TOOLS] 📱 Comando WhatsApp detectado! Destinatário: ${recipient}, Número: ${number}`);
                console.log(`[TOOLS] 📱 Mensagem: ${messageText}`);
                
                // Enviar mensagem via Evolution API usando o NOME do dispositivo (não o ID)
                const result = await sendWhatsAppMessage(
                  evolutionInstance.name, // Usar name, não id
                  number,
                  messageText,
                  evolutionInstance.api_key // API key específica do dispositivo
                );
                
                console.log('[TOOLS] ✅ Mensagem WhatsApp enviada com sucesso!', result);
                
                // Substituir resposta pelo feedback de sucesso
                response = `Mensagem enviada com sucesso para ${recipient} (${number}) via WhatsApp!\n\n**Dispositivo:** ${evolutionInstance.name}\n**Mensagem:** "${messageText}"`;
                
                responseMetadata = {
                  searchMethod: 'casual',
                  toolUsed: 'evolution_api',
                  action: 'send_message',
                  recipient: recipient,
                  number: number,
                  deviceUsed: evolutionInstance.name,
                  sentMessage: messageText,
                  success: true
                };
              }
            }
          } catch (toolError) {
            console.error('[TOOLS] ❌ Erro ao executar comando WhatsApp:', toolError);
            response = `❌ Erro ao enviar mensagem via WhatsApp: ${toolError.message}`;
            responseMetadata = {
              searchMethod: 'casual',
              toolUsed: 'evolution_api',
              error: toolError.message
            };
          }
        }

        // Detectar e executar comando WHATSAPP_MEDIA (envio de imagem)
        let mediaCommandMatch = response.match(/```\s*WHATSAPP_MEDIA:\s*(\{[\s\S]+?\})\s*```/);
        if (!mediaCommandMatch) {
          mediaCommandMatch = response.match(/WHATSAPP_MEDIA:\s*(\{[\s\S]+?\})/);
        }
        
        if (mediaCommandMatch && hasEvolutionApi && evolutionInstance) {
          try {
            const commandData = JSON.parse(mediaCommandMatch[1]);
            let { recipient, number, caption, imageBase64 } = commandData;
            
            // Verificar se imageBase64 é uma referência (USE_IMAGE_N)
            if (imageBase64 && imageBase64.startsWith('USE_IMAGE_')) {
              const imageIndex = parseInt(imageBase64.replace('USE_IMAGE_', '')) - 1;
              if (availableImages[imageIndex]) {
                imageBase64 = availableImages[imageIndex].imageData;
                console.log(`[TOOLS] 📸 Usando imagem do contexto: "${availableImages[imageIndex].prompt.substring(0, 50)}..."`);
              } else {
                console.log('[TOOLS] ⚠️ Referência de imagem inválida:', imageBase64);
                imageBase64 = null;
              }
            }
            
            if (!number || !imageBase64) {
              console.log('[TOOLS] ⚠️ Comando WHATSAPP_MEDIA sem número ou imagem, ignorando');
            } else {
              // VALIDAÇÃO CRÍTICA: Verificar se o número parece ser de exemplo
              const dangerousNumbers = [
                '5567912345678',
                '5567991234567', 
                '556799123456',
                '11999999999',
                '5511999999999'
              ];
              
              if (dangerousNumbers.includes(number.replace(/\D/g, ''))) {
                console.log('[TOOLS] 🚨 NÚMERO DE EXEMPLO DETECTADO! Bloqueando envio de mídia:', number);
                response = `❌ ERRO CRÍTICO: Detectei que você tentou usar um número de exemplo (${number}). \n\n**NUNCA envie mensagens para números de exemplo!** \n\nPor favor, peça ao usuário o número de telefone real antes de enviar qualquer mídia.`;
                responseMetadata = {
                  searchMethod: 'casual',
                  toolUsed: 'evolution_api',
                  error: 'Número de exemplo bloqueado por segurança (mídia)'
                };
              } else {
                console.log(`[TOOLS] 📱🖼️ Comando WhatsApp MEDIA detectado! Destinatário: ${recipient}, Número: ${number}`);
                console.log(`[TOOLS] 📱🖼️ Legenda: ${caption}`);
                
                // Enviar imagem via Evolution API
                const result = await sendWhatsAppMedia(
                  evolutionInstance.name,
                  number,
                  imageBase64,
                  caption,
                  evolutionInstance.api_key
                );
                
                console.log('[TOOLS] ✅ Imagem WhatsApp enviada com sucesso!', result);
                
                // Substituir resposta pelo feedback de sucesso
                response = `🖼️ Imagem enviada com sucesso para ${recipient} (${number}) via WhatsApp!\n\n**Dispositivo:** ${evolutionInstance.name}\n**Legenda:** "${caption || 'Sem legenda'}"`;
                
                responseMetadata = {
                  searchMethod: 'casual',
                  toolUsed: 'evolution_api',
                  action: 'send_media',
                  recipient: recipient,
                  number: number,
                  deviceUsed: evolutionInstance.name,
                  sentCaption: caption,
                  success: true
                };
              }
            }
          } catch (toolError) {
            console.error('[TOOLS] ❌ Erro ao executar comando WhatsApp MEDIA:', toolError);
            response = `❌ Erro ao enviar imagem via WhatsApp: ${toolError.message}`;
            responseMetadata = {
              searchMethod: 'casual',
              toolUsed: 'evolution_api',
              error: toolError.message
            };
          }
        }
        
        // Se não usou nenhuma ferramenta, processar resposta normal
        if (!responseMetadata) {
          // Resposta normal sem ferramenta
          const inputTokens = estimateTokens(systemPrompt.length + message.length);
          const outputTokens = estimateTokens(response.length);
          const llmCost = calculateLLMCost(inputTokens, outputTokens, selectedModel);
          
          await incrementStats(req.user.id, 'total_llm_cost', llmCost);
          await incrementStats(req.user.id, 'requests_without_rag', 1);
          
          responseMetadata = {
            searchMethod: 'casual',
            tokensUsed: inputTokens + outputTokens,
            cost: llmCost,
            model: selectedModel,
            provider: provider
          };
        }
      } catch (error) {
        console.error('Erro ao processar mensagem casual:', error);
        response = 'Olá! Como posso ajudar você hoje?';
        responseMetadata = { searchMethod: 'casual' };
      }
    } else if (ragDocuments && ragDocuments.length > 0) {
      // Detectar se deve usar busca semântica (nova feature)
      const useSemanticSearch = process.env.ENABLE_SEMANTIC_SEARCH === 'true' || useSmartSearch;
      
      if (useSemanticSearch) {
        console.log('🔍 Usando BUSCA SEMÂNTICA com embeddings do Google');
        
        const searchStartTime = Date.now();
        
        // Buscar histórico para imagens disponíveis
        let availableImages = [];
        if (db && agentId) {
          try {
            const historyMessages = await db.getAgentMessages(currentSessionId, 10);
            availableImages = historyMessages
              .filter(msg => msg.metadata && msg.metadata.imageData)
              .map((msg, index) => ({
                index: index + 1,
                prompt: msg.metadata.prompt || msg.content,
                imageData: msg.metadata.imageData,
                mimeType: msg.metadata.imageFormat ? `image/${msg.metadata.imageFormat}` : 'image/png',
                messageId: msg.id
              }));
            console.log(`🖼️ Imagens disponíveis no contexto (RAG): ${availableImages.length}`);
          } catch (historyError) {
            console.warn('Aviso: Erro ao carregar histórico para imagens:', historyError.message);
          }
        }
        
        // Tentar busca semântica primeiro
        const semanticResult = await findSemanticChunks(message, ragDocuments, 5, req.user.id);
        
        if (semanticResult.chunks && semanticResult.chunks.length > 0) {
          console.log(`✅ Busca semântica encontrou ${semanticResult.chunks.length} chunks relevantes`);
          
          // Construir contexto com chunks semânticos
          const context = semanticResult.chunks.map((chunk, index) => `[${index + 1}] ${chunk}`).join('\n\n');

          // Usar prompt customizado se fornecido, senão usar o padrão
          const basePrompt = customPrompt || `Você é um assistente inteligente e prestativo.`;
          
          let systemPrompt = `${basePrompt}

**CONTEXTO RELEVANTE DO DOCUMENTO "${ragDocuments[0].title}":**
${context}

**INSTRUÇÕES:**
- Responda de forma DIRETA e CONCISA à pergunta do usuário
- Use APENAS as informações do contexto acima
- Se a resposta estiver no contexto, seja objetivo (ex: "O valor acordado foi R$ 25.000,00")
- NÃO invente perguntas ou informações extras não solicitadas
- Mantenha sua personalidade definida, mas seja breve e preciso`;

          // Injetar instruções de ferramentas
          systemPrompt += getToolInstructions(hasEvolutionApi, evolutionInstance);
          
          // Informar sobre imagens disponíveis
          if (availableImages.length > 0) {
            systemPrompt += `\n\n## IMAGENS DISPONÍVEIS NO CONTEXTO:\n\n`;
            availableImages.forEach((img, idx) => {
              systemPrompt += `${idx + 1}. "${img.prompt.substring(0, 80)}${img.prompt.length > 80 ? '...' : ''}"\n`;
            });
            systemPrompt += `\nPara enviar uma dessas imagens via WhatsApp, use:\n`;
            systemPrompt += `WHATSAPP_MEDIA:{"recipient":"Nome","number":"TELEFONE","caption":"Legenda","imageBase64":"USE_IMAGE_N"}\n`;
            systemPrompt += `Substitua USE_IMAGE_N pelo número da imagem (1, 2, 3, etc).\n`;
          }
          
          // IMPORTANTE: Instruir o LLM a NÃO tentar gerar imagens manualmente
          systemPrompt += `\n\n**IMPORTANTE SOBRE GERAÇÃO DE IMAGENS:**
- NUNCA use comandos como NANO_BANANA, GENERATE_IMAGE, ou similares
- A geração de imagens é AUTOMÁTICA - apenas responda naturalmente
- Se o usuário pedir uma imagem, confirme brevemente (ex: "Entendido, gerando...")
- O sistema detecta e gera automaticamente via Nano Banana
`;

          const llmStartTime = Date.now();
          
          console.log('📤 Prompt enviado ao LLM:', systemPrompt.substring(0, 300) + '...');
          console.log('📤 Pergunta do usuário:', message);
          
          try {
            response = await callLLM(provider, apiKey, [
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
            ], selectedModel, { temperature: 0.1, max_tokens: 500 });

            const llmTime = Date.now() - llmStartTime;
            const totalTime = Date.now() - searchStartTime;
            
            console.log('[TOOLS] Resposta do LLM (RAG):', response.substring(0, 200));
            
            // Detectar e executar comando WHATSAPP_SEND (com ou sem backticks)
            let whatsappCommandMatch = response.match(/```\s*WHATSAPP_SEND:\s*(\{[^}]+\})\s*```/);
            if (!whatsappCommandMatch) {
              whatsappCommandMatch = response.match(/WHATSAPP_SEND:\s*(\{[^}]+\})/);
            }
            
            if (whatsappCommandMatch && hasEvolutionApi && evolutionInstance) {
              try {
                const commandData = JSON.parse(whatsappCommandMatch[1]);
                const { recipient, number, message: messageText } = commandData;
                
                if (!number) {
                  console.log('[TOOLS] ⚠️ Comando sem número de telefone, ignorando');
                  // Deixar a resposta do LLM pedindo o número
                } else {
                  // VALIDAÇÃO CRÍTICA: Verificar se o número parece ser de exemplo
                  const dangerousNumbers = [
                    '5567912345678',
                    '5567991234567', 
                    '556799123456',
                    '11999999999',
                    '5511999999999'
                  ];
                  
                  if (dangerousNumbers.includes(number.replace(/\D/g, ''))) {
                    console.log('[TOOLS] 🚨 NÚMERO DE EXEMPLO DETECTADO! Bloqueando envio:', number);
                    response = `❌ ERRO CRÍTICO: Detectei que você tentou usar um número de exemplo (${number}). \n\n**NUNCA envie mensagens para números de exemplo!** \n\nPor favor, peça ao usuário o número de telefone real antes de enviar qualquer mensagem.`;
                    responseMetadata = {
                      searchMethod: 'semantic',
                      toolUsed: 'evolution_api',
                      error: 'Número de exemplo bloqueado por segurança'
                    };
                  } else {
                    console.log(`[TOOLS] 📱 Comando WhatsApp detectado! Destinatário: ${recipient}, Número: ${number}`);
                    
                    const result = await sendWhatsAppMessage(
                      evolutionInstance.name, // Usar name, não id
                      number,
                      messageText,
                      evolutionInstance.api_key // API key específica do dispositivo
                    );
                    
                    console.log('[TOOLS] ✅ Mensagem WhatsApp enviada!');
                    
                    response = `Mensagem enviada para ${recipient} (${number}) via WhatsApp!\n\n**Dispositivo:** ${evolutionInstance.name}\n**Mensagem:** "${messageText}"`;
                    
                    responseMetadata = {
                      searchMethod: 'semantic',
                      toolUsed: 'evolution_api',
                      action: 'send_message',
                      recipient: recipient,
                      number: number,
                      deviceUsed: evolutionInstance.name,
                      sentMessage: messageText,
                      success: true
                    };
                  }
                  
                  // Retornar imediatamente
                  if (db) {
                    try {
                      await db.createChatMessage({
                        id: 'msg_assistant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        userId: req.user.id,
                        sessionId: currentSessionId,
                        role: 'assistant',
                        content: response,
                        metadata: responseMetadata
                      });
                    } catch (dbError) {
                      console.warn('Aviso: Erro ao salvar mensagem:', dbError.message);
                    }
                  }
                  
                  return res.json({
                    response,
                    metadata: responseMetadata,
                    sessionId: currentSessionId
                  });
                }
                
              } catch (toolError) {
                console.error('[TOOLS] ❌ Erro ao executar comando WhatsApp:', toolError);
              }
            }

            // Detectar e executar comando WHATSAPP_MEDIA (envio de imagem)
            let mediaCommandMatch = response.match(/```\s*WHATSAPP_MEDIA:\s*(\{[\s\S]+?\})\s*```/);
            if (!mediaCommandMatch) {
              mediaCommandMatch = response.match(/WHATSAPP_MEDIA:\s*(\{[\s\S]+?\})/);
            }
            
            if (mediaCommandMatch && hasEvolutionApi && evolutionInstance) {
              try {
                const commandData = JSON.parse(mediaCommandMatch[1]);
                let { recipient, number, caption, imageBase64 } = commandData;
                
                // Verificar se imageBase64 é uma referência (USE_IMAGE_N)
                if (imageBase64 && imageBase64.startsWith('USE_IMAGE_')) {
                  const imageIndex = parseInt(imageBase64.replace('USE_IMAGE_', '')) - 1;
                  if (availableImages[imageIndex]) {
                    imageBase64 = availableImages[imageIndex].imageData;
                    console.log(`[TOOLS] 📸 Usando imagem do contexto: "${availableImages[imageIndex].prompt.substring(0, 50)}..."`);
                  } else {
                    console.log('[TOOLS] ⚠️ Referência de imagem inválida:', imageBase64);
                    imageBase64 = null;
                  }
                }
                
                if (!number || !imageBase64) {
                  console.log('[TOOLS] ⚠️ Comando WHATSAPP_MEDIA sem número ou imagem, ignorando');
                } else {
                  // VALIDAÇÃO CRÍTICA
                  const dangerousNumbers = [
                    '5567912345678',
                    '5567991234567', 
                    '556799123456',
                    '11999999999',
                    '5511999999999'
                  ];
                  
                  if (dangerousNumbers.includes(number.replace(/\D/g, ''))) {
                    console.log('[TOOLS] 🚨 NÚMERO DE EXEMPLO DETECTADO! Bloqueando envio de mídia:', number);
                    response = `❌ ERRO CRÍTICO: Número de exemplo detectado (${number}). Nunca envie mensagens para números de exemplo!`;
                    responseMetadata = {
                      searchMethod: 'semantic',
                      toolUsed: 'evolution_api',
                      error: 'Número de exemplo bloqueado (mídia)'
                    };
                  } else {
                    console.log(`[TOOLS] 📱🖼️ Comando WhatsApp MEDIA detectado! Destinatário: ${recipient}, Número: ${number}`);
                    
                    const result = await sendWhatsAppMedia(
                      evolutionInstance.name,
                      number,
                      imageBase64,
                      caption,
                      evolutionInstance.api_key
                    );
                    
                    console.log('[TOOLS] ✅ Imagem WhatsApp enviada!');
                    
                    response = `🖼️ Imagem enviada para ${recipient} (${number}) via WhatsApp!\n\n**Dispositivo:** ${evolutionInstance.name}\n**Legenda:** "${caption || 'Sem legenda'}"`;
                    
                    responseMetadata = {
                      searchMethod: 'semantic',
                      toolUsed: 'evolution_api',
                      action: 'send_media',
                      recipient: recipient,
                      number: number,
                      deviceUsed: evolutionInstance.name,
                      sentCaption: caption,
                      success: true
                    };
                  }
                  
                  // Salvar e retornar
                  if (db) {
                    try {
                      await db.createChatMessage({
                        id: 'msg_assistant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        userId: req.user.id,
                        sessionId: currentSessionId,
                        role: 'assistant',
                        content: response,
                        metadata: responseMetadata
                      });
                    } catch (dbError) {
                      console.warn('Aviso: Erro ao salvar mensagem:', dbError.message);
                    }
                  }
                  
                  return res.json({
                    response,
                    metadata: responseMetadata,
                    sessionId: currentSessionId
                  });
                }
                
              } catch (toolError) {
                console.error('[TOOLS] ❌ Erro ao executar comando WhatsApp MEDIA:', toolError);
              }
            }
            
            // Calcular custos
            const inputTokens = estimateTokens(systemPrompt.length + message.length);
            const outputTokens = estimateTokens(response.length);
            const llmCost = calculateLLMCost(inputTokens, outputTokens, selectedModel);
            
            // Incrementar estatísticas no banco
            await incrementStats(req.user.id, 'total_llm_cost', llmCost);
            await incrementStats(req.user.id, 'requests_with_semantic_search', 1);
            
            // Montar metadados da resposta
            responseMetadata = {
              searchMethod: 'semantic',
              chunksUsed: semanticResult.chunks.length,
              chunks: semanticResult.chunks, // Adicionar os chunks completos
              chunksSimilarity: semanticResult.metrics.chunksSimilarity, // Similaridades individuais
              similarityScore: semanticResult.metrics.similarityScore,
              processingTime: totalTime,
              tokensUsed: inputTokens + outputTokens,
              cost: usageStats.totalEmbeddingCost + llmCost,
              model: selectedModel,
              provider: provider
            };
            
            console.log(`💰 Custo da requisição: Embeddings $${usageStats.totalEmbeddingCost.toFixed(6)} + LLM $${llmCost.toFixed(6)} = $${responseMetadata.cost.toFixed(6)}`);
            
          } catch (llmError) {
            console.error('Erro na API do LLM:', llmError);
            response = `Com base no documento "${ragDocuments[0].title}", encontrei informações relevantes sobre "${message}". Gostaria que eu elabore?`;
            responseMetadata = {
              searchMethod: 'semantic',
              chunksUsed: semanticResult.chunks.length,
              chunks: semanticResult.chunks,
              chunksSimilarity: semanticResult.metrics.chunksSimilarity,
              similarityScore: semanticResult.metrics.similarityScore,
              processingTime: Date.now() - searchStartTime,
              model: selectedModel
            };
          }
        } else {
          // Fallback para busca tradicional se semântica falhar
          console.warn('⚠️ Busca semântica não retornou resultados, usando busca tradicional');
          const relevantChunks = findMostRelevantChunks(message, ragDocuments, 5);
          
          responseMetadata.searchMethod = 'keyword';
          responseMetadata.chunksUsed = relevantChunks.length;
          // Estatísticas incrementadas após resposta do LLM
          
          if (relevantChunks.length > 0) {
            const context = relevantChunks.map((chunk, index) => `[${index + 1}] ${chunk}`).join('\n\n');

            // Usar prompt customizado se fornecido, senão usar o padrão
            const basePrompt = customPrompt || `Você é um assistente inteligente e prestativo.`;
            
            const systemPrompt = `${basePrompt}

**CONTEXTO RELEVANTE DO DOCUMENTO "${ragDocuments[0].title}":**
${context}

**INSTRUÇÕES:**
- Responda de forma DIRETA e CONCISA à pergunta do usuário
- Use APENAS as informações do contexto acima
- NÃO invente perguntas ou informações extras não solicitadas
- Seja objetivo e preciso`;


            try {
              const completion = await groq.chat.completions.create({
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: message }
                ],
                model: selectedModel,
                temperature: 0.1,
                max_tokens: 500,
              });
              response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar.';
              
              const inputTokens = estimateTokens(systemPrompt.length + message.length);
              const outputTokens = estimateTokens(response.length);
              const llmCost = calculateLLMCost(inputTokens, outputTokens);
              
              // Incrementar estatísticas no banco
              await incrementStats(req.user.id, 'total_llm_cost', llmCost);
              await incrementStats(req.user.id, 'requests_with_keyword_search', 1);
              
              responseMetadata.tokensUsed = inputTokens + outputTokens;
              responseMetadata.cost = llmCost;
              responseMetadata.model = selectedModel;
              
            } catch (err) {
              response = `Encontrei informações sobre "${message}" no documento. Posso elaborar?`;
            }
          } else {
            response = `Não encontrei informações específicas sobre "${message}" no documento "${ragDocuments[0].title}".`;
          }
        }
      } else if (useSmartSearch) {
        // Nova busca inteligente - busca apenas nos chunks mais relevantes
        const relevantChunks = findMostRelevantChunks(message, ragDocuments, 5);
        
        if (relevantChunks.length > 0) {
          console.log(`Busca inteligente encontrou ${relevantChunks.length} chunks relevantes`);
          
          // Construir contexto compacto com chunks relevantes
          const context = relevantChunks.map((chunk, index) => `[${index + 1}] ${chunk}`).join('\n\n');

          // Usar prompt customizado se fornecido, senão usar o padrão
          const basePrompt = customPrompt || `Você é um assistente inteligente e prestativo.`;
          
          const systemPrompt = `${basePrompt}

**CONTEXTO RELEVANTE DO DOCUMENTO "${ragDocuments[0].title}":**
${context}

**INSTRUÇÕES:**
- Responda de forma DIRETA e CONCISA à pergunta do usuário
- Use APENAS as informações do contexto acima
- NÃO invente perguntas ou informações extras não solicitadas
- Seja objetivo e preciso`;

          console.log('=== PROMPT INTELIGENTE GERADO ===');
          console.log(systemPrompt.substring(0, 500) + '...');
          console.log('=== FIM DO PROMPT ===');

          try {
            const completion = await groq.chat.completions.create({
              messages: [
                {
                  role: "system",
                  content: systemPrompt
                },
                {
                  role: "user",
                  content: message
                }
              ],
              model: selectedModel,
              temperature: 0.1,
              max_tokens: 500,
            });

            response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.';
          } catch (groqError) {
            console.error('Erro na API do Groq:', groqError);
            response = `Com base no documento "${ragDocuments[0].title}", encontrei informações relevantes que podem ajudar com sua pergunta sobre "${message}". Gostaria que eu elabore sobre algum aspecto específico?`;
          }
        } else {
          response = `Não encontrei informações específicas sobre "${message}" no documento "${ragDocuments[0].title}". 

O documento contém ${ragDocuments[0].chunks?.length || 0} seções. Você pode:

1. Reformular sua pergunta com termos diferentes
2. Perguntar sobre tópicos gerais do documento
3. Pedir um resumo das principais informações disponíveis

Posso ajudar de outra forma?`;
        }
      } else {
        // Busca tradicional (fallback)
        const relevantChunks = findRelevantChunks(message, ragDocuments);
        
        if (relevantChunks.length > 0) {
          const context = relevantChunks
            .map(chunk => `[${chunk.source}]: ${chunk.content}`)
            .join('\n\n');
          
          // Usar prompt customizado se fornecido, senão usar o padrão
          const basePrompt = customPrompt || `Você é um assistente inteligente e prestativo.`;
          
          const systemPrompt = `${basePrompt}

**CONTEXTO RELEVANTE:**
${context}

**INSTRUÇÕES:**
- Responda de forma DIRETA e CONCISA à pergunta do usuário
- Use APENAS as informações do contexto acima
- NÃO invente perguntas ou informações extras não solicitadas
- Seja objetivo e preciso`;

          try {
            const completion = await groq.chat.completions.create({
              messages: [
                {
                  role: "system",
                  content: systemPrompt
                },
                {
                  role: "user",
                  content: message
                }
              ],
              model: selectedModel,
              temperature: 0.1,
              max_tokens: 500,
            });

            response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.';
          } catch (groqError) {
            console.error('Erro na API do Groq:', groqError);
            response = `Com base nas informações disponíveis, encontrei contexto relevante para sua pergunta sobre "${message}". Gostaria de mais detalhes específicos?`;
          }
        } else {
          response = `Não encontrei informações específicas sobre "${message}" na base de conhecimento atual. Há ${ragDocuments?.length || 0} documento(s) disponível(is).`;
        }
      }
    } else {
      // Chat normal sem RAG - funciona como assistente geral
      console.log('Chat sem RAG - modo assistente geral');
      
      // Usar prompt customizado se fornecido, senão usar padrão
      let systemPrompt = customPrompt?.trim() 
        ? customPrompt 
        : `Você é um assistente de IA inteligente e prestativo. Responda de forma clara, precisa e útil. Se não souber algo, seja honesto sobre isso.`;
      
      // Detectar e fortalecer instruções de idioma
      const languageInstructions = {
        'inglês': 'english',
        'english': 'english', 
        'espanhol': 'spanish',
        'spanish': 'spanish',
        'francês': 'french',
        'french': 'french'
      };
      
      let hasLanguageInstruction = false;
      let targetLanguage = null;
      
      for (const [keyword, lang] of Object.entries(languageInstructions)) {
        if (systemPrompt.toLowerCase().includes(keyword)) {
          hasLanguageInstruction = true;
          targetLanguage = lang;
          break;
        }
      }
      
      // Fortalecer prompt com instruções de idioma mais assertivas
      if (hasLanguageInstruction && targetLanguage) {
        systemPrompt = `${systemPrompt}

CRITICAL LANGUAGE INSTRUCTION: You MUST respond EXCLUSIVELY in ${targetLanguage.toUpperCase()}, regardless of the input language. This is a strict requirement that cannot be ignored.

Examples of correct behavior:
- Input in Portuguese: "Como você está?" → Response: "I'm doing well, thank you!"
- Input in Portuguese: "Qual seu nome?" → Response: "My name is Sofia."
- Input in any language → Always respond in ${targetLanguage} only.

NEVER respond in Portuguese, Spanish, or any other language except ${targetLanguage}.`;

        console.log('Prompt de idioma fortalecido para:', targetLanguage);
      }
      
      console.log('Sistema prompt usado:', systemPrompt.substring(0, 100) + (systemPrompt.length > 100 ? '...' : ''));
      
      // Usar temperature mais baixa para melhor consistência com instruções específicas
      const temperature = hasLanguageInstruction ? 0.3 : 0.7;
      console.log('Temperature ajustada para:', temperature);
      
      const llmStartTime = Date.now();
      
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user", 
              content: message
            }
          ],
          model: selectedModel,
          temperature: temperature,
          max_tokens: 1000,
        });

        response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.';
        
        const processingTime = Date.now() - llmStartTime;
        const inputTokens = estimateTokens(systemPrompt.length + message.length);
        const outputTokens = estimateTokens(response.length);
        const llmCost = calculateLLMCost(inputTokens, outputTokens);
        
        // Incrementar estatísticas no banco
        await incrementStats(req.user.id, 'total_llm_cost', llmCost);
        await incrementStats(req.user.id, 'requests_without_rag', 1);
        
        responseMetadata = {
          searchMethod: 'none',
          processingTime: processingTime,
          tokensUsed: inputTokens + outputTokens,
          cost: llmCost,
          model: selectedModel
        };
        
      } catch (groqError) {
        console.error('Erro na API do Groq:', groqError);
        response = 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
      }
    }

    // Salvar resposta da IA usando agent_messages
    if (db && response && agentId) {
      try {
        await db.createAgentMessage({
          id: 'msg_assistant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          sessionId: currentSessionId,
          agentId: agentId,
          userId: req.user.id,
          role: 'assistant',
          content: response,
          ragDocumentIds: ragDocuments?.map(d => d.id) || null,
          metadata: {
            ...responseMetadata,
            model: selectedModel,
            provider: provider,
            hasRAG: Boolean(ragDocuments?.length),
            useSmartSearch: Boolean(useSmartSearch),
            hasCustomPrompt: Boolean(customPrompt),
            responseLength: response.length
          }
        });
      } catch (dbError) {
        console.warn('Aviso: Erro ao salvar resposta da IA:', dbError.message);
      }
    }
    
    res.json({ 
      response,
      sessionId: currentSessionId,
      metadata: responseMetadata
    });
  } catch (error) {
    console.error('Erro no endpoint de chat:', error);
    res.status(500).json({ 
      error: 'Erro ao processar mensagem',
      details: error.message 
    });
  }
});

// Endpoint público para webhooks/n8n (SEM autenticação)
// Recebe APENAS a mensagem e busca automaticamente todos os documentos RAG do usuário
// Suporta clientId para manter contexto entre mensagens
// Suporta dados do contato WhatsApp: pushName, profilePicUrl, phoneNumber
app.post('/api/webhook/chat', async (req, res) => {
  try {
    const { message, userId, clientId, pushName, profilePicUrl, phoneNumber, contactName } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Gerar ou usar clientId fornecido
    const conversationClientId = clientId || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Nome do contato: usar pushName, contactName, ou extrair do número
    const finalContactName = pushName || contactName || (phoneNumber ? `+${phoneNumber.replace(/\D/g, '')}` : null);

    // ID de usuário - se não especificado, busca o usuário admin ou primeiro disponível
    let trackingUserId = userId;
    
    if (!trackingUserId) {
      try {
        // Buscar usuário admin ou primeiro usuário
        const adminUser = await db.get(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
        if (adminUser) {
          trackingUserId = adminUser.id;
        } else {
          // Se não tiver admin, pega o primeiro usuário
          const firstUser = await db.get(`SELECT id FROM users LIMIT 1`);
          trackingUserId = firstUser ? firstUser.id : 1;
        }
      } catch (err) {
        console.warn('⚠️ Erro ao buscar usuário padrão:', err.message);
        trackingUserId = 1;
      }
    }

    // Buscar ou criar conversa
    let conversation = await db.get(
      `SELECT * FROM webhook_conversations WHERE client_id = ?`,
      [conversationClientId]
    );

    if (!conversation) {
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.run(
        `INSERT INTO webhook_conversations (id, client_id, user_id, contact_name, contact_picture, phone_number, created_at, updated_at, last_message_at, message_count)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), 0)`,
        [conversationId, conversationClientId, trackingUserId, finalContactName, profilePicUrl, phoneNumber]
      );
      conversation = { id: conversationId, client_id: conversationClientId, message_count: 0 };
    } else {
      // Atualizar dados do contato se recebemos novos
      if (finalContactName || profilePicUrl || phoneNumber) {
        const updates = [];
        const params = [];

        if (finalContactName && !conversation.contact_name) {
          updates.push('contact_name = ?');
          params.push(finalContactName);
        }
        if (profilePicUrl && profilePicUrl !== conversation.contact_picture) {
          updates.push('contact_picture = ?');
          params.push(profilePicUrl);
        }
        if (phoneNumber && !conversation.phone_number) {
          updates.push('phone_number = ?');
          params.push(phoneNumber);
        }

        if (updates.length > 0) {
          params.push(conversation.id);
          await db.run(
            `UPDATE webhook_conversations SET ${updates.join(', ')} WHERE id = ?`,
            params
          );
        }
      }
    }

    // Buscar histórico de mensagens da conversa (últimas 10 mensagens para contexto)
    const conversationHistory = await db.all(
      `SELECT role, content FROM webhook_messages 
       WHERE conversation_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [conversation.id]
    );
    
    // Inverter para ordem cronológica
    conversationHistory.reverse();

    // Usar API key padrão do sistema (Groq)
    const apiKey = process.env.GROQ_API_KEY;
    const selectedModel = 'llama-3.1-8b-instant';

    console.log('📨 Webhook recebido:', message);
    console.log('👤 User ID:', trackingUserId);
    console.log('🔗 Client ID:', conversationClientId);
    console.log('💬 Histórico:', conversationHistory.length, 'mensagens');

    // 🔥 BUSCAR AUTOMATICAMENTE TODOS OS DOCUMENTOS RAG DO USUÁRIO
    let ragDocuments = [];
    try {
      const dbDocuments = await db.getRAGDocuments(trackingUserId);
      
      // Converter formato do banco para formato esperado pela IA
      ragDocuments = dbDocuments.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        chunks: doc.chunks, // Já vem parseado do db.cjs
        source: doc.source,
        fileType: doc.file_type
      }));
      
      console.log(`📚 Documentos RAG encontrados: ${ragDocuments.length}`);
      if (ragDocuments.length > 0) {
        ragDocuments.forEach(doc => {
          console.log(`   - ${doc.title} (${doc.chunks.length} chunks)`);
        });
      }
    } catch (dbError) {
      console.warn('⚠️ Erro ao buscar documentos RAG:', dbError.message);
      // Continua sem documentos
    }

    // Busca semântica sempre ativada quando houver documentos
    const useSmartSearch = ragDocuments.length > 0;

    let response;
    let responseMetadata = {};

    // Detectar se é uma conversa casual que não precisa de RAG
    const hasRAGDocs = Boolean(ragDocuments && ragDocuments.length > 0);
    const isCasual = isCasualConversation(message, hasRAGDocs);

    if (isCasual) {
      console.log('💬 Mensagem casual detectada - respondendo sem RAG');
      
      const systemPrompt = `Você é Sofia, uma assistente de IA inteligente e prestativa. Responda de forma clara, precisa e útil.`;
      
      try {
        const groqInstance = new Groq({ apiKey });
        
        // Construir mensagens com histórico
        const messages = [
          { role: "system", content: systemPrompt },
          ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
          { role: "user", content: message }
        ];
        
        const completion = await groqInstance.chat.completions.create({
          messages,
          model: selectedModel,
          temperature: 0.7,
          max_tokens: 500,
        });
        
        response = completion.choices[0]?.message?.content || 'Olá! Como posso ajudar?';
        
        const inputTokens = estimateTokens(systemPrompt.length + message.length);
        const outputTokens = estimateTokens(response.length);
        const llmCost = calculateLLMCost(inputTokens, outputTokens);
        
        await incrementStats(trackingUserId, 'total_llm_cost', llmCost);
        await incrementStats(trackingUserId, 'requests_without_rag', 1);
        
        responseMetadata = {
          searchMethod: 'casual',
          tokensUsed: inputTokens + outputTokens,
          cost: llmCost,
          model: selectedModel,
          documentsAvailable: ragDocuments.length,
          conversationMessages: conversationHistory.length
        };
      } catch (error) {
        console.error('Erro ao processar mensagem casual:', error);
        response = 'Olá! Como posso ajudar você hoje?';
        responseMetadata = { searchMethod: 'casual' };
      }
    } else if (ragDocuments && ragDocuments.length > 0) {
      // 🔥 USAR BUSCA SEMÂNTICA AUTOMATICAMENTE quando houver documentos
      const useSemanticSearch = process.env.ENABLE_SEMANTIC_SEARCH === 'true' || useSmartSearch;
      
      if (useSemanticSearch) {
        console.log('🔍 Usando BUSCA SEMÂNTICA com embeddings do Google');
        
        const searchStartTime = Date.now();
        
        // Busca semântica
        const semanticResult = await findSemanticChunks(message, ragDocuments, 5, trackingUserId);
        
        if (semanticResult.chunks && semanticResult.chunks.length > 0) {
          console.log(`✅ Busca semântica encontrou ${semanticResult.chunks.length} chunks relevantes`);
          
          const context = semanticResult.chunks.map((chunk, index) => `[${index + 1}] ${chunk}`).join('\n\n');

          const basePrompt = `Você é Sofia, uma assistente inteligente e prestativa.`;
          
          const systemPrompt = `${basePrompt}

**CONTEXTO RELEVANTE DO DOCUMENTO "${ragDocuments[0].title}":**
${context}

**INSTRUÇÕES:**
- Responda de forma DIRETA e CONCISA à pergunta do usuário
- Use APENAS as informações do contexto acima
- Se a resposta estiver no contexto, seja objetivo (ex: "O valor acordado foi R$ 25.000,00")
- NÃO invente perguntas ou informações extras não solicitadas
- Mantenha sua personalidade definida, mas seja breve e preciso`;

          const llmStartTime = Date.now();
          
          try {
            const groqInstance = new Groq({ apiKey });
            
            // 🔥 Construir mensagens COM HISTÓRICO
            const messages = [
              { role: "system", content: systemPrompt },
              ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
              { role: "user", content: message }
            ];
            
            const completion = await groqInstance.chat.completions.create({
              messages,
              model: selectedModel,
              temperature: 0.1,
              max_tokens: 500,
            });

            response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.';
            
            const llmTime = Date.now() - llmStartTime;
            const totalTime = Date.now() - searchStartTime;
            
            const inputTokens = estimateTokens(systemPrompt.length + message.length);
            const outputTokens = estimateTokens(response.length);
            const llmCost = calculateLLMCost(inputTokens, outputTokens);
            
            await incrementStats(trackingUserId, 'total_llm_cost', llmCost);
            await incrementStats(trackingUserId, 'requests_with_semantic_search', 1);
            
            responseMetadata = {
              searchMethod: 'semantic',
              chunksUsed: semanticResult.chunks.length,
              chunks: semanticResult.chunks,
              chunksSimilarity: semanticResult.metrics.chunksSimilarity,
              similarityScore: semanticResult.metrics.similarityScore,
              processingTime: totalTime,
              tokensUsed: inputTokens + outputTokens,
              cost: usageStats.totalEmbeddingCost + llmCost,
              model: selectedModel
            };
            
            console.log(`💰 Custo: Embeddings $${usageStats.totalEmbeddingCost.toFixed(6)} + LLM $${llmCost.toFixed(6)} = $${responseMetadata.cost.toFixed(6)}`);
            
          } catch (groqError) {
            console.error('Erro na API do Groq:', groqError);
            response = `Com base no documento "${ragDocuments[0].title}", encontrei informações relevantes sobre "${message}". Gostaria que eu elabore?`;
            responseMetadata = {
              searchMethod: 'semantic',
              chunksUsed: semanticResult.chunks.length,
              chunks: semanticResult.chunks,
              chunksSimilarity: semanticResult.metrics.chunksSimilarity,
              similarityScore: semanticResult.metrics.similarityScore,
              processingTime: Date.now() - searchStartTime,
              model: selectedModel
            };
          }
        } else {
          // Fallback para busca tradicional
          console.warn('⚠️ Busca semântica não retornou resultados, usando busca tradicional');
          const relevantChunks = findMostRelevantChunks(message, ragDocuments, 5);
          
          if (relevantChunks.length > 0) {
            const context = relevantChunks.map((chunk, index) => `[${index + 1}] ${chunk}`).join('\n\n');
            const basePrompt = `Você é Sofia, uma assistente inteligente e prestativa.`;
            
            const systemPrompt = `${basePrompt}

**CONTEXTO RELEVANTE DO DOCUMENTO "${ragDocuments[0].title}":**
${context}

**INSTRUÇÕES:**
- Responda de forma DIRETA e CONCISA à pergunta do usuário
- Use APENAS as informações do contexto acima
- NÃO invente perguntas ou informações extras não solicitadas
- Seja objetivo e preciso`;

            try {
              const groqInstance = new Groq({ apiKey });
              
              // 🔥 Construir mensagens COM HISTÓRICO
              const messages = [
                { role: "system", content: systemPrompt },
                ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
                { role: "user", content: message }
              ];
              
              const completion = await groqInstance.chat.completions.create({
                messages,
                model: selectedModel,
                temperature: 0.1,
                max_tokens: 500,
              });
              
              response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar.';
              
              const inputTokens = estimateTokens(systemPrompt.length + message.length);
              const outputTokens = estimateTokens(response.length);
              const llmCost = calculateLLMCost(inputTokens, outputTokens);
              
              await incrementStats(trackingUserId, 'total_llm_cost', llmCost);
              await incrementStats(trackingUserId, 'requests_with_keyword_search', 1);
              
              responseMetadata = {
                searchMethod: 'keyword',
                chunksUsed: relevantChunks.length,
                tokensUsed: inputTokens + outputTokens,
                cost: llmCost,
                model: selectedModel
              };
              
            } catch (err) {
              response = `Encontrei informações sobre "${message}" no documento. Posso elaborar?`;
            }
          } else {
            response = `Não encontrei informações específicas sobre "${message}" no documento "${ragDocuments[0].title}".`;
          }
        }
      } else {
        // Busca tradicional sem semântica
        const relevantChunks = findMostRelevantChunks(message, ragDocuments, 5);
        
        if (relevantChunks.length > 0) {
          const context = relevantChunks.map((chunk, index) => `[${index + 1}] ${chunk}`).join('\n\n');
          const basePrompt = `Você é Sofia, uma assistente inteligente e prestativa.`;
          
          const systemPrompt = `${basePrompt}

**CONTEXTO RELEVANTE DO DOCUMENTO "${ragDocuments[0].title}":**
${context}

**INSTRUÇÕES:**
- Responda de forma DIRETA e CONCISA à pergunta do usuário
- Use APENAS as informações do contexto acima
- NÃO invente perguntas ou informações extras não solicitadas
- Seja objetivo e preciso`;

          try {
            const groqInstance = new Groq({ apiKey });
            
            // 🔥 Construir mensagens COM HISTÓRICO
            const messages = [
              { role: "system", content: systemPrompt },
              ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
              { role: "user", content: message }
            ];
            
            const completion = await groqInstance.chat.completions.create({
              messages,
              model: selectedModel,
              temperature: 0.1,
              max_tokens: 500,
            });

            response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar.';
            
            const inputTokens = estimateTokens(systemPrompt.length + message.length);
            const outputTokens = estimateTokens(response.length);
            const llmCost = calculateLLMCost(inputTokens, outputTokens);
            
            await incrementStats(trackingUserId, 'total_llm_cost', llmCost);
            await incrementStats(trackingUserId, 'requests_with_keyword_search', 1);
            
            responseMetadata = {
              searchMethod: 'keyword',
              chunksUsed: relevantChunks.length,
              tokensUsed: inputTokens + outputTokens,
              cost: llmCost,
              model: selectedModel
            };
          } catch (err) {
            response = `Encontrei informações sobre "${message}" no documento. Posso elaborar?`;
          }
        } else {
          response = `Não encontrei informações específicas sobre "${message}" no documento "${ragDocuments[0].title}".`;
        }
      }
    } else {
      // Chat sem RAG - não há documentos disponíveis
      const systemPrompt = `Você é Sofia, uma assistente de IA inteligente e prestativa. Responda de forma clara, precisa e útil.`;
      
      try {
        const groqInstance = new Groq({ apiKey });
        
        // Construir mensagens com histórico
        const messages = [
          { role: "system", content: systemPrompt },
          ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
          { role: "user", content: message }
        ];
        
        const completion = await groqInstance.chat.completions.create({
          messages,
          model: selectedModel,
          temperature: 0.7,
          max_tokens: 1000,
        });

        response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar.';
        
        const inputTokens = estimateTokens(systemPrompt.length + message.length);
        const outputTokens = estimateTokens(response.length);
        const llmCost = calculateLLMCost(inputTokens, outputTokens);
        
        await incrementStats(trackingUserId, 'total_llm_cost', llmCost);
        await incrementStats(trackingUserId, 'requests_without_rag', 1);
        
        responseMetadata = {
          searchMethod: 'none',
          tokensUsed: inputTokens + outputTokens,
          cost: llmCost,
          model: selectedModel,
          documentsAvailable: 0,
          conversationMessages: conversationHistory.length
        };
      } catch (error) {
        console.error('Erro ao processar chat sem RAG:', error);
        response = 'Desculpe, ocorreu um erro ao processar sua mensagem.';
      }
    }

    console.log('✅ Resposta gerada:', response.substring(0, 100) + '...');

    // Salvar mensagens no histórico
    try {
      const userMsgId = `msg_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.run(
        `INSERT INTO webhook_messages (id, conversation_id, client_id, role, content, created_at, metadata)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`,
        [userMsgId, conversation.id, conversationClientId, 'user', message, null]
      );

      const assistantMsgId = `msg_asst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.run(
        `INSERT INTO webhook_messages (id, conversation_id, client_id, role, content, created_at, metadata)
         VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`,
        [assistantMsgId, conversation.id, conversationClientId, 'assistant', response, JSON.stringify(responseMetadata)]
      );

      // Atualizar contador de mensagens e última atividade
      await db.run(
        `UPDATE webhook_conversations 
         SET message_count = message_count + 2, 
             last_message_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ?`,
        [conversation.id]
      );
    } catch (saveError) {
      console.warn('⚠️ Erro ao salvar mensagens:', saveError.message);
    }

    res.json({
      success: true,
      response,
      clientId: conversationClientId,
      model: selectedModel,
      metadata: responseMetadata
    });

  } catch (error) {
    console.error('❌ Erro geral no webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// === ENDPOINTS DE HISTÓRICO DE CONVERSAS WEBHOOK ===

// Listar todas as conversas do webhook
app.get('/api/webhook/conversations', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.query

    let query = `SELECT
        c.id,
        c.client_id,
        c.user_id,
        c.contact_name,
        c.contact_picture,
        c.phone_number,
        c.created_at,
        c.updated_at,
        c.last_message_at,
        c.message_count,
        u.username,
        (SELECT content FROM webhook_messages WHERE conversation_id = c.id AND role = 'user' ORDER BY created_at DESC LIMIT 1) as last_user_message,
        (SELECT content FROM webhook_messages WHERE conversation_id = c.id AND role = 'assistant' ORDER BY created_at DESC LIMIT 1) as last_assistant_message
       FROM webhook_conversations c
       LEFT JOIN users u ON c.user_id = u.id`
    
    const params = []
    
    // Filtrar por agentId se fornecido
    if (agentId) {
      query += ` WHERE EXISTS (
        SELECT 1 FROM webhook_messages wm 
        WHERE wm.conversation_id = c.id 
        AND (
          json_extract(wm.metadata, '$.agentId') = ? 
          OR json_extract(wm.metadata, '$.agentId') IS NULL
        )
      )`
      params.push(agentId)
    }
    
    query += ` ORDER BY c.last_message_at DESC`
    
    const conversations = await db.all(query, params);
    
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar mensagens de uma conversa específica
app.get('/api/webhook/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const messages = await db.all(
      `SELECT * FROM webhook_messages 
       WHERE conversation_id = ? 
       ORDER BY created_at ASC`,
      [conversationId]
    );
    
    // Parse metadata JSON
    const parsedMessages = messages.map(msg => ({
      ...msg,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null
    }));
    
    res.json({ success: true, messages: parsedMessages });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar conversa
app.delete('/api/webhook/conversations/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Deletar mensagens (CASCADE deve fazer isso automaticamente, mas vamos garantir)
    await db.run(`DELETE FROM webhook_messages WHERE conversation_id = ?`, [conversationId]);
    await db.run(`DELETE FROM webhook_conversations WHERE id = ?`, [conversationId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar conversa:', error);
    res.status(500).json({ error: error.message });
  }
});

// === ENDPOINT DE ESTATÍSTICAS DE USO ===

// Função para inicializar estatísticas do usuário
async function initializeUserStats(userId) {
  try {
    if (!db) return;
    
    const existingStats = await db.get('SELECT * FROM usage_stats WHERE user_id = ?', [userId]);

    if (!existingStats) {
      const statsId = `stats_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.run(
        'INSERT INTO usage_stats (id, user_id) VALUES (?, ?)',
        [statsId, userId]
      );
    }
  } catch (error) {
    console.error('Erro ao inicializar estatísticas:', error.message);
  }
}

// Função para incrementar estatísticas
// Função para incrementar estatísticas
async function incrementStats(userId, field, value = 1) {
  try {
    if (!db) {
      console.warn('⚠️ Banco de dados não inicializado, estatísticas não serão salvas');
      return;
    }
    
    await initializeUserStats(userId);
    
    await db.run(
      `UPDATE usage_stats SET ${field} = ${field} + ? WHERE user_id = ?`,
      [value, userId]
    );
  } catch (error) {
    console.error(`Erro ao incrementar ${field}:`, error.message);
    // Não propagar o erro para não travar o fluxo principal
  }
}

app.get('/api/usage-stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    await initializeUserStats(userId);

    const stats = await db.get('SELECT * FROM usage_stats WHERE user_id = ?', [userId]);

    const totalRequests = stats.requests_with_semantic_search + stats.requests_with_keyword_search + stats.requests_without_rag;
    const totalCost = stats.total_embedding_cost + stats.total_llm_cost;
    
    // Buscar custos separados por modelo das mensagens de agente
    const modelCosts = await db.all(`
      SELECT metadata FROM agent_messages 
      WHERE user_id = ? AND metadata IS NOT NULL
    `, [userId]);
    
    let geminiCost = 0;
    let nanoBananaCost = 0;
    let groqCost = 0;
    let imagesGenerated = 0;
    
    modelCosts.forEach(row => {
      try {
        const metadata = JSON.parse(row.metadata);
        
        // Detectar Nano Banana por toolUsed ou model
        if (metadata.toolUsed === 'nano_banana' || metadata.model?.includes('image')) {
          if (metadata.cost) {
            nanoBananaCost += metadata.cost;
          }
          if (metadata.imageData || metadata.action === 'generate_image') {
            imagesGenerated++;
          }
        } else if (metadata.cost) {
          if (metadata.model?.includes('gemini')) {
            geminiCost += metadata.cost;
          } else if (metadata.model?.includes('llama') || metadata.model?.includes('groq')) {
            groqCost += metadata.cost;
          }
        }
      } catch (e) {
        // Ignora metadados inválidos
      }
    });

    res.json({
      success: true,
      stats: {
        embeddingsGenerated: stats.embeddings_generated,
        totalEmbeddingCost: stats.total_embedding_cost,
        totalLLMCost: stats.total_llm_cost,
        totalCost: totalCost,
        geminiCost: geminiCost,
        nanoBananaCost: nanoBananaCost,
        groqCost: groqCost,
        imagesGenerated: imagesGenerated,
        requestsWithSemanticSearch: stats.requests_with_semantic_search,
        requestsWithKeywordSearch: stats.requests_with_keyword_search,
        requestsWithoutRAG: stats.requests_without_rag,
        totalRequests: totalRequests,
        cacheSize: embeddingsCache.size,
        lastResetAt: stats.last_reset_at
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar estatísticas' });
  }
});

// Endpoint para resetar estatísticas
app.post('/api/usage-stats/reset', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await db.run(
      `UPDATE usage_stats 
       SET embeddings_generated = 0,
           total_embedding_cost = 0,
           total_llm_cost = 0,
           requests_with_semantic_search = 0,
           requests_with_keyword_search = 0,
           requests_without_rag = 0,
           last_reset_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [userId]
    );

    res.json({ success: true, message: 'Estatísticas resetadas com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar estatísticas:', error);
    res.status(500).json({ success: false, error: 'Erro ao resetar estatísticas' });
  }
});

// Detectar se a mensagem é uma conversa casual que não precisa de RAG
function isCasualConversation(message, hasRAGDocuments = false) {
  const normalizedMsg = message.trim().toLowerCase();
  
  // Saudações básicas - SEMPRE casual
  const greetings = [
    /^(oi|olá|ola|hey|hi|hello|e aí|eai|opa|fala)$/i,
    /^(bom dia|boa tarde|boa noite)[\!\.]?$/i,
    /^(tudo bem|como vai|td bem|blz|suave)[\?\!]?$/i,
    /^(obrigad[oa]|valeu|thanks|thank you)[\!\.]?$/i,
    /^(tchau|até|bye|adeus|flw)[\!\.]?$/i,
  ];
  
  // Perguntas pessoais/conversacionais - SEMPRE casual (histórico resolve)
  const personalQuestions = [
    /^(como|qual|você|vc|tu|me|meu|minha|lembra|sabe)/i,
    /(meu nome|me chamo|meu)/i,
  ];
  
  // Palavras-chave que DEFINITIVAMENTE precisam de RAG
  const ragKeywords = [
    /\b(quanto|valor|preço|custo|total|soma)\b/i,
    /\b(contrato|documento|arquivo|planilha|pdf)\b/i,
    /\b(quando|data|prazo|vencimento|vigência)\b/i,
    /\b(onde|endereço|local|localização)\b/i,
    /\b(qual|quais|quantos|quantas)\s+(a|o|os|as|são|é)\b/i,
    /\b(informação|detalhes|dados|consta|menciona|diz)\b/i,
    /\b(lista|listar|mostrar|exibir|apresentar)\b/i,
    /\b(parcela|pagamento|divida|dívida|débito)\b/i
  ];
  
  // 1. Saudações básicas - SEMPRE casual
  if (greetings.some(pattern => pattern.test(normalizedMsg))) {
    return true;
  }
  
  // 2. Pergunta pessoal/conversacional SEM documentos RAG - casual
  if (!hasRAGDocuments && personalQuestions.some(pattern => pattern.test(normalizedMsg))) {
    return true;
  }
  
  // 3. Pergunta com keywords de RAG E tem documentos - NÃO é casual
  if (hasRAGDocuments && ragKeywords.some(pattern => pattern.test(normalizedMsg))) {
    return false;
  }
  
  // 4. Padrão: se não tem RAG ou é pergunta curta/simples, é casual
  return !hasRAGDocuments || normalizedMsg.length < 20;
}

// Nova função para busca mais inteligente e compacta
function findMostRelevantChunks(query, ragDocuments, maxChunks = 5) {
  if (!ragDocuments || ragDocuments.length === 0) {
    return [];
  }

  const queryWords = query.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2);

  const scoredChunks = [];

  ragDocuments.forEach(doc => {
    if (doc.chunks && Array.isArray(doc.chunks)) {
      doc.chunks.forEach((chunk, chunkIndex) => {
        const chunkText = chunk.toLowerCase();
        let score = 0;
        
        // Score baseado na frequência de palavras-chave
        queryWords.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          const matches = chunkText.match(regex);
          if (matches) {
            score += matches.length * 2; // Peso maior para correspondências exatas
          }
          
          // Busca parcial
          if (chunkText.includes(word)) {
            score += 1;
          }
        });
        
        // Bonus para chunks que contêm múltiplas palavras-chave
        const uniqueMatches = queryWords.filter(word => {
          return new RegExp(`\\b${word}\\b`, 'i').test(chunkText);
        });
        score += uniqueMatches.length * 3;
        
        // Bonus para chunks no início do documento (mais context)
        if (chunkIndex < 3) {
          score += 1;
        }
        
        if (score > 0) {
          scoredChunks.push({
            text: chunk,
            score: score,
            docTitle: doc.title,
            chunkIndex: chunkIndex
          });
        }
      });
    }
  });

  // Ordenar por score e retornar os melhores
  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map(item => item.text);
}

// Endpoint de teste simples
app.get('/api/test', (req, res) => {
  console.log('Endpoint /api/test foi chamado');
  res.send('Servidor funcionando!');
});

// Endpoint de health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      transcription: 'active',
      chat: 'active',
      rag: 'active',
      database: db ? 'active' : 'inactive'
    }
  });
});

// ========================================
// ENDPOINTS DE PERSISTÊNCIA
// ========================================

// Endpoint para salvar transcrição
app.post('/api/transcriptions', authMiddleware, async (req, res) => {
  try {
    const transcriptionData = req.body;
    
    // Gerar ID se não fornecido
    if (!transcriptionData.id) {
      transcriptionData.id = 'trans_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Adicionar ID do usuário
    transcriptionData.userId = req.user.id;

    console.log('💾 Salvando transcrição:', transcriptionData.title, 'para usuário:', req.user.username);
    
    await db.createTranscription(transcriptionData);
    
    res.json({ 
      success: true, 
      id: transcriptionData.id,
      message: 'Transcrição salva com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao salvar transcrição:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para listar transcrições
app.get('/api/transcriptions', authMiddleware, async (req, res) => {
  try {
    console.log('📋 Buscando transcrições para usuário:', req.user.username);
    
    const transcriptions = await db.getTranscriptions(req.user.id);
    
    res.json({ 
      success: true, 
      data: transcriptions,
      count: transcriptions.length 
    });
  } catch (error) {
    console.error('Erro ao buscar transcrições:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para buscar transcrição específica
app.get('/api/transcriptions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Buscando transcrição:', id, 'para usuário:', req.user.username);
    
    const transcription = await db.getTranscriptionById(id, req.user.id);
    
    if (!transcription) {
      console.log('❌ Transcrição não encontrada:', id);
      return res.status(404).json({ error: 'Transcrição não encontrada' });
    }
    
    console.log('✅ Transcrição encontrada:', {
      id: transcription.id,
      title: transcription.title,
      contentLength: transcription.content ? transcription.content.length : 0,
      hasContent: !!transcription.content
    });
    
    res.json({ 
      success: true, 
      data: transcription 
    });
  } catch (error) {
    console.error('Erro ao buscar transcrição:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para salvar documento RAG
app.post('/api/rag-documents', authMiddleware, async (req, res) => {
  try {
    const ragData = req.body;
    
    // Gerar ID se não fornecido
    if (!ragData.id) {
      ragData.id = 'rag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    console.log('🧠 Salvando documento RAG:', ragData.title);
    
    await db.createRAGDocument(ragData);
    
    res.json({ 
      success: true, 
      id: ragData.id,
      message: 'Documento RAG salvo com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao salvar documento RAG:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para listar documentos RAG
app.get('/api/rag-documents', authMiddleware, async (req, res) => {
  try {
    console.log('📚 Buscando documentos RAG salvos...');
    
    const ragDocuments = await db.getRAGDocuments();
    
    res.json({ 
      success: true, 
      data: ragDocuments,
      count: ragDocuments.length 
    });
  } catch (error) {
    console.error('Erro ao buscar documentos RAG:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para buscar documento RAG específico
app.get('/api/rag-documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Buscando documento RAG:', id);
    
    const ragDocument = await db.getRAGDocumentById(id);
    
    if (!ragDocument) {
      return res.status(404).json({ error: 'Documento RAG não encontrado' });
    }
    
    res.json({ 
      success: true, 
      data: ragDocument 
    });
  } catch (error) {
    console.error('Erro ao buscar documento RAG:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para deletar transcrição
app.delete('/api/transcriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deletando transcrição:', id);
    
    const result = await db.deleteTranscription(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Transcrição não encontrada' });
    }
    
    res.json({ 
      success: true, 
      message: 'Transcrição deletada com sucesso',
      deleted: result.changes
    });
  } catch (error) {
    console.error('Erro ao deletar transcrição:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para deletar documento RAG
app.delete('/api/rag-documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deletando documento RAG:', id);
    
    const result = await db.deleteRAGDocument(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Documento RAG não encontrado' });
    }
    
    res.json({ 
      success: true, 
      message: 'Documento RAG deletado com sucesso',
      deleted: result.changes
    });
  } catch (error) {
    console.error('Erro ao deletar documento RAG:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para salvar prompt (com autenticação)
app.post('/api/prompts', authMiddleware, async (req, res) => {
  try {
    const promptData = req.body;
    
    // Gerar ID se não fornecido
    if (!promptData.id) {
      promptData.id = 'prompt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Adicionar user_id do usuário autenticado
    promptData.userId = req.user.id;

    console.log('💬 Salvando prompt para usuário:', req.user.username, '- Título:', promptData.title);
    
    await db.createSavedPrompt(promptData);
    
    res.json({ 
      success: true, 
      id: promptData.id,
      message: 'Prompt salvo com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao salvar prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para listar prompts salvos (com autenticação)
app.get('/api/prompts', authMiddleware, async (req, res) => {
  try {
    console.log('📝 Buscando prompts salvos para usuário:', req.user.username);
    
    const prompts = await db.getSavedPromptsByUser(req.user.id);
    
    res.json({ 
      success: true, 
      data: prompts,
      count: prompts.length 
    });
  } catch (error) {
    console.error('Erro ao buscar prompts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para salvar mensagem do chat
app.post('/api/chat-history', async (req, res) => {
  try {
    const chatData = req.body;
    
    // Gerar ID se não fornecido
    if (!chatData.id) {
      chatData.id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    console.log('💬 Salvando mensagem do chat:', chatData.role);
    
    await db.createChatMessage(chatData);
    
    res.json({ 
      success: true, 
      id: chatData.id,
      message: 'Mensagem salva com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao salvar mensagem do chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para buscar histórico do chat
app.get('/api/chat-history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    console.log('💬 Buscando histórico do chat:', sessionId);
    
    const chatHistory = await db.getChatHistory(sessionId, limit);
    
    res.json({ 
      success: true, 
      data: chatHistory,
      count: chatHistory.length 
    });
  } catch (error) {
    console.error('Erro ao buscar histórico do chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para otimização de prompt
app.post('/api/optimize-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt é obrigatório' });
    }

    console.log(`🔧 Otimizando prompt: ${prompt.length} caracteres`);

    // Prompt avançado para otimização usando técnicas modernas de prompt engineering
    const optimizationPrompt = `Você é um especialista em engenharia de prompt avançada. Sua tarefa é transformar o prompt fornecido em uma versão otimizada usando as melhores práticas de prompt engineering para LLMs.

<original_prompt>
${prompt}
</original_prompt>

# TÉCNICAS DE OTIMIZAÇÃO A APLICAR:

## 1. ESTRUTURAÇÃO XML/MARKDOWN
- Use tags XML para delimitar seções importantes
- Aplique markdown para hierarquia e formatação
- Estruture o prompt em blocos lógicos

## 2. TÉCNICAS AVANÇADAS
- **Chain of Thought**: Inclua instruções para raciocínio passo-a-passo
- **Few-Shot Learning**: Adicione exemplos quando apropriado
- **Role Assignment**: Defina um papel específico para a IA
- **Output Formatting**: Especifique formato de resposta detalhado
- **Constraint Definition**: Estabeleça limitações claras
- **Context Injection**: Adicione contexto relevante

## 3. ELEMENTOS ESTRUTURAIS
\`\`\`xml
<role>Define o papel da IA</role>
<context>Contexto específico da tarefa</context>
<task>Descrição clara da tarefa</task>
<constraints>Limitações e restrições</constraints>
<format>Formato esperado da resposta</format>
<examples>Exemplos quando necessário</examples>
\`\`\`

## 4. MELHORIAS ESPECÍFICAS
- Remover ambiguidades
- Adicionar especificidade
- Incluir critérios de qualidade
- Definir métricas de sucesso
- Estabelecer tom e estilo

# INSTRUÇÕES DE SAÍDA:

**IMPORTANTE**: Responda APENAS com o prompt otimizado. Não inclua explicações, comentários ou metadados.

**REQUISITOS**:
- Mantenha a intenção original
- Use estruturação XML/Markdown
- Aplique técnicas de prompt engineering
- Torne mais específico e claro
- Mantenha em português
- Crie um prompt profissional e estruturado

**PROMPT OTIMIZADO**:`;

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: optimizationPrompt
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 1000
    });

    const optimizedPrompt = response.choices[0]?.message?.content?.trim();
    
    if (!optimizedPrompt) {
      throw new Error('Falha na otimização do prompt');
    }

    console.log(`✅ Prompt otimizado: ${optimizedPrompt.length} caracteres`);
    
    res.json({ 
      success: true,
      originalPrompt: prompt,
      optimizedPrompt: optimizedPrompt,
      improvement: {
        originalLength: prompt.length,
        optimizedLength: optimizedPrompt.length,
        lengthChange: optimizedPrompt.length - prompt.length
      }
    });

  } catch (error) {
    console.error('❌ Erro na otimização do prompt:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Falha ao otimizar prompt'
    });
  }
});

// Endpoint para limpeza de dados antigos
app.post('/api/cleanup', async (req, res) => {
  try {
    console.log('🧹 Iniciando limpeza de dados antigos...');
    
    const result = await db.cleanupOldData();
    
    res.json({ 
      success: true, 
      message: `Limpeza concluída: ${result.changes} registros removidos`,
      cleaned: result.changes
    });
  } catch (error) {
    console.error('Erro na limpeza de dados:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// WhatsApp Devices Management
// ==========================================

// Listar dispositivos do usuário
app.get('/api/whatsapp-devices', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const rows = await db.all(
      'SELECT * FROM whatsapp_devices WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    res.json(rows || []);
  } catch (error) {
    console.error('Erro ao listar dispositivos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar grupos WhatsApp de um dispositivo
app.get('/api/whatsapp-devices/:deviceId/groups', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Buscar dispositivo
    const device = await db.get(
      'SELECT * FROM whatsapp_devices WHERE id = ? AND user_id = ?',
      [deviceId, userId]
    );

    if (!device) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }

    // Buscar URL e API key da Evolution API
    const evolutionConfig = await getEvolutionConfig();
    if (!evolutionConfig || !evolutionConfig.baseUrl) {
      return res.status(400).json({ error: 'Evolution API não configurada' });
    }

    const apiKey = device.api_key || evolutionConfig.apiKey;
    const url = `${evolutionConfig.baseUrl}/group/fetchAllGroups/${deviceId}?getParticipants=false`;

    console.log(`[WHATSAPP] Buscando grupos do dispositivo ${deviceId}...`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WHATSAPP] Erro ao buscar grupos: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ error: `Erro da Evolution API: ${response.status}` });
    }

    const groups = await response.json();

    // Formatar resposta
    const formattedGroups = (groups || []).map(g => ({
      id: g.id,
      name: g.subject || g.name || 'Sem nome',
      description: g.desc || '',
      owner: g.owner,
      creation: g.creation,
      participants_count: g.size || 0
    }));

    console.log(`[WHATSAPP] ${formattedGroups.length} grupos encontrados`);
    res.json(formattedGroups);

  } catch (error) {
    console.error('Erro ao listar grupos WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

// Salvar/Atualizar dispositivo
app.post('/api/whatsapp-devices', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, name, owner_jid, profile_name, profile_pic_url, connection_status, api_key } = req.body;
    
    console.log('💾 POST /api/whatsapp-devices - Dados recebidos:', { id, name, owner_jid, profile_name, connection_status, api_key: api_key ? '***' : 'não fornecida', userId });
    
    if (!id || !name) {
      console.error('❌ Erro: ID e nome são obrigatórios');
      return res.status(400).json({ error: 'ID e nome são obrigatórios' });
    }
    
    if (!db) {
      console.error('❌ Erro: Banco de dados não inicializado');
      return res.status(500).json({ error: 'Banco de dados não disponível' });
    }
    
    console.log('🔄 Executando db.run...');
    
    try {
      // Usar os métodos da classe Database que retornam Promises
      await db.run(
        `INSERT INTO whatsapp_devices (id, user_id, name, owner_jid, profile_name, profile_pic_url, connection_status, api_key, connected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
          owner_jid = excluded.owner_jid,
          profile_name = excluded.profile_name,
          profile_pic_url = excluded.profile_pic_url,
          connection_status = excluded.connection_status,
          api_key = COALESCE(excluded.api_key, api_key),
          connected_at = excluded.connected_at,
          updated_at = CURRENT_TIMESTAMP`,
        [id, userId, name, owner_jid, profile_name, profile_pic_url, connection_status || 'disconnected', api_key || null, connection_status === 'open' ? new Date().toISOString() : null]
      );
      
      console.log('✅ Dispositivo salvo/atualizado - ID:', id);
      
      const row = await db.get('SELECT * FROM whatsapp_devices WHERE id = ?', [id]);
      console.log('✅ Dispositivo retornado:', row);
      
      res.json(row);
    } catch (dbError) {
      console.error('❌ Erro ao salvar dispositivo:', dbError);
      res.status(500).json({ error: dbError.message });
    }
  } catch (error) {
    console.error('❌ Erro ao salvar dispositivo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar dispositivo
app.delete('/api/whatsapp-devices/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await db.run(
      'DELETE FROM whatsapp_devices WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    console.error('Erro ao deletar dispositivo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar estado do agente de IA
app.patch('/api/whatsapp-devices/:id/ai-agent', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { aiAgentEnabled } = req.body;
    
    const result = await db.run(
      'UPDATE whatsapp_devices SET ai_agent_enabled = ? WHERE id = ? AND user_id = ?',
      [aiAgentEnabled ? 1 : 0, id, userId]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }
    
    res.json({ success: true, aiAgentEnabled });
  } catch (error) {
    console.error('Erro ao atualizar agente de IA:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar modo de transcrição
app.patch('/api/whatsapp-devices/:id/transcription', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { transcriptionEnabled } = req.body;
    
    const result = await db.run(
      'UPDATE whatsapp_devices SET transcription_enabled = ? WHERE id = ? AND user_id = ?',
      [transcriptionEnabled ? 1 : 0, id, userId]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dispositivo não encontrado' });
    }
    
    res.json({ success: true, transcriptionEnabled });
  } catch (error) {
    console.error('Erro ao atualizar modo de transcrição:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// WAHA (WhatsApp HTTP API) - DESATIVADO
// ==========================================
// Endpoints WAHA removidos - integração movida para n8n
// Se precisar reativar no futuro, procure por "WAHA" neste arquivo

/*
const WAHA_CONFIG = {
  baseUrl: 'https://waha.idx.ia.br',
  apiKey: '261d1d2b6b104e458002957a6495ddc3'
};

async function wahaProxy(path, method = 'GET', body = null) {
  // ... código comentado ...
}

// Todos os endpoints /api/waha/* foram comentados
// A criação de dispositivos agora é feita via webhook n8n
*/

// ==========================================
// SISTEMA MULTI-AGENTES
// ==========================================

// === CRUD para Agentes IA ===

// Criar novo agente
app.post('/api/agents', authMiddleware, async (req, res) => {
  try {
    const { name, description, systemPrompt, system_prompt, model, temperature, maxTokens, avatarEmoji, color } = req.body;
    
    // Aceitar tanto systemPrompt quanto system_prompt
    const finalSystemPrompt = systemPrompt || system_prompt || ''; // Permitir vazio
    
    console.log('📝 Criando agente:', { name, hasPrompt: !!finalSystemPrompt, body: req.body });
    
    if (!name) {
      console.log('❌ Validação falhou: nome obrigatório');
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const agentId = 'agent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    await db.createAgent({
      id: agentId,
      userId: req.user.id,
      name,
      description,
      systemPrompt: finalSystemPrompt,
      model: model || 'llama-3.1-8b-instant',
      temperature: temperature !== undefined ? temperature : 0.7,
      maxTokens: maxTokens || 1000,
      isActive: true,
      isDefault: false,
      avatarEmoji: avatarEmoji || '🤖',
      color: color || '#3b82f6'
    });

    console.log(`✅ Agente criado: ${name} (${agentId})`);
    
    res.json({ 
      success: true, 
      data: { id: agentId, name },
      message: 'Agente criado com sucesso' 
    });
  } catch (error) {
    console.error('❌ Erro ao criar agente:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar agentes do usuário
app.get('/api/agents', authMiddleware, async (req, res) => {
  try {
    const agents = await db.getAgents(req.user.id);
    
    console.log(`📋 ${agents.length} agentes encontrados para ${req.user.username}`);
    
    res.json({ 
      success: true, 
      data: agents,
      count: agents.length 
    });
  } catch (error) {
    console.error('❌ Erro ao listar agentes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar agente específico
app.get('/api/agents/:agentId', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = await db.getAgentById(agentId, req.user.id);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }
    
    res.json({ 
      success: true, 
      data: agent 
    });
  } catch (error) {
    console.error('❌ Erro ao buscar agente:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar agente
app.put('/api/agents/:agentId', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const updates = req.body;
    
    console.log('[UPDATE AGENT] Dados recebidos:', updates);
    
    const result = await db.updateAgent(agentId, req.user.id, updates);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }
    
    console.log(`✅ Agente atualizado: ${agentId}`, updates);
    
    res.json({ 
      success: true, 
      message: 'Agente atualizado com sucesso' 
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar agente:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar agente
app.delete('/api/agents/:agentId', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const result = await db.deleteAgent(agentId, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }
    
    console.log(`🗑️ Agente deletado: ${agentId}`);
    
    res.json({ 
      success: true, 
      message: 'Agente deletado com sucesso' 
    });
  } catch (error) {
    console.error('❌ Erro ao deletar agente:', error);
    res.status(500).json({ error: error.message });
  }
});

// Definir agente padrão
app.post('/api/agents/:agentId/set-default', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    
    await db.setDefaultAgent(agentId, req.user.id);
    
    console.log(`⭐ Agente padrão definido: ${agentId}`);
    
    res.json({ 
      success: true, 
      message: 'Agente padrão definido com sucesso' 
    });
  } catch (error) {
    console.error('❌ Erro ao definir agente padrão:', error);
    res.status(500).json({ error: error.message });
  }
});

// === Chat com Agente Específico ===

// Endpoint de chat multi-agente
app.post('/api/agents/:agentId/chat', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { message, sessionId, ragDocumentIds } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Buscar dados do agente
    const agent = await db.getAgentById(agentId, req.user.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }

    console.log(`💬 Chat com agente: ${agent.name}`);

    // Criar ou recuperar sessão
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      await db.createAgentSession({
        id: currentSessionId,
        agentId: agentId,
        userId: req.user.id,
        sessionName: null,
        isActive: true
      });
    }

    // Buscar histórico da conversa (últimas 10 mensagens para contexto)
    const history = await db.getAgentMessages(currentSessionId, 10);
    
    // Buscar API key do usuário
    let apiKey = await AuthService.getUserApiKey(req.user.id, 'groq');
    if (!apiKey) {
      apiKey = process.env.GROQ_API_KEY;
    }

    // Buscar RAGs acessíveis pelo agente
    let ragDocuments = [];
    if (ragDocumentIds && ragDocumentIds.length > 0) {
      // RAGs específicos solicitados
      ragDocuments = await db.all(
        `SELECT * FROM rag_documents WHERE id IN (${ragDocumentIds.map(() => '?').join(',')}) AND user_id = ?`,
        [...ragDocumentIds, req.user.id]
      );
    } else {
      // Buscar RAGs com acesso concedido ao agente
      const accessibleRags = await db.getAgentRagAccess(agentId);
      if (accessibleRags.length > 0) {
        ragDocuments = accessibleRags.map(r => ({
          id: r.rag_document_id,
          title: r.title,
          content: r.content,
          chunks: r.chunks
        }));
      }
    }

    // Construir mensagens para LLM
    const messages = [
      { role: "system", content: agent.system_prompt }
    ];

    // Adicionar histórico
    history.forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });

    // Se houver RAGs, fazer busca semântica
    let ragContext = '';
    let usedRagIds = [];
    if (ragDocuments.length > 0) {
      console.log(`🔍 Buscando em ${ragDocuments.length} RAGs`);
      
      const semanticResult = await findSemanticChunks(message, ragDocuments, 5, req.user.id);
      
      if (semanticResult.chunks && semanticResult.chunks.length > 0) {
        ragContext = `\n\n**CONTEXTO DOS DOCUMENTOS:**\n${semanticResult.chunks.map((chunk, i) => `[${i + 1}] ${chunk}`).join('\n\n')}`;
        usedRagIds = ragDocumentIds || ragDocuments.map(d => d.id);
      }
    }

    // Adicionar mensagem do usuário
    messages.push({ 
      role: "user", 
      content: message + ragContext 
    });

    // Chamar LLM
    const groqInstance = new Groq({ apiKey });
    const startTime = Date.now();
    
    const completion = await groqInstance.chat.completions.create({
      messages,
      model: agent.model,
      temperature: agent.temperature,
      max_tokens: agent.max_tokens,
    });

    const response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar.';
    const responseTime = (Date.now() - startTime) / 1000;

    // Salvar mensagens
    const userMsgId = 'msg_user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    await db.createAgentMessage({
      id: userMsgId,
      sessionId: currentSessionId,
      agentId: agentId,
      userId: req.user.id,
      role: 'user',
      content: message,
      ragDocumentIds: usedRagIds.length > 0 ? usedRagIds : null,
      metadata: { timestamp: new Date().toISOString() }
    });

    const assistantMsgId = 'msg_assistant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    await db.createAgentMessage({
      id: assistantMsgId,
      sessionId: currentSessionId,
      agentId: agentId,
      userId: req.user.id,
      role: 'assistant',
      content: response,
      ragDocumentIds: usedRagIds.length > 0 ? usedRagIds : null,
      metadata: {
        responseTime,
        model: agent.model,
        temperature: agent.temperature,
        timestamp: new Date().toISOString()
      }
    });

    // Atualizar estatísticas
    const inputTokens = estimateTokens(messages.map(m => m.content).join(' ').length);
    const outputTokens = estimateTokens(response.length);
    const cost = calculateLLMCost(inputTokens, outputTokens);

    await db.updateAgentStatistics(agentId, req.user.id, {
      messages: 1,
      tokens: inputTokens + outputTokens,
      cost: cost,
      responseTime: responseTime,
      ragQueries: usedRagIds.length > 0 ? 1 : 0,
      semanticSearches: usedRagIds.length > 0 ? 1 : 0
    });

    res.json({
      success: true,
      response,
      sessionId: currentSessionId,
      metadata: {
        agent: agent.name,
        responseTime,
        tokensUsed: inputTokens + outputTokens,
        cost,
        ragsUsed: usedRagIds.length
      }
    });

  } catch (error) {
    console.error('❌ Erro no chat com agente:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar histórico de conversa com agente
app.get('/api/agents/:agentId/messages', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { sessionId, limit } = req.query;

    let messages;
    if (sessionId) {
      messages = await db.getAgentMessages(sessionId, parseInt(limit) || 50);
    } else {
      messages = await db.getAgentConversationHistory(agentId, req.user.id, parseInt(limit) || 100);
    }

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar mensagens:', error);
    res.status(500).json({ error: error.message });
  }
});

// Limpar mensagens do chat de um agente
app.delete('/api/agents/:agentId/messages', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { sessionId } = req.query;

    const result = await db.deleteAgentMessages(agentId, req.user.id, sessionId || null);

    console.log(`🗑️ Mensagens deletadas: ${result.deleted} (agente: ${agentId}, usuário: ${req.user.id})`);

    res.json({
      success: true,
      message: `${result.deleted} mensagens deletadas`,
      deleted: result.deleted
    });
  } catch (error) {
    console.error('❌ Erro ao deletar mensagens:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar sessões de um agente
app.get('/api/agents/:agentId/sessions', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const sessions = await db.getAgentSessions(agentId, req.user.id);
    
    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar sessões:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gerenciar acesso do agente aos RAGs
app.post('/api/agents/:agentId/rag-access', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { ragDocumentId, priority } = req.body;
    
    await db.grantAgentRagAccess(agentId, ragDocumentId, priority || 1);
    
    console.log(`✅ Acesso concedido: agente ${agentId} → RAG ${ragDocumentId}`);
    
    res.json({
      success: true,
      message: 'Acesso concedido com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao conceder acesso:', error);
    res.status(500).json({ error: error.message });
  }
});

// Revogar acesso do agente a um RAG
app.delete('/api/agents/:agentId/rag-access/:ragDocumentId', authMiddleware, async (req, res) => {
  try {
    const { agentId, ragDocumentId } = req.params;
    
    await db.revokeAgentRagAccess(agentId, ragDocumentId);
    
    console.log(`🚫 Acesso revogado: agente ${agentId} ✗ RAG ${ragDocumentId}`);
    
    res.json({
      success: true,
      message: 'Acesso revogado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao revogar acesso:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar RAGs acessíveis por um agente
app.get('/api/agents/:agentId/rag-access', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const rags = await db.getAgentRagAccess(agentId);
    
    res.json({
      success: true,
      data: rags,
      count: rags.length
    });
  } catch (error) {
    console.error('❌ Erro ao listar RAGs acessíveis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Estatísticas de um agente
app.get('/api/agents/:agentId/statistics', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const days = parseInt(req.query.days) || 30;
    
    const stats = await db.getAgentStatistics(agentId, days);
    
    res.json({
      success: true,
      data: stats,
      count: stats.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// FERRAMENTAS PARA AGENTES (TOOLS)
// ==========================================

// Listar ferramentas disponíveis
app.get('/api/tools', authMiddleware, async (req, res) => {
  try {
    const tools = await db.getAvailableTools();
    console.log('[API] Ferramentas disponíveis:', tools);
    res.json({ success: true, data: tools });
  } catch (error) {
    console.error('[ERROR] Erro ao listar ferramentas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar ferramentas do agente
app.get('/api/agents/:agentId/tools', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const tools = await db.getAgentTools(agentId);
    console.log(`[API] Ferramentas do agente ${agentId}:`, tools);
    res.json({ success: true, data: tools });
  } catch (error) {
    console.error('[ERROR] Erro ao listar ferramentas do agente:', error);
    res.status(500).json({ error: error.message });
  }
});

// Habilitar ferramenta para agente
app.post('/api/agents/:agentId/tools/:toolId/enable', authMiddleware, async (req, res) => {
  try {
    const { agentId, toolId } = req.params;
    const { config } = req.body;
    
    await db.enableAgentTool(agentId, toolId, config);
    console.log(`✅ Ferramenta ${toolId} habilitada para agente ${agentId}`);
    
    res.json({ success: true, message: 'Ferramenta habilitada' });
  } catch (error) {
    console.error('❌ Erro ao habilitar ferramenta:', error);
    res.status(500).json({ error: error.message });
  }
});

// Desabilitar ferramenta do agente
app.post('/api/agents/:agentId/tools/:toolId/disable', authMiddleware, async (req, res) => {
  try {
    const { agentId, toolId } = req.params;
    
    await db.disableAgentTool(agentId, toolId);
    console.log(`❌ Ferramenta ${toolId} desabilitada para agente ${agentId}`);
    
    res.json({ success: true, message: 'Ferramenta desabilitada' });
  } catch (error) {
    console.error('❌ Erro ao desabilitar ferramenta:', error);
    res.status(500).json({ error: error.message });
  }
});

// === Evolution API Instances ===

// Criar instância Evolution via API direta (evita CORS)
app.post('/api/evolution-instances/create', authMiddleware, async (req, res) => {
  try {
    const { instanceName } = req.body;

    if (!instanceName) {
      return res.status(400).json({ error: 'instanceName é obrigatório' });
    }

    // Normalizar nome da instância
    const normalizedName = instanceName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    console.log(`📱 Criando instância Evolution: ${normalizedName}`);

    // Buscar configuração dinâmica do banco de dados
    const evolutionConfig = await getEvolutionConfig();
    console.log(`📱 Usando Evolution API: ${evolutionConfig.baseUrl}`);

    // Criar instância na Evolution API
    const evolutionUrl = `${evolutionConfig.baseUrl}/instance/create`;

    const evolutionResponse = await fetch(evolutionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionConfig.apiKey
      },
      body: JSON.stringify({
        instanceName: normalizedName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    });

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text();
      console.error('❌ Erro Evolution API:', errorText);
      throw new Error(`Erro ao criar instância: ${evolutionResponse.status}`);
    }

    const evolutionData = await evolutionResponse.json();
    console.log('✅ Instância criada na Evolution:', evolutionData);

    // Extrair QR Code
    const qrCode = evolutionData.qrcode?.base64 || evolutionData.base64 || null;

    res.json({
      success: true,
      instanceName: normalizedName,
      qrcode: qrCode ? { base64: qrCode } : null,
      base64: qrCode,
      data: evolutionData
    });

  } catch (error) {
    console.error('❌ Erro ao criar instância Evolution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar instância Evolution (método legado)
app.post('/api/evolution-instances', authMiddleware, async (req, res) => {
  try {
    const { name, apiKey } = req.body;

    if (!name || !apiKey) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, apiKey' });
    }

    // Usar o name como instance_id (normalizado)
    const instanceId = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    await db.run(
      `INSERT INTO whatsapp_devices (id, user_id, name, api_key, connection_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [instanceId, req.user.id, name, apiKey]
    );

    console.log(`✅ Dispositivo WhatsApp criado: ${name} (${instanceId})`);

    res.json({
      success: true,
      data: { id: instanceId, name },
      message: 'Dispositivo WhatsApp criado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao criar dispositivo WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar status de conexão de uma instância na Evolution API
app.get('/api/evolution-instances/:name/status', authMiddleware, async (req, res) => {
  try {
    const { name } = req.params;

    console.log(`🔍 Verificando status da instância: ${name}`);

    // Buscar configuração dinâmica do banco de dados
    const evolutionConfig = await getEvolutionConfig();

    // Consultar Evolution API para obter status
    const evolutionUrl = `${evolutionConfig.baseUrl}/instance/connectionState/${name}`;

    const evolutionResponse = await fetch(evolutionUrl, {
      method: 'GET',
      headers: {
        'apikey': evolutionConfig.apiKey
      }
    });

    if (!evolutionResponse.ok) {
      // Se a instância não existe ou há erro
      if (evolutionResponse.status === 404) {
        return res.json({
          success: true,
          data: {
            instanceName: name,
            connectionStatus: 'not_found',
            state: 'close'
          }
        });
      }
      throw new Error(`Evolution API error: ${evolutionResponse.status}`);
    }

    const connectionState = await evolutionResponse.json();
    console.log(`📱 Estado de conexão ${name}:`, connectionState);

    // Buscar informações adicionais da instância
    let instanceInfo = null;
    let profilePicUrlFromApi = null;

    try {
      const infoUrl = `${evolutionConfig.baseUrl}/instance/fetchInstances?instanceName=${name}`;
      const infoResponse = await fetch(infoUrl, {
        headers: { 'apikey': evolutionConfig.apiKey }
      });

      if (infoResponse.ok) {
        const instances = await infoResponse.json();
        instanceInfo = Array.isArray(instances) ? instances[0] : instances;
        console.log(`📷 Info da instância ${name}:`, JSON.stringify(instanceInfo, null, 2));
      }
    } catch (e) {
      console.warn('Aviso: não foi possível buscar info adicional da instância:', e.message);
    }

    // Evolution API v2 retorna dados diretamente no objeto, não em instance
    // Ex: instanceInfo.ownerJid, instanceInfo.profileName, instanceInfo.profilePicUrl
    const ownerJid = instanceInfo?.ownerJid || instanceInfo?.instance?.owner || connectionState.instance?.ownerJid;
    const profileName = instanceInfo?.profileName || instanceInfo?.instance?.profileName || name;

    // Se conectado, buscar foto de perfil usando endpoint específico
    if (connectionState.instance?.state === 'open') {
      try {
        if (ownerJid) {
          // Tentar buscar foto de perfil do próprio número
          const profilePicUrl = `${evolutionConfig.baseUrl}/chat/fetchProfilePictureUrl/${name}`;
          const profilePicResponse = await fetch(profilePicUrl, {
            method: 'POST',
            headers: {
              'apikey': evolutionConfig.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ number: ownerJid.replace('@s.whatsapp.net', '') })
          });

          if (profilePicResponse.ok) {
            const profilePicData = await profilePicResponse.json();
            console.log(`📸 Foto de perfil ${name}:`, profilePicData);
            profilePicUrlFromApi = profilePicData.profilePictureUrl || profilePicData.url || profilePicData.picture;
          }
        }
      } catch (e) {
        console.warn('Aviso: não foi possível buscar foto de perfil:', e.message);
      }
    }

    // Usar foto de perfil do endpoint específico ou fallback para a do fetchInstances
    // Evolution v2: instanceInfo.profilePicUrl, v1: instanceInfo.instance.profilePicUrl
    const finalProfilePicUrl = profilePicUrlFromApi || instanceInfo?.profilePicUrl || instanceInfo?.instance?.profilePicUrl;

    // Se conectado (state === 'open'), atualizar banco de dados local
    if (connectionState.instance?.state === 'open' && instanceInfo) {
      // Atualizar dispositivo no banco
      await db.run(
        `UPDATE whatsapp_devices
         SET connection_status = 'open',
             owner_jid = ?,
             profile_name = ?,
             profile_pic_url = ?,
             connected_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE name = ? AND user_id = ?`,
        [ownerJid, profileName, finalProfilePicUrl, name, req.user.id]
      );

      console.log(`✅ Dispositivo ${name} marcado como conectado no banco. Foto: ${finalProfilePicUrl || 'não disponível'}`);
    }

    res.json({
      success: true,
      data: {
        instanceName: name,
        connectionStatus: connectionState.instance?.state || 'close',
        state: connectionState.instance?.state || 'close',
        ownerJid: ownerJid,
        profileName: profileName,
        profilePicUrl: finalProfilePicUrl
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar status da instância:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar instância da Evolution API
app.delete('/api/evolution-instances/:name/evolution', authMiddleware, async (req, res) => {
  try {
    const { name } = req.params;

    console.log(`🗑️ Deletando instância da Evolution: ${name}`);

    // Buscar configuração dinâmica do banco de dados
    const evolutionConfig = await getEvolutionConfig();

    // Deletar da Evolution API
    const evolutionUrl = `${evolutionConfig.baseUrl}/instance/delete/${name}`;

    const evolutionResponse = await fetch(evolutionUrl, {
      method: 'DELETE',
      headers: {
        'apikey': evolutionConfig.apiKey
      }
    });

    if (!evolutionResponse.ok && evolutionResponse.status !== 404) {
      const errorText = await evolutionResponse.text();
      console.error('❌ Erro ao deletar da Evolution:', errorText);
      // Não falha se a instância não existe
    } else {
      console.log(`✅ Instância ${name} deletada da Evolution API`);
    }

    res.json({ success: true, message: 'Instância deletada da Evolution' });

  } catch (error) {
    console.error('❌ Erro ao deletar instância da Evolution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar instâncias Evolution
app.get('/api/evolution-instances', authMiddleware, async (req, res) => {
  try {
    // Buscar dispositivos WhatsApp conectados do usuário
    const devices = await db.all(
      'SELECT * FROM whatsapp_devices WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    
    // Converter dispositivos para formato de instâncias Evolution
    const instances = devices.map(device => ({
      id: device.id,
      name: device.name || device.profile_name || 'Sem nome',
      instance_id: device.id,
      connection_status: device.connection_status,
      profile_pic_url: device.profile_pic_url,
      owner_jid: device.owner_jid,
      connected_at: device.connected_at
    }));
    
    console.log('[API] Instâncias Evolution (dispositivos):', instances);
    res.json({ success: true, data: instances });
  } catch (error) {
    console.error('[ERROR] Erro ao listar instâncias Evolution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar instância Evolution
app.put('/api/evolution-instances/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.updateEvolutionInstance(id, req.body);
    res.json({ success: true, message: 'Instância atualizada' });
  } catch (error) {
    console.error('❌ Erro ao atualizar instância Evolution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar instância Evolution
app.delete('/api/evolution-instances/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteEvolutionInstance(id);
    res.json({ success: true, message: 'Instância deletada' });
  } catch (error) {
    console.error('❌ Erro ao deletar instância Evolution:', error);
    res.status(500).json({ error: error.message });
  }
});

// === Evolution API Configuration ===

// Obter configuração da Evolution API
app.get('/api/evolution-config', authMiddleware, async (req, res) => {
  try {
    // Buscar configuração do banco de dados
    const config = await db.get(
      'SELECT * FROM system_settings WHERE key = ?',
      ['evolution_api_config']
    );

    if (config && config.value) {
      const parsed = JSON.parse(config.value);
      // Não retorna a API key completa por segurança
      res.json({
        success: true,
        data: {
          baseUrl: parsed.baseUrl || EVOLUTION_CONFIG.baseUrl,
          hasApiKey: !!parsed.apiKey,
          apiKeyPreview: parsed.apiKey ? `${parsed.apiKey.substring(0, 8)}...` : null,
          isLocal: parsed.baseUrl?.includes('localhost') || parsed.baseUrl?.includes('127.0.0.1'),
          lastUpdated: config.updated_at
        }
      });
    } else {
      // Retorna configuração padrão do .env
      res.json({
        success: true,
        data: {
          baseUrl: EVOLUTION_CONFIG.baseUrl,
          hasApiKey: !!EVOLUTION_CONFIG.apiKey,
          apiKeyPreview: EVOLUTION_CONFIG.apiKey ? `${EVOLUTION_CONFIG.apiKey.substring(0, 8)}...` : null,
          isLocal: EVOLUTION_CONFIG.baseUrl?.includes('localhost') || EVOLUTION_CONFIG.baseUrl?.includes('127.0.0.1'),
          source: 'env'
        }
      });
    }
  } catch (error) {
    console.error('❌ Erro ao buscar config Evolution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Salvar configuração da Evolution API
app.post('/api/evolution-config', authMiddleware, async (req, res) => {
  try {
    const { baseUrl, apiKey } = req.body;

    if (!baseUrl) {
      return res.status(400).json({ error: 'URL base é obrigatória' });
    }

    const configValue = JSON.stringify({ baseUrl, apiKey: apiKey || '' });

    // Upsert na tabela system_settings
    await db.run(`
      INSERT INTO system_settings (key, value, description, updated_at)
      VALUES ('evolution_api_config', ?, 'Configuração da Evolution API', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `, [configValue, configValue]);

    // Atualiza a configuração em memória
    EVOLUTION_CONFIG.baseUrl = baseUrl;
    if (apiKey) EVOLUTION_CONFIG.apiKey = apiKey;

    console.log('✅ Configuração Evolution API atualizada:', { baseUrl, hasApiKey: !!apiKey });

    res.json({
      success: true,
      message: 'Configuração salva com sucesso',
      data: {
        baseUrl,
        hasApiKey: !!apiKey
      }
    });
  } catch (error) {
    console.error('❌ Erro ao salvar config Evolution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Testar conexão com Evolution API
app.post('/api/evolution-config/test', authMiddleware, async (req, res) => {
  try {
    const { baseUrl, apiKey } = req.body;
    const testUrl = baseUrl || EVOLUTION_CONFIG.baseUrl;
    const testKey = apiKey || EVOLUTION_CONFIG.apiKey;

    console.log(`[EVOLUTION TEST] Testando conexão com: ${testUrl}`);

    // Testar endpoint raiz
    const rootResponse = await fetch(testUrl, {
      method: 'GET',
      headers: { 'apikey': testKey }
    });

    if (!rootResponse.ok) {
      return res.json({
        success: false,
        error: `Erro HTTP: ${rootResponse.status}`,
        details: await rootResponse.text()
      });
    }

    const rootData = await rootResponse.json();

    // Testar listagem de instâncias
    let instances = [];
    try {
      const instancesResponse = await fetch(`${testUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: { 'apikey': testKey }
      });

      if (instancesResponse.ok) {
        instances = await instancesResponse.json();
      }
    } catch (e) {
      console.log('[EVOLUTION TEST] Não foi possível listar instâncias:', e.message);
    }

    res.json({
      success: true,
      data: {
        version: rootData.version,
        status: rootData.status,
        message: rootData.message,
        manager: rootData.manager,
        clientName: rootData.clientName,
        instanceCount: Array.isArray(instances) ? instances.length : 0,
        instances: Array.isArray(instances) ? instances.map(i => ({
          name: i.instance?.instanceName || i.name,
          status: i.instance?.status || i.connectionStatus
        })) : []
      }
    });
  } catch (error) {
    console.error('❌ Erro ao testar Evolution API:', error);
    res.json({
      success: false,
      error: error.message,
      details: 'Não foi possível conectar à Evolution API'
    });
  }
});

// Detectar Evolution API local (Umbrel)
app.get('/api/evolution-config/detect-local', authMiddleware, async (req, res) => {
  try {
    const localUrls = [
      'http://localhost:8085',
      'http://localhost:8080',
      'http://127.0.0.1:8085',
      'http://127.0.0.1:8080'
    ];

    for (const url of localUrls) {
      try {
        console.log(`[EVOLUTION DETECT] Tentando: ${url}`);
        const response = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(3000) // 3 segundos timeout
        });

        if (response.ok) {
          const data = await response.json();
          if (data.message?.includes('Evolution API')) {
            console.log(`✅ Evolution API local detectada em: ${url}`);
            return res.json({
              success: true,
              found: true,
              data: {
                url,
                version: data.version,
                clientName: data.clientName,
                manager: data.manager
              }
            });
          }
        }
      } catch (e) {
        // Continua tentando outras URLs
      }
    }

    res.json({
      success: true,
      found: false,
      message: 'Nenhuma Evolution API local encontrada'
    });
  } catch (error) {
    console.error('❌ Erro ao detectar Evolution local:', error);
    res.status(500).json({ error: error.message });
  }
});

// Executar ação de ferramenta (Evolution API)
app.post('/api/tools/evolution/execute', authMiddleware, async (req, res) => {
  try {
    const { instanceId, action, parameters } = req.body;
    
    // Buscar credenciais da instância
    const instance = await db.getEvolutionInstanceById(instanceId);
    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    let result;
    
    // Executar ação específica
    switch (action) {
      case 'send_text':
        result = await evolutionSendText(instance, parameters);
        break;
      case 'send_media':
        result = await evolutionSendMedia(instance, parameters);
        break;
      default:
        return res.status(400).json({ error: `Ação desconhecida: ${action}` });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Erro ao executar ação Evolution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Funções auxiliares para Evolution API
async function evolutionSendText(instance, params) {
  const { number, text, delay, quoted } = params;
  
  const url = `${instance.base_url}/message/sendText/${instance.instance_id}`;
  const body = {
    number,
    textMessage: { text },
    options: {
      delay: delay || 1000,
      presence: 'composing'
    }
  };

  if (quoted) body.options.quoted = quoted;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': instance.api_key
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Evolution API error: ${response.status}`);
  }

  return await response.json();
}

async function evolutionSendMedia(instance, params) {
  const { number, mediaUrl, mediaType, caption, delay } = params;
  
  const url = `${instance.base_url}/message/sendMedia/${instance.instance_id}`;
  const body = {
    number,
    mediaMessage: {
      mediatype: mediaType || 'image',
      media: mediaUrl
    },
    options: {
      delay: delay || 1000,
      presence: 'composing'
    }
  };

  if (caption) body.mediaMessage.caption = caption;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': instance.api_key
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Evolution API error: ${response.status}`);
  }

  return await response.json();
}

// ==========================================
// ==========================================

app.listen(port, '127.0.0.1', () => {
  console.log(`Servidor backend rodando em http://127.0.0.1:${port}`);
  console.log('Endpoints disponíveis:');
  console.log('  POST /api/transcribe - Transcrição completa de áudio');
  console.log('  POST /api/video-transcription - Transcrição de vídeos (novo)');
  console.log('  POST /api/transcribe-chunk - Transcrição de chunks');
  console.log('  POST /api/chat - Chat com RAG');
  console.log('  POST /api/optimize-prompt - Otimização de prompt com IA');
  console.log('  GET  /api/health - Health check');
  console.log('');
  console.log('🎬 Formatos de vídeo suportados: MP4, WebM, AVI, MOV, MKV, FLV');
  console.log('🎵 Formatos de áudio suportados: MP3, WAV, M4A, OGG, OPUS, FLAC');
  console.log('');
  console.log('📊 Endpoints de Persistência:');
  console.log('  POST /api/transcriptions - Salvar transcrição');
  console.log('  GET  /api/transcriptions - Listar transcrições');
  console.log('  GET  /api/transcriptions/:id - Buscar transcrição');
  console.log('  DELETE /api/transcriptions/:id - Deletar transcrição');
  console.log('  POST /api/rag-documents - Salvar documento RAG');
  console.log('  GET  /api/rag-documents - Listar documentos RAG');
  console.log('  GET  /api/rag-documents/:id - Buscar documento RAG');
  console.log('  DELETE /api/rag-documents/:id - Deletar documento RAG');
  console.log('  POST /api/prompts - Salvar prompt');
  console.log('  GET  /api/prompts - Listar prompts');
  console.log('  GET  /api/chat-history/:sessionId - Buscar histórico');
  console.log('');
  console.log('🤖 Sistema Multi-Agentes:');
  console.log('  POST /api/agents - Criar agente');
  console.log('  GET  /api/agents - Listar agentes');
  console.log('  GET  /api/agents/:id - Buscar agente');
  console.log('  PUT  /api/agents/:id - Atualizar agente');
  console.log('  DELETE /api/agents/:id - Deletar agente');
  console.log('  POST /api/agents/:id/set-default - Definir padrão');
  console.log('  POST /api/agents/:id/chat - Chat com agente');
  console.log('  GET  /api/agents/:id/messages - Histórico do agente');
  console.log('  GET  /api/agents/:id/sessions - Sessões do agente');
  console.log('  POST /api/agents/:id/rag-access - Conceder acesso RAG');
  console.log('  DELETE /api/agents/:id/rag-access/:ragId - Revogar acesso');
  console.log('  GET  /api/agents/:id/rag-access - Listar RAGs do agente');
  console.log('  GET  /api/agents/:id/statistics - Estatísticas');
  console.log('');
  console.log('📅 Sistema de Agendamento (Team Management):');
  console.log('  GET  /api/scheduler/team-members - Listar membros');
  console.log('  POST /api/scheduler/team-members - Criar membro');
  console.log('  GET  /api/scheduler/schedules - Listar agendamentos');
  console.log('  POST /api/scheduler/schedules - Criar agendamento');
  console.log('  POST /api/scheduler/schedules/:id/trigger - Disparar manual');
  console.log('  GET  /api/scheduler/executions - Histórico execuções');
  console.log('  GET  /api/scheduler/activities - Histórico atividades');
  console.log('  GET  /api/scheduler/templates - Listar templates');
  console.log('  GET  /api/scheduler/stats/team - Estatísticas equipe');
  console.log('  GET  /api/scheduler/status - Status do scheduler');
  console.log('');
});