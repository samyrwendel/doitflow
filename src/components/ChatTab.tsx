import { ChatInterface } from './ChatInterface'
import { ChatMessage } from '../types'

interface Agent {
  id: string
  name: string
  prompt?: string
  model?: string
  isDefault?: boolean
}

interface ChatTabProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading: boolean
  onOpenPromptEditor?: () => void
  onOpenLLMConfig?: () => void
  onOpenConversations?: () => void
  onClearChat?: () => void
  agents?: Agent[]
  selectedAgentId?: string | null
  onAgentChange?: (agentId: string) => void
  selectedModel?: string
  onModelChange?: (model: string) => void
}

export function ChatTab({
  messages,
  onSendMessage,
  isLoading,
  onOpenPromptEditor,
  onOpenLLMConfig,
  onOpenConversations,
  onClearChat,
  agents,
  selectedAgentId,
  onAgentChange,
  selectedModel,
  onModelChange
}: ChatTabProps) {
  return (
    <div className="h-full overflow-hidden relative">
      <ChatInterface
        messages={messages}
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        agents={agents}
        selectedAgentId={selectedAgentId}
        onAgentChange={onAgentChange}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        onOpenPromptEditor={onOpenPromptEditor}
        onOpenLLMConfig={onOpenLLMConfig}
        onOpenConversations={onOpenConversations}
        onClearChat={onClearChat}
      />
    </div>
  )
}