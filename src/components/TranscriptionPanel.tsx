import { useRef, useState } from 'react'
import { FiMic, FiSave, FiRefreshCw, FiPlus, FiFileText, FiMusic, FiVideo } from 'react-icons/fi'
import { TranscriptionResult, TranscriptionProgress } from '../types'
import { formatFileSize, formatDuration } from '../lib/utils'
import { API_ENDPOINTS } from '../lib/api'
import WebAudioChunker from '../lib/WebAudioChunker'

interface TranscriptionPanelProps {
  transcription: TranscriptionResult | null
  progress: TranscriptionProgress
  onComplete: (transcription: TranscriptionResult) => void
  onProgress: (progress: TranscriptionProgress) => void
  onSave: () => void
  onTransformToChunks: () => void
  onNewTranscription: () => void
  authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>
}

export function TranscriptionPanel({
  transcription,
  progress,
  onComplete,
  onProgress,
  onSave,
  onTransformToChunks,
  onNewTranscription,
  authenticatedFetch
}: TranscriptionPanelProps) {
  const [dragActive, setDragActive] = useState(false)
  const [isProcessingDocument, setIsProcessingDocument] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    const isVideo = file.type.startsWith('video/')
    const isAudio = file.type.startsWith('audio/')
    const isDocument = file.type === 'application/pdf' ||
                      file.type === 'text/plain' ||
                      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                      file.type === 'application/msword' ||
                      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                      file.type === 'application/vnd.ms-excel' ||
                      file.name.endsWith('.pdf') ||
                      file.name.endsWith('.txt') ||
                      file.name.endsWith('.md') ||
                      file.name.endsWith('.docx') ||
                      file.name.endsWith('.doc') ||
                      file.name.endsWith('.xlsx') ||
                      file.name.endsWith('.xls')
    
    if (isDocument) {
      setIsProcessingDocument(true)
      processDocumentFile(file)
    } else if (isVideo) {
      setIsProcessingDocument(false)
      processVideoFile(file)
    } else if (isAudio) {
      setIsProcessingDocument(false)
      processAudioFile(file)
    } else {
      // Arquivo não suportado
      onProgress({
        status: 'error',
        progress: 0,
        totalChunks: 0,
        currentChunk: 0,
        error: 'Formato de arquivo não suportado. Use arquivos de áudio (MP3, WAV, M4A, OGG, FLAC), vídeo (MP4, WebM, AVI, MOV, MKV) ou documentos (PDF, TXT, DOC, DOCX, XLS, XLSX).'
      })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const processVideoFile = async (file: File) => {
    console.log('Processando vídeo:', file.name, 'Tamanho:', formatFileSize(file.size))
    
    try {
      // Atualizar progresso: extraindo áudio
      onProgress({
        status: 'processing',
        progress: 5,
        totalChunks: 0,
        currentChunk: 0
      })
      
      const formData = new FormData()
      formData.append('video', file)
      
      onProgress({
        status: 'processing',
        progress: 20,
        totalChunks: 0,
        currentChunk: 0
      })
      
      const response = await fetch(API_ENDPOINTS.VIDEO_TRANSCRIPTION, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha no processamento do vídeo')
      }
      
      const data = await response.json()
      
      if (data.requiresChunking) {
        // Vídeo grande que foi dividido em chunks
        onProgress({
          status: 'completed',
          progress: 100,
          totalChunks: data.chunks,
          currentChunk: data.chunks
        })
        
        onComplete({
          text: `Vídeo processado com sucesso! O arquivo foi dividido em ${data.chunks} segmentos para transcrição otimizada. Use o sistema de chunks para transcrição completa.`,
          fileName: file.name,
          duration: 0, // Será calculado no processamento de chunks
          audioSize: file.size,
          isVideo: true
        })
      } else {
        // Vídeo pequeno transcrito diretamente
        onProgress({
          status: 'completed',
          progress: 100,
          totalChunks: 1,
          currentChunk: 1
        })
        
        onComplete({
          text: data.transcription,
          fileName: file.name,
          duration: 0, // Pode ser estimado baseado no tamanho
          audioSize: file.size,
          isVideo: true
        })
      }
      
    } catch (error) {
      console.error('Erro ao processar vídeo:', error)
      onProgress({
        status: 'error',
        progress: 0,
        totalChunks: 0,
        currentChunk: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido no processamento do vídeo'
      })
      throw error
    }
  }

  const processDocumentFile = async (file: File) => {
    console.log('Processando documento:', file.name, 'Tamanho:', formatFileSize(file.size))
    
    try {
      // Atualizar progresso: extraindo texto
      onProgress({
        status: 'processing',
        progress: 10,
        totalChunks: 0,
        currentChunk: 0
      })
      
      const formData = new FormData()
      formData.append('document', file)
      
      // Verificar se authenticatedFetch está disponível
      if (!authenticatedFetch) {
        throw new Error('Você precisa estar autenticado para fazer upload de documentos')
      }
      
      onProgress({
        status: 'processing',
        progress: 30,
        totalChunks: 0,
        currentChunk: 0
      })
      
      const response = await authenticatedFetch(API_ENDPOINTS.UPLOAD_DOCUMENT, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        // Tratar erro 413 (Payload Too Large)
        if (response.status === 413) {
          throw new Error(`Arquivo muito grande! Tamanho: ${formatFileSize(file.size)}. Limite máximo: 100MB. Tente um arquivo menor.`)
        }
        
        // Tentar fazer parse do JSON de erro
        let errorMessage = 'Falha no processamento do documento'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // Se não conseguir fazer parse do JSON, usar mensagem genérica
          errorMessage = `Erro ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      
      // Documento processado com sucesso
      onProgress({
        status: 'completed',
        progress: 100,
        totalChunks: data.document.chunkCount,
        currentChunk: data.document.chunkCount
      })
      
      onComplete({
        text: `✅ Documento processado com sucesso!\n\n📄 **${file.name}**\n\n📊 **Estatísticas:**\n- ${data.document.chunkCount} chunks gerados\n- ${data.document.characterCount.toLocaleString()} caracteres extraídos\n- ${data.document.embeddingCost > 0 ? `💰 Custo embeddings: $${data.document.embeddingCost.toFixed(6)}` : '📝 Pronto para busca semântica'}\n\n✨ O documento já está disponível como base de conhecimento RAG!`,
        fileName: file.name,
        duration: 0,
        audioSize: file.size,
        isDocument: true
      })
      
    } catch (error) {
      console.error('Erro ao processar documento:', error)
      onProgress({
        status: 'error',
        progress: 0,
        totalChunks: 0,
        currentChunk: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido no processamento do documento'
      })
      throw error
    }
  }

  const processAudioFile = async (file: File) => {
    console.log('Processando arquivo:', file.name, 'Tamanho:', formatFileSize(file.size))
    
    try {
      // Atualizar progresso: iniciando processamento
      onProgress({
        status: 'processing',
        progress: 10,
        totalChunks: 0,
        currentChunk: 0
      })
      
      const chunker = new WebAudioChunker()
      
      // Primeiro, verificar se o arquivo precisa ser fragmentado
      const chunks = await chunker.processFile(file)
      
      console.log(`Arquivo dividido em ${chunks.length} fragmento(s)`)
      
      // Atualizar progresso: chunking completo
      onProgress({
        status: 'chunking',
        progress: 20,
        totalChunks: chunks.length,
        currentChunk: 0
      })
      
      if (chunks.length === 1) {
        // Arquivo pequeno, transcrever diretamente
        onProgress({
          status: 'transcribing',
          progress: 50,
          totalChunks: chunks.length,
          currentChunk: 1
        })
        
        const formData = new FormData()
        formData.append('audio', file)
        
        const response = await fetch(API_ENDPOINTS.TRANSCRIBE, {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Falha na transcrição do arquivo')
        }
        
        const data = await response.json()
        
        onProgress({
          status: 'completed',
          progress: 100,
          totalChunks: chunks.length,
          currentChunk: 1
        })
        
        onComplete({
          text: data.transcription,
          fileName: file.name,
          duration: data.duration || chunks[0].duration,
          audioSize: file.size
        })
      } else {
        // Arquivo grande, usar endpoint de fragmentação
        onProgress({
          status: 'transcribing',
          progress: 20,
          totalChunks: chunks.length,
          currentChunk: 0
        })
        const transcriptions = []
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          console.log(`Transcrevendo fragmento ${i + 1}/${chunks.length}`)
          
          // Atualizar progresso para cada chunk
          onProgress({
            status: 'transcribing',
            progress: Math.round(20 + ((i + 1) / chunks.length) * 70), // 20% inicial + 70% para transcrição
            totalChunks: chunks.length,
            currentChunk: i + 1
          })
          
          const formData = new FormData()
          formData.append('audio', chunk.blob, `chunk_${i}.wav`)
          
          const response = await fetch(API_ENDPOINTS.TRANSCRIBE_CHUNK, {
            method: 'POST',
            body: formData
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `Falha na transcrição do fragmento ${i + 1}`)
          }
          
          const data = await response.json()
          transcriptions.push({
            text: data.transcription,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
            index: i
          })
        }
        
        // Combinar todas as transcrições
        onProgress({
          status: 'completed',
          progress: 100,
          totalChunks: chunks.length,
          currentChunk: chunks.length
        })
        
        const fullTranscription = transcriptions
          .sort((a, b) => a.index - b.index)
          .map(t => t.text)
          .join(' ')
        
        onComplete({
          text: fullTranscription,
          fileName: file.name,
          chunks: transcriptions.map(t => t.text),
          duration: chunks[chunks.length - 1].endTime,
          audioSize: file.size
        })
      }
      
    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      onProgress({
        status: 'error',
        progress: 0,
        totalChunks: 0,
        currentChunk: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
      throw error
    }
  }

  const getStatusMessage = () => {
    switch (progress.status) {
      case 'uploading':
        return 'Fazendo upload do arquivo...'
      case 'processing':
        return isProcessingDocument 
          ? 'Processando e extraindo texto do documento...' 
          : 'Processando e extraindo áudio...'
      case 'chunking':
        return isProcessingDocument
          ? `Dividindo texto em ${progress.totalChunks || 0} partes...`
          : `Dividindo em ${progress.totalChunks || 0} segmentos...`
      case 'transcribing':
        return isProcessingDocument
          ? `Processando parte ${progress.currentChunk || 0}/${progress.totalChunks || 0}...`
          : `Transcrevendo segmento ${progress.currentChunk || 0}/${progress.totalChunks || 0}...`
      case 'completed':
        return isProcessingDocument ? 'Documento processado!' : 'Transcrição concluída!'
      case 'error':
        return progress.error || 'Ocorreu um erro no processamento'
      default:
        return 'Arraste um arquivo ou clique para selecionar'
    }
  }

  return (
    <div className="px-2">
      {/* Upload Area */}
      {!transcription && (
        <div>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac,.mp4,.webm,.avi,.mov,.mkv,.pdf,.txt,.md,.doc,.docx,.xls,.xlsx"
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            <div className="flex flex-col items-center justify-center">
              {progress.status === 'idle' && (
                <>
                  <p className="text-sm font-medium mb-2">
                    Arraste um arquivo aqui
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 mb-1">
                      <FiFileText className="w-3.5 h-3.5" />
                      <span>Documentos: PDF, TXT, DOC, DOCX, XLS, XLSX</span>
                    </span>
                    <span className="flex items-center gap-1.5 mb-1">
                      <FiMusic className="w-3.5 h-3.5" />
                      <span>Áudio: MP3, WAV, M4A, OGG, FLAC</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FiVideo className="w-3.5 h-3.5" />
                      <span>Vídeo: MP4, WebM, AVI, MOV, MKV</span>
                    </span>
                  </p>
                </>
              )}
              
              {(progress.status !== 'idle' && progress.status !== 'completed') && (
                <div className="w-full max-w-xs">
                  {/* Ícone de microfone para todos os status */}
                  <div className="flex justify-center mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      progress.status === 'processing' ? 'bg-blue-100' :
                      progress.status === 'chunking' ? 'bg-yellow-100' :
                      progress.status === 'transcribing' ? 'bg-green-100' :
                      progress.status === 'error' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      <FiMic className={`w-5 h-5 ${
                        progress.status === 'processing' ? 'text-blue-600' :
                        progress.status === 'chunking' ? 'text-yellow-600' :
                        progress.status === 'transcribing' ? 'text-green-600 animate-pulse' :
                        progress.status === 'error' ? 'text-red-600' : 'text-gray-600'
                      }`} />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">{getStatusMessage()}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(progress.progress)}%</span>
                  </div>
                  
                  <div className="w-full bg-secondary rounded-full h-2 mb-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        progress.status === 'processing' ? 'bg-blue-500' :
                        progress.status === 'chunking' ? 'bg-yellow-500' :
                        progress.status === 'transcribing' ? 'bg-green-500' :
                        progress.status === 'error' ? 'bg-red-500' : 'bg-primary'
                      }`}
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  
                  {progress.totalChunks && progress.totalChunks > 1 && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">
                        Segmento {progress.currentChunk || 0} de {progress.totalChunks}
                      </p>
                      <div className="flex gap-1 justify-center">
                        {Array.from({ length: progress.totalChunks }, (_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              i < (progress.currentChunk || 0) ? 'bg-green-500' :
                              i === (progress.currentChunk || 0) - 1 ? 'bg-yellow-500' :
                              'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {progress.status === 'error' && progress.error && (
                    <div className="mt-2 p-2 bg-destructive/5 border border-destructive/20 rounded text-xs text-destructive">
                      {progress.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transcription Result */}
      {transcription && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm">Transcrição Concluída</h3>
            <div className="flex gap-1">
              <button
                onClick={onSave}
                className="px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors text-xs flex items-center gap-1"
              >
                <FiSave className="w-3 h-3" />
                Salvar
              </button>
              <button
                onClick={onTransformToChunks}
                className="px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/80 transition-colors text-xs flex items-center gap-1"
              >
                <FiRefreshCw className="w-3 h-3" />
                Chunks
              </button>
              <button
                onClick={onNewTranscription}
                className="px-2 py-1 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors text-xs flex items-center gap-1"
              >
                <FiPlus className="w-3 h-3" />
                Nova Transcrição
              </button>
            </div>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-3 overflow-y-auto max-h-48 min-h-24">
            <div className="whitespace-pre-wrap text-xs leading-relaxed">
              {transcription.text}
            </div>
            
            {transcription.fileName && (
              <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground">
                <p>Arquivo: {transcription.fileName}</p>
                {transcription.duration && (
                  <p>Duração: {formatDuration(transcription.duration)}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}