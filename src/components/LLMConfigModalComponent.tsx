import { FiX } from 'react-icons/fi'
import LLMConfigPanel from './LLMConfigPanel'

interface LLMConfigModalProps {
  isOpen: boolean
  onClose: () => void
  currentModel: string
  onModelChange: (model: string) => void
}

export function LLMConfigModal({
  isOpen,
  onClose,
  currentModel,
  onModelChange
}: LLMConfigModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[90vw] h-[85vh] max-w-4xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-card-foreground">Configurar LLM</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Fechar"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          <LLMConfigPanel
            currentModel={currentModel}
            onModelChange={onModelChange}
          />
        </div>
      </div>
    </div>
  )
}
