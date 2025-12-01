import { RAGSelector } from './RAGSelector'
import { RAGDocument } from '../types'
import { FiZap } from 'react-icons/fi'

interface PromptEditorProps {
  prompt: string
  onChange: (prompt: string) => void
  ragDocuments: RAGDocument[]
  selectedRagId?: string
  onRagSelect: (ragId: string | null) => void
  ragIndex?: string
  promptSyncStatus?: 'synced' | 'modified' | 'syncing'
  onSyncPrompt?: () => void
  onOptimizePrompt?: (prompt: string) => Promise<void>
  isOptimizing?: boolean
}

export function PromptEditor({ 
  prompt, 
  onChange, 
  ragDocuments, 
  selectedRagId, 
  onRagSelect, 
  ragIndex,
  promptSyncStatus = 'synced',
  onSyncPrompt,
  onOptimizePrompt,
  isOptimizing = false,
}: PromptEditorProps) {
  const selectedDoc = ragDocuments.find(doc => doc.id === selectedRagId)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Editor de Prompt</h2>
            
            {/* Indicador de Sincronização e Configurações */}
            <div className="flex items-center gap-2">
              {promptSyncStatus === 'synced' && (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Sincronizado</span>
                </div>
              )}
              {promptSyncStatus === 'modified' && (
                <div className="flex items-center gap-1 text-orange-600 text-xs">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                  <span>Modificado</span>
                  {onSyncPrompt && (
                    <button
                      onClick={onSyncPrompt}
                      className="ml-1 px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 dark:bg-orange-900 dark:hover:bg-orange-800 text-orange-700 dark:text-orange-300 rounded transition-colors"
                    >
                      Sincronizar
                    </button>
                  )}
                </div>
              )}
              {promptSyncStatus === 'syncing' && (
                <div className="flex items-center gap-1 text-blue-600 text-xs">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-spin"></div>
                  <span>Sincronizando...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOptimizePrompt?.(prompt)}
              disabled={!prompt.trim() || isOptimizing}
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 disabled:bg-gray-100 text-purple-700 disabled:text-gray-400 rounded-lg transition-colors text-sm font-medium disabled:cursor-not-allowed"
              title="Otimizar prompt automaticamente"
            >
              <FiZap className={`w-4 h-4 ${isOptimizing ? 'animate-pulse' : ''}`} />
              {isOptimizing ? 'Otimizando...' : 'Otimizar Prompt'}
            </button>
            
            <RAGSelector
              documents={ragDocuments}
              selectedDocumentId={selectedRagId}
              onDocumentSelect={onRagSelect}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedDoc 
            ? `Contexto RAG: ${selectedDoc.title} (${selectedDoc.chunks.length} chunks)`
            : 'Selecione um documento RAG para adicionar contexto inteligente'
          }
        </p>
      </div>

      {/* RAG Index Preview */}
      {selectedDoc && ragIndex && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
            📋 Índice do Conhecimento (será usado automaticamente)
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 line-clamp-3">
            {ragIndex}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        <textarea
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          placeholder={selectedDoc 
            ? "Digite sua pergunta ou prompt. O sistema usará automaticamente o índice do RAG selecionado para buscar informações relevantes..."
            : "Selecione um documento RAG acima ou digite um prompt livre..."
          }
          className="flex-1 w-full p-3 border border-input bg-background rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-sm"
        />
        
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {prompt.length} caracteres
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{prompt.split(/\s+/).filter(word => word.length > 0).length} palavras</span>
            {selectedDoc && (
              <span className="text-blue-600 dark:text-blue-400">
                RAG: {selectedDoc.chunks.length} chunks disponíveis
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}