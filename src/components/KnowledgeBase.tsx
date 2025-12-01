import { useState } from 'react'
import { FiUpload, FiBook, FiRefreshCw, FiMusic } from 'react-icons/fi'
import { TranscriptionResult, TranscriptionProgress, RAGDocument, SavedTranscription, ChatMessage } from '../types'
import { TranscriptionPanel } from './TranscriptionPanel'
import { TranscriptionList } from './TranscriptionList'
import { RAGList } from './RAGList'
import { ContextWindowVisualizer } from './ContextWindowVisualizer'

interface KnowledgeBaseProps {
  // Prompt e chat
  promptText?: string
  messages?: ChatMessage[]
  
  // Transcrição
  transcription: TranscriptionResult | null
  progress: TranscriptionProgress
  onTranscriptionComplete: (transcription: TranscriptionResult) => void
  onTranscriptionProgress: (progress: TranscriptionProgress) => void
  onSaveTranscription: () => void
  onTransformToChunks: () => void
  onNewTranscription: () => void
  
  // RAG
  documents: RAGDocument[]
  onDownloadChunks: (document: RAGDocument) => void
  onDownloadAllChunks: (document: RAGDocument) => void
  
  // Transcrições salvas
  savedTranscriptions: SavedTranscription[]
  onDeleteTranscription: (transcriptionId: string) => void
  onDeleteRAGDocument: (documentId: string) => void
  onDownloadTranscription: (transcriptionId: string) => void
  onTranscriptionToChunks: (transcriptionId: string) => void
  
  // Auth
  authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>
}

type TabType = 'transcription' | 'transcriptions' | 'rag'

export function KnowledgeBase({
  promptText = '',
  messages = [],
  transcription,
  progress,
  onTranscriptionComplete,
  onTranscriptionProgress,
  onSaveTranscription,
  onTransformToChunks,
  onNewTranscription,
  documents,
  onDownloadChunks,
  onDownloadAllChunks,
  savedTranscriptions,
  onDeleteTranscription,
  onDeleteRAGDocument,
  onDownloadTranscription,
  onTranscriptionToChunks,
  authenticatedFetch
}: KnowledgeBaseProps) {
  const [activeTab, setActiveTab] = useState<TabType>('transcription')
  const [expandedSection, setExpandedSection] = useState<'documents' | 'transcriptions' | ''>('transcriptions') // Expandir transcrições por padrão

  const hasTranscription = !!transcription
  const hasDocuments = documents.length > 0
  const hasSavedTranscriptions = savedTranscriptions.length > 0

  return (
    <div className="flex flex-col h-full p-3">
      {/* Context Window Visualizer - Compacto */}
      <div className="pb-2">
        <ContextWindowVisualizer 
          documents={documents}
          promptText={promptText}
          messages={messages}
          maxContextTokens={8000}
          optimalTokens={1024}
          warningTokens={5000}
        />
      </div>

      {/* Tabs - Compactas */}
      <div className="border-b border-border mb-2">
        <div className="flex">
          <button
            onClick={() => setActiveTab('transcription')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'transcription'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <FiUpload className="w-3 h-3" />
            Envio
            {(hasTranscription || hasSavedTranscriptions) && (
              <span className="ml-0.5 px-1 py-0.5 bg-primary/10 text-primary text-xs rounded-full leading-none">
                {hasSavedTranscriptions ? savedTranscriptions.length + (hasTranscription ? 1 : 0) : 1}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('rag')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'rag'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <FiBook className="w-3 h-3" />
            Documentos RAG
            {hasDocuments && (
              <span className="ml-0.5 px-1 py-0.5 bg-primary/10 text-primary text-xs rounded-full leading-none">
                {documents.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content - Otimizado com padding */}
      <div className="flex-1 overflow-hidden px-1 min-h-0">
        {activeTab === 'transcription' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-3">
              {/* Painel de Nova Transcrição */}
              <TranscriptionPanel
                transcription={transcription}
                progress={progress}
                onComplete={onTranscriptionComplete}
                onProgress={onTranscriptionProgress}
                onSave={onSaveTranscription}
                onTransformToChunks={onTransformToChunks}
                onNewTranscription={onNewTranscription}
                authenticatedFetch={authenticatedFetch}
              />
              
              {/* Transcrições Salvas - Seção Colapsável (APENAS ÁUDIO/VÍDEO) */}
              {hasSavedTranscriptions && (
                <div className="border border-border rounded-lg">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'transcriptions' ? '' : 'transcriptions')}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    title="Transcrições de áudio e vídeo"
                  >
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <FiMusic className="w-4 h-4" />
                      Transcrições de Áudio/Vídeo ({savedTranscriptions.length})
                    </h4>
                    <div className="text-muted-foreground transition-transform duration-200">
                      {expandedSection === 'transcriptions' ? 
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg> : 
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      }
                    </div>
                  </button>
                  {expandedSection === 'transcriptions' && (
                    <div className="border-t border-border p-3">
                      <TranscriptionList
                        transcriptions={savedTranscriptions}
                        onDelete={onDeleteTranscription}
                        onDownload={onDownloadTranscription}
                        onTransformToChunks={onTranscriptionToChunks}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Quick Action compacta */}
            {hasTranscription && (
              <div className="mt-3 p-3 bg-muted/30 rounded border-l-2 border-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-medium">Próximo Passo</h4>
                    <p className="text-xs text-muted-foreground">
                      Gerar chunks para RAG
                    </p>
                  </div>
                  <button
                    onClick={onTransformToChunks}
                    className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/80 transition-colors text-xs"
                  >
                    <FiRefreshCw className="w-3 h-3" />
                    Gerar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rag' && (
          <div className="h-full overflow-y-auto space-y-3">
            {/* Documentos RAG */}
            {hasDocuments ? (
              <div className="space-y-3">
                <RAGList 
                  documents={documents} 
                  onDownloadChunks={onDownloadChunks}
                  onDownloadAllChunks={onDownloadAllChunks}
                  onDeleteDocument={onDeleteRAGDocument}
                />
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                  <FiBook className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium mb-2">Nenhum Documento RAG</h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-xs px-2">
                  Os documentos RAG aparecem aqui quando você gera chunks de uma transcrição.
                </p>
                <button
                  onClick={() => setActiveTab('transcription')}
                  className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/80 transition-colors text-xs"
                >
                  <FiUpload className="w-3 h-3" />
                  Fazer Envio
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}