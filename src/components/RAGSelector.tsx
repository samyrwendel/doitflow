import { useState } from 'react'
import { FiBook, FiZap, FiCheck, FiX } from 'react-icons/fi'
import { RAGDocument } from '../types'

interface RAGSelectorProps {
  documents: RAGDocument[]
  selectedDocumentId?: string
  onDocumentSelect: (documentId: string | null) => void
}

export function RAGSelector({ documents, selectedDocumentId, onDocumentSelect }: RAGSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedDoc = documents.find(doc => doc.id === selectedDocumentId)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-xs rounded border transition-colors ${
          selectedDoc 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <FiBook className="w-3 h-3" />
        <span className="font-medium">
          {selectedDoc ? selectedDoc.title : 'Selecionar RAG'}
        </span>
        {selectedDoc && selectedDoc.metadata?.isLongDocument && (
          <FiZap className="w-3 h-3 text-yellow-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Base de Conhecimento</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <FiX className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {/* Opção "Nenhum" */}
            <button
              onClick={() => {
                onDocumentSelect(null)
                setIsOpen(false)
              }}
              className={`w-full p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                !selectedDocumentId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Sem RAG</span>
                {!selectedDocumentId && <FiCheck className="w-3 h-3 text-blue-500" />}
              </div>
            </button>

            {/* Lista de documentos */}
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => {
                  onDocumentSelect(doc.id)
                  setIsOpen(false)
                }}
                className={`w-full p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectedDocumentId === doc.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {doc.title}
                      </span>
                      {doc.metadata?.isLongDocument && (
                        <FiZap className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {doc.chunks.length} chunks • {(doc.content.length / 1000).toFixed(1)}k chars
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">
                      {doc.content.substring(0, 80)}...
                    </div>
                  </div>
                  {selectedDocumentId === doc.id && (
                    <FiCheck className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {documents.length === 0 && (
            <div className="p-4 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Nenhum documento RAG disponível
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}