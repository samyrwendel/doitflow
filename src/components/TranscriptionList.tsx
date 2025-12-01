import { FiTrash2, FiClock, FiFile, FiType, FiLayers, FiDollarSign, FiDownload, FiPackage } from 'react-icons/fi'
import { SavedTranscription } from '../types'
import { formatTimestamp, formatFileSize, formatDuration } from '../lib/utils'

interface TranscriptionListProps {
  transcriptions: SavedTranscription[]
  onDelete: (transcriptionId: string) => void
  onDownload: (transcriptionId: string) => void
  onTransformToChunks: (transcriptionId: string) => void
}

export function TranscriptionList({ 
  transcriptions, 
  onDelete,
  onDownload,
  onTransformToChunks
}: TranscriptionListProps) {
  
  if (transcriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3 opacity-50">
          <FiFile className="w-6 h-6" />
        </div>
        <p className="text-center max-w-xs text-xs px-4">
          Nenhuma transcrição salva ainda.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 px-1">
      {transcriptions.map((transcription) => (
        <div
          key={transcription.id}
          className="flex items-center justify-between p-2 bg-card border border-border rounded hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm text-card-foreground truncate block">
                {transcription.title}
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
              {transcription.duration && (
                <div className="flex items-center gap-1">
                  <FiClock className="w-3 h-3" />
                  <span>{formatDuration(transcription.duration)}</span>
                </div>
              )}
              
              {transcription.audioSize && (
                <div className="flex items-center gap-1">
                  <FiFile className="w-3 h-3" />
                  <span>{formatFileSize(transcription.audioSize)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1" title="Caracteres extraídos">
                <FiType className="w-3 h-3" />
                <span>{(transcription.characterCount / 1000).toFixed(1)}k</span>
              </div>
              
              {transcription.chunkCount && transcription.chunkCount > 0 && (
                <div className="flex items-center gap-1" title="Chunks gerados">
                  <FiLayers className="w-3 h-3" />
                  <span>{transcription.chunkCount}</span>
                </div>
              )}
              
              {transcription.embeddingCost && transcription.embeddingCost > 0 && (
                <div className="flex items-center gap-1" title="Custo de embeddings">
                  <FiDollarSign className="w-3 h-3" />
                  <span>${transcription.embeddingCost.toFixed(6)}</span>
                </div>
              )}
              
              <span className="text-xs">
                {formatTimestamp(transcription.createdAt).split(' ')[0]}
              </span>
            </div>
          </div>
          
          <div className="flex gap-1 ml-3">
            <button
              onClick={() => onDownload(transcription.id)}
              className="p-1.5 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 transition-colors"
              title="Download da transcrição"
            >
              <FiDownload className="w-3.5 h-3.5" />
            </button>
            
            {!transcription.chunkCount && (
              <button
                onClick={() => onTransformToChunks(transcription.id)}
                className="p-1.5 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 transition-colors"
                title="Transformar em chunks para LLM"
              >
                <FiPackage className="w-3.5 h-3.5" />
              </button>
            )}
            
            <button
              onClick={() => onDelete(transcription.id)}
              className="p-1.5 bg-yellow-500/10 text-yellow-500 rounded hover:bg-yellow-500/20 transition-colors"
              title="Excluir"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      
      <div className="mt-3 pt-2 border-t border-border px-1">
        <div className="text-xs text-muted-foreground text-center">
          {transcriptions.length} transcrições • {transcriptions.reduce((sum, t) => sum + t.characterCount, 0).toLocaleString()} chars total
        </div>
      </div>
    </div>
  )
}
