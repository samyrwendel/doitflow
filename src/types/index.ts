export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    searchMethod?: 'semantic' | 'keyword' | 'casual' | 'none';
    chunksUsed?: number;
    chunks?: string[]; // Chunks completos utilizados
    chunksSimilarity?: number[]; // Similaridade de cada chunk
    similarityScore?: number;
    processingTime?: number;
    tokensUsed?: number;
    cost?: number;
    model?: string;
    provider?: string;
    toolUsed?: string; // Nome da ferramenta usada
    action?: string; // Ação executada
    recipient?: string; // Destinatário (para WhatsApp)
    number?: string; // Número (para WhatsApp)
    deviceUsed?: string; // Dispositivo usado
    sentMessage?: string; // Mensagem enviada (para WhatsApp)
    imageData?: string; // Base64 da imagem gerada (para DALL-E/Imagen)
    imageFormat?: string; // Formato da imagem (png, jpg, etc)
    prompt?: string; // Prompt usado para gerar imagem
    revisedPrompt?: string; // Prompt otimizado pelo DALL-E 3
    success?: boolean; // Sucesso da operação
  };
}

export interface TranscriptionResult {
  text: string;
  chunks?: string[];
  duration?: number;
  fileName?: string;
  audioSize?: number; // tamanho do arquivo em bytes
  isVideo?: boolean; // indica se foi processado de um vídeo
  isDocument?: boolean; // indica se foi processado de um documento
}

export interface SavedTranscription {
  id: string;
  title: string;
  text: string;
  fileName?: string;
  duration?: number;
  audioSize?: number; // tamanho do arquivo de áudio em bytes
  characterCount: number;
  chunkCount?: number; // número de chunks gerados
  embeddingCost?: number; // custo de embeddings
  createdAt: string;
  chunks?: string[];
}

export interface RAGDocument {
  id: string;
  title: string;
  content: string;
  chunks: string[];
  createdAt: string;
  sourceFileName?: string;
  metadata?: {
    originalLength?: number;
    chunkCount?: number;
    isLongDocument?: boolean;
    audioSize?: number;
    duration?: number;
  };
}

export interface TranscriptionProgress {
  status: 'idle' | 'uploading' | 'processing' | 'chunking' | 'transcribing' | 'completed' | 'error';
  progress: number;
  currentChunk?: number;
  totalChunks?: number;
  message?: string;
  error?: string;
}

export interface AppState {
  messages: ChatMessage[];
  ragDocuments: RAGDocument[];
  currentTranscription: TranscriptionResult | null;
  transcriptionProgress: TranscriptionProgress;
  promptText: string;
  isLoading: boolean;
}

export interface AudioChunkerConfig {
  maxChunkSizeMB: number;
  minChunkDurationSeconds: number;
}

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  systemPrompt: string;
  temperature: number;
  model: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  evolutionInstanceId?: string;
}