import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export function chunkText(text: string, chunkSize: number = 1000): string[] {
  const chunks: string[] = []
  
  // Para textos muito longos (>50k chars), use chunks maiores
  const adaptiveChunkSize = text.length > 50000 ? Math.min(chunkSize * 2, 2000) : chunkSize
  
  // Primeira tentativa: dividir por parágrafos
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  
  if (paragraphs.length > 1) {
    let currentChunk = ''
    
    for (const paragraph of paragraphs) {
      const paragraphWithNewline = paragraph.trim() + '\n\n'
      
      if ((currentChunk + paragraphWithNewline).length > adaptiveChunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim())
          currentChunk = ''
        }
        
        // Se o parágrafo é muito grande, quebrar por sentenças
        if (paragraphWithNewline.length > adaptiveChunkSize) {
          const sentenceChunks = chunkBySentences(paragraph, adaptiveChunkSize)
          chunks.push(...sentenceChunks)
        } else {
          currentChunk = paragraphWithNewline
        }
      } else {
        currentChunk += paragraphWithNewline
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }
  } else {
    // Fallback: dividir por sentenças
    const sentenceChunks = chunkBySentences(text, adaptiveChunkSize)
    chunks.push(...sentenceChunks)
  }

  return chunks.filter(chunk => chunk.length > 0)
}

function chunkBySentences(text: string, chunkSize: number): string[] {
  const chunks: string[] = []
  const sentences = text.split(/[.!?]+/)
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
    }
    currentChunk += sentence + '.'
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks.filter(chunk => chunk.length > 0)
}

export function createPromptFromChunks(chunks: string[]): string {
  return `Baseado nos seguintes documentos de contexto, responda às perguntas do usuário:

CONTEXTO:
${chunks.map((chunk, index) => `--- Documento ${index + 1} ---\n${chunk}`).join('\n\n')}

INSTRUÇÕES:
- Responda apenas com base nas informações fornecidas no contexto
- Se a informação não estiver no contexto, informe que não sabe
- Seja claro e objetivo nas respostas
- Use as informações dos documentos para fundamentar suas respostas`
}

export function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}