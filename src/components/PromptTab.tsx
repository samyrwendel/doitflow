import { PromptEditor } from './PromptEditor'
import { RAGDocument } from '../types'

interface PromptTabProps {
  prompt: string
  onChange: (prompt: string) => void
  ragDocuments: RAGDocument[]
  selectedRagId?: string
  onRagSelect: (ragId: string | null) => void
  ragIndex?: string
  promptSyncStatus: 'synced' | 'modified' | 'syncing'
  onSyncPrompt: () => void
  onOptimizePrompt?: (prompt: string) => Promise<void>
  isOptimizing?: boolean
  currentLLMModel?: string
}

export function PromptTab({ 
  prompt,
  onChange,
  ragDocuments,
  selectedRagId,
  onRagSelect,
  ragIndex,
  promptSyncStatus,
  onSyncPrompt,
  onOptimizePrompt,
  isOptimizing
}: PromptTabProps) {
  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      <div className="flex-1 p-4 overflow-y-auto">
        <PromptEditor
          prompt={prompt}
          onChange={onChange}
          ragDocuments={ragDocuments}
          selectedRagId={selectedRagId}
          onRagSelect={onRagSelect}
          ragIndex={ragIndex}
          promptSyncStatus={promptSyncStatus}
          onSyncPrompt={onSyncPrompt}
          onOptimizePrompt={onOptimizePrompt}
          isOptimizing={isOptimizing}
        />
      </div>
    </div>
  )
}