import { useState, useEffect, useRef } from 'react'
import { FiMessageSquare, FiTrash2, FiUser, FiClock, FiX, FiCopy, FiCheck, FiAlertCircle } from 'react-icons/fi'
import { RiRobot2Line } from 'react-icons/ri'
import { BsCheckAll } from 'react-icons/bs'
import { useAuth } from '../contexts/AuthContext'

interface Conversation {
  id: string
  client_id: string
  user_id: string
  username: string
  contact_name?: string
  contact_picture?: string
  phone_number?: string
  created_at: string
  updated_at: string
  last_message_at: string
  message_count: number
  last_user_message: string
  last_assistant_message: string
}

interface Message {
  id: string
  conversation_id: string
  client_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  metadata: any
}

interface ConversationsPanelProps {
  isOpen: boolean
  onClose: () => void
  agentId?: string | null
}

export function ConversationsPanel({ isOpen, onClose, agentId }: ConversationsPanelProps) {
  const { authenticatedFetch } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadConversations()
    }
  }, [isOpen, agentId])

  // Scroll para última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const loadConversations = async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (agentId) {
        const response = await authenticatedFetch(`/api/agents/${agentId}/sessions`)

        if (!response.ok) {
          throw new Error('Erro ao carregar sessões do agente')
        }

        const data = await response.json()

        const mappedConversations = (data.data || []).map((session: any) => ({
          id: session.id,
          client_id: session.id,
          user_id: session.user_id,
          username: session.username || 'Usuário',
          created_at: session.created_at,
          updated_at: session.updated_at,
          last_message_at: session.last_message_at || session.updated_at,
          message_count: session.message_count || 0,
          last_user_message: '',
          last_assistant_message: ''
        }))

        setConversations(mappedConversations)
      } else {
        const response = await authenticatedFetch('/api/webhook/conversations')

        if (!response.ok) {
          throw new Error('Erro ao carregar conversas')
        }

        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao carregar conversas:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setIsLoading(true)
    setError(null)

    try {
      if (agentId) {
        const response = await authenticatedFetch(
          `/api/agents/${agentId}/messages?sessionId=${conversation.id}`
        )

        if (!response.ok) {
          throw new Error('Erro ao carregar mensagens')
        }

        const data = await response.json()

        const mappedMessages = (data.data || []).map((msg: any) => ({
          id: msg.id,
          conversation_id: conversation.id,
          client_id: conversation.id,
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
          metadata: msg.metadata
        }))

        setMessages(mappedMessages)
      } else {
        const response = await authenticatedFetch(
          `/api/webhook/conversations/${conversation.id}/messages`
        )

        if (!response.ok) {
          throw new Error('Erro ao carregar mensagens')
        }

        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao carregar mensagens:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta conversa?')) return

    try {
      const response = await authenticatedFetch(
        `/api/webhook/conversations/${conversationId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Erro ao deletar conversa')
      }

      setConversations(prev => prev.filter(c => c.id !== conversationId))

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null)
        setMessages([])
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Erro ao deletar conversa:', err)
    }
  }

  const deleteAllConversations = async () => {
    if (!confirm(`Tem certeza que deseja apagar TODAS as ${conversations.length} conversas? Esta ação não pode ser desfeita.`)) return

    setIsDeletingAll(true)
    setError(null)

    try {
      // Deletar cada conversa
      for (const conv of conversations) {
        await authenticatedFetch(
          `/api/webhook/conversations/${conv.id}`,
          { method: 'DELETE' }
        )
      }

      setConversations([])
      setSelectedConversation(null)
      setMessages([])
    } catch (err: any) {
      setError('Erro ao apagar algumas conversas')
      console.error('Erro ao deletar todas conversas:', err)
      loadConversations() // Recarrega para mostrar estado atual
    } finally {
      setIsDeletingAll(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Ontem'
    } else if (days < 7) {
      return `${days} dias atrás`
    } else {
      return date.toLocaleDateString('pt-BR')
    }
  }

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const copyClientId = (clientId: string) => {
    navigator.clipboard.writeText(clientId)
    setCopiedClientId(clientId)
    setTimeout(() => setCopiedClientId(null), 2000)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal Container - Estilo WhatsApp */}
      <div className="fixed inset-4 md:inset-8 lg:inset-12 z-50 flex items-center justify-center">
        <div className="bg-[#111b21] rounded-xl shadow-2xl w-full h-full flex overflow-hidden">

          {/* Sidebar - Lista de Conversas */}
          <div className="w-80 lg:w-96 border-r border-[#222d34] flex flex-col bg-[#111b21]">

            {/* Header da Sidebar */}
            <div className="px-4 py-3 bg-[#202c33] flex items-center justify-between">
              <h2 className="text-white font-semibold">Conversas</h2>
              <div className="flex items-center gap-2">
                {conversations.length > 0 && (
                  <button
                    onClick={deleteAllConversations}
                    disabled={isDeletingAll}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    title="Apagar todas as conversas"
                  >
                    {isDeletingAll ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400"></div>
                        Apagando...
                      </>
                    ) : (
                      <>
                        <FiTrash2 className="w-3.5 h-3.5" />
                        Apagar Todas
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[#374248] rounded-full transition-colors"
                  title="Fechar"
                >
                  <FiX className="w-5 h-5 text-[#aebac1]" />
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="mx-3 mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* Lista de Conversas */}
            <div className="flex-1 overflow-y-auto">
              {isLoading && conversations.length === 0 ? (
                <div className="p-8 text-center text-[#8696a0]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6] mx-auto mb-3"></div>
                  Carregando...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-[#8696a0]">
                  <FiMessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma conversa ainda</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`px-3 py-3 cursor-pointer transition-colors border-b border-[#222d34] hover:bg-[#202c33] ${
                      selectedConversation?.id === conv.id ? 'bg-[#2a3942]' : ''
                    }`}
                    onClick={() => loadMessages(conv)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      {conv.contact_picture ? (
                        <img
                          src={conv.contact_picture}
                          alt={conv.contact_name || conv.username || 'Contato'}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          onError={(e) => {
                            // Fallback para ícone se imagem falhar
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-12 h-12 rounded-full bg-[#3b82f6] flex items-center justify-center flex-shrink-0 ${conv.contact_picture ? 'hidden' : ''}`}>
                        <FiUser className="w-6 h-6 text-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium truncate">
                            {conv.contact_name || conv.username || conv.phone_number || 'Usuário'}
                          </span>
                          <span className="text-[#8696a0] text-xs flex-shrink-0 ml-2">
                            {formatDate(conv.last_message_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[#8696a0] text-sm truncate flex-1">
                            {conv.last_assistant_message || conv.last_user_message || `${conv.message_count} mensagens`}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteConversation(conv.id)
                            }}
                            className="p-1.5 hover:bg-red-500/20 rounded-full transition-colors flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100"
                            title="Deletar conversa"
                          >
                            <FiTrash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Área de Chat - Estilo WhatsApp */}
          <div className="flex-1 flex flex-col bg-[#0b141a]">
            {!selectedConversation ? (
              /* Estado Vazio */
              <div className="flex-1 flex flex-col items-center justify-center bg-[#222e35]">
                <div className="w-64 h-64 mb-8">
                  <svg viewBox="0 0 303 172" className="w-full h-full opacity-20">
                    <path fill="#8696a0" d="M229.565 160.229c-1.556.522-3.147.96-4.763 1.327-2.354.534-4.769.898-7.214 1.088-7.062.552-14.24-.042-21.217-1.754a46.68 46.68 0 01-18.892-9.092 48.36 48.36 0 01-13.476-18.15c-2.717-6.052-4.376-12.726-4.875-19.656-.128-1.774-.145-3.548-.053-5.311.275-5.295 1.196-10.537 2.764-15.632a48.04 48.04 0 013.696-9.065 47.84 47.84 0 018.544-11.565c5.26-5.24 11.47-9.335 18.209-12.166a48.34 48.34 0 0116.193-4.117c1.812-.147 3.64-.213 5.472-.198 5.504.044 10.932.749 16.17 2.083a46.7 46.7 0 0115.558 6.845 48.2 48.2 0 0110.89 10.156 47.2 47.2 0 016.632 11.23c2.9 6.488 4.645 13.485 5.138 20.665.253 3.655.26 7.313.03 10.952-.555 8.788-2.602 17.326-5.991 25.322a45.2 45.2 0 01-8.07 12.83 46.54 46.54 0 01-24.524 14.928zm-14.572-45.527a1.15 1.15 0 01.11-.062l.059-.033c.098-.056.193-.115.285-.177.075-.05.148-.103.218-.159a1.01 1.01 0 00.153-.14 1.05 1.05 0 00.173-.223.96.96 0 00.096-.253.9.9 0 00.028-.284 1 1 0 00-.03-.27 1.1 1.1 0 00-.16-.363 1.3 1.3 0 00-.287-.293 1.6 1.6 0 00-.148-.103c-.074-.047-.149-.091-.225-.133a2.5 2.5 0 00-.283-.139 3.5 3.5 0 00-.353-.135 6.2 6.2 0 00-.425-.13c-.327-.088-.675-.16-1.035-.218a11.8 11.8 0 00-2.152-.152c-.673.005-1.33.061-1.968.164a9.3 9.3 0 00-1.748.43c-.526.177-1.007.396-1.446.656a6.3 6.3 0 00-1.032.751 4.9 4.9 0 00-.802.898 4 4 0 00-.536 1.089 3.8 3.8 0 00-.186 1.21c.002.404.064.79.19 1.158.121.355.302.685.533.988.227.298.503.569.82.808.296.224.626.42.985.59.337.16.697.295 1.074.406.371.109.758.195 1.154.258.408.066.824.11 1.242.132.434.023.866.024 1.294.003a12.5 12.5 0 001.269-.115c.396-.055.776-.129 1.14-.222.351-.088.683-.196.997-.32.302-.121.585-.257.848-.408.252-.144.487-.303.706-.478.21-.169.405-.35.585-.544.173-.188.331-.387.474-.596a3.6 3.6 0 00.331-.612 2.9 2.9 0 00.197-.605c.013-.056.026-.114.037-.173.016-.09.027-.178.034-.267a1 1 0 00-.01-.227 1 1 0 00-.075-.239.9.9 0 00-.137-.206 1 1 0 00-.194-.168 1.2 1.2 0 00-.24-.125 1.5 1.5 0 00-.272-.079 2 2 0 00-.283-.036 2.7 2.7 0 00-.277.004c-.178.01-.344.038-.5.083zm-16.872-10.166c.013.008.027.016.041.024a.7.7 0 00.115.055c.025.01.05.019.077.025a.6.6 0 00.161.015c.039-.003.075-.009.11-.018a.5.5 0 00.093-.035.4.4 0 00.077-.05.4.4 0 00.06-.063.4.4 0 00.043-.073.4.4 0 00.026-.08.4.4 0 00.006-.083.4.4 0 00-.015-.086.5.5 0 00-.039-.083.5.5 0 00-.062-.076.6.6 0 00-.083-.067.7.7 0 00-.1-.054.9.9 0 00-.115-.04c-.04-.012-.082-.02-.124-.026a1.1 1.1 0 00-.131-.01 1.3 1.3 0 00-.135.007 1.2 1.2 0 00-.13.023 1 1 0 00-.118.04.8.8 0 00-.101.053.7.7 0 00-.08.063.6.6 0 00-.059.07.5.5 0 00-.038.074.4.4 0 00-.018.073.4.4 0 00.001.07.4.4 0 00.02.065.4.4 0 00.037.058.4.4 0 00.052.05.5.5 0 00.065.04.6.6 0 00.076.032c.027.01.056.018.086.024.031.006.063.01.096.012.033.002.067.002.1-.001a.9.9 0 00.102-.012c.034-.006.066-.015.098-.026z"></path>
                  </svg>
                </div>
                <h3 className="text-white text-2xl font-light mb-2">DoitFlow para Desktop</h3>
                <p className="text-[#8696a0] text-sm text-center max-w-md">
                  Selecione uma conversa à esquerda para visualizar as mensagens
                </p>
              </div>
            ) : (
              <>
                {/* Header do Chat */}
                <div className="px-4 py-2 bg-[#202c33] flex items-center gap-3 border-b border-[#222d34]">
                  {selectedConversation.contact_picture ? (
                    <img
                      src={selectedConversation.contact_picture}
                      alt={selectedConversation.contact_name || selectedConversation.username || 'Contato'}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-10 h-10 rounded-full bg-[#3b82f6] flex items-center justify-center ${selectedConversation.contact_picture ? 'hidden' : ''}`}>
                    <FiUser className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium">
                      {selectedConversation.contact_name || selectedConversation.username || selectedConversation.phone_number || 'Usuário'}
                    </h3>
                    <button
                      className="text-[#8696a0] text-xs hover:text-[#3b82f6] flex items-center gap-1 transition-colors"
                      onClick={() => copyClientId(selectedConversation.client_id)}
                    >
                      {copiedClientId === selectedConversation.client_id ? (
                        <>
                          <FiCheck className="w-3 h-3 text-[#3b82f6]" />
                          <span className="text-[#3b82f6]">ID copiado!</span>
                        </>
                      ) : (
                        <>
                          <FiCopy className="w-3 h-3" />
                          <span className="font-mono">{selectedConversation.client_id}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-[#8696a0] text-sm">
                    {selectedConversation.message_count} mensagens
                  </div>
                </div>

                {/* Área de Mensagens - Background WhatsApp */}
                <div
                  className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23111b21' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundColor: '#0b141a'
                  }}
                >
                  {messages.map((msg, index) => {
                    const isUser = msg.role === 'user'
                    const showAvatar = index === 0 || messages[index - 1]?.role !== msg.role

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-2' : ''}`}
                      >
                        <div
                          className={`max-w-[65%] relative ${
                            isUser
                              ? 'bg-[#1d4ed8] rounded-lg rounded-tr-none'
                              : 'bg-[#202c33] rounded-lg rounded-tl-none'
                          } px-3 py-2 shadow-sm`}
                        >
                          {/* Triângulo do balão */}
                          {showAvatar && (
                            <div
                              className={`absolute top-0 w-0 h-0 ${
                                isUser
                                  ? 'right-0 translate-x-full border-l-8 border-l-[#1d4ed8] border-t-8 border-t-transparent border-b-0'
                                  : 'left-0 -translate-x-full border-r-8 border-r-[#202c33] border-t-8 border-t-transparent border-b-0'
                              }`}
                            />
                          )}

                          {/* Conteúdo */}
                          <p className="text-[#e9edef] text-sm whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>

                          {/* Hora e Status */}
                          <div className={`flex items-center justify-end gap-1 mt-1 ${isUser ? '-mr-1' : ''}`}>
                            <span className="text-[10px] text-[#8696a0]">
                              {formatMessageTime(msg.created_at)}
                            </span>
                            {isUser && (
                              <BsCheckAll className="w-4 h-4 text-[#53bdeb]" />
                            )}
                          </div>

                          {/* Metadata (se houver) */}
                          {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1">
                              {msg.metadata.searchMethod && (
                                <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-[#8696a0]">
                                  {msg.metadata.searchMethod}
                                </span>
                              )}
                              {msg.metadata.chunksUsed && (
                                <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-[#8696a0]">
                                  {msg.metadata.chunksUsed} chunks
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
