import { RAGDocument } from '../types'
import { FiTrash2, FiFileText } from 'react-icons/fi'
import { BsFiletypePdf, BsFiletypeDocx, BsFiletypeXlsx, BsFiletypeTxt, BsFiletypeCsv, BsFileEarmarkImage, BsFileEarmarkPlay } from 'react-icons/bs'

interface RAGListProps {
  documents: RAGDocument[]
  onDownloadChunks?: (document: RAGDocument) => void
  onDownloadAllChunks?: (document: RAGDocument) => void
  onDeleteDocument?: (documentId: string) => void
}

// Função para obter o ícone baseado na extensão do arquivo
const getFileIcon = (fileName: string | undefined) => {
  if (!fileName) return <FiFileText className="w-5 h-5 text-muted-foreground" />
  
  const ext = fileName.toLowerCase().split('.').pop()
  const iconClass = "w-5 h-5"
  
  switch (ext) {
    case 'pdf':
      return <BsFiletypePdf className={`${iconClass} text-red-500`} />
    case 'doc':
    case 'docx':
      return <BsFiletypeDocx className={`${iconClass} text-blue-500`} />
    case 'xls':
    case 'xlsx':
      return <BsFiletypeXlsx className={`${iconClass} text-green-600`} />
    case 'txt':
      return <BsFiletypeTxt className={`${iconClass} text-gray-500`} />
    case 'csv':
      return <BsFiletypeCsv className={`${iconClass} text-green-500`} />
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <BsFileEarmarkImage className={`${iconClass} text-purple-500`} />
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'mkv':
      return <BsFileEarmarkPlay className={`${iconClass} text-orange-500`} />
    default:
      return <FiFileText className={`${iconClass} text-muted-foreground`} />
  }
}

export function RAGList({ documents, onDownloadAllChunks, onDeleteDocument }: RAGListProps) {

  // Função para obter nome limpo do documento
  const getDocumentDisplayName = (doc: RAGDocument): string => {
    // Se tiver sourceFileName, usa ele sem extensão
    if (doc.sourceFileName) {
      return doc.sourceFileName.replace(/\.[^/.]+$/, '')
    }
    // Senão, limita o title a 50 caracteres
    return doc.title.length > 50 ? doc.title.substring(0, 50) + '...' : doc.title
  }

  return (
    <div className="flex flex-col h-full">
      {/* Documents List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
            <p className="text-center text-xs px-4">
              Nenhum documento na base ainda.
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <div 
              key={doc.id}
              className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/30 transition-all group"
            >
              {/* Ícone do tipo de arquivo */}
              <div className="flex-shrink-0">
                {getFileIcon(doc.sourceFileName)}
              </div>
              
              {/* Info do documento */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate" title={doc.sourceFileName || doc.title}>
                  {getDocumentDisplayName(doc)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {doc.chunks.length} chunk{doc.chunks.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              {/* Ações - sempre visíveis em telas pequenas */}
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => onDownloadAllChunks?.(doc)}
                  className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  title="Visualizar/Baixar documento"
                >
                  <FiFileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteDocument?.(doc.id)}
                  className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                  title="Deletar documento"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Summary compacto */}
      {documents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            {documents.length} documento{documents.length !== 1 ? 's' : ''} • {documents.reduce((sum, doc) => sum + doc.chunks.length, 0)} chunks
          </div>
        </div>
      )}
    </div>
  )
}