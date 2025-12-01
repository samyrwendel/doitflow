import React, { useState, useRef, useEffect } from 'react'
import { FiSend, FiMessageCircle, FiZap, FiClock, FiCpu, FiLayers, FiTarget, FiSmartphone, FiUser, FiCheck, FiImage, FiEdit3, FiSettings, FiTrash2 } from 'react-icons/fi'
import { TbCoin } from 'react-icons/tb'
import ReactMarkdown from 'react-markdown'
import { ChatMessage } from '../types'
import { formatTimestamp } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'

interface Agent {
  id: string
  name: string
  prompt?: string
  model?: string
  isDefault?: boolean
}

interface ChatInterfaceProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading: boolean
  agents?: Agent[]
  selectedAgentId?: string | null
  onAgentChange?: (agentId: string) => void
  selectedModel?: string
  onModelChange?: (model: string) => void
  onOpenPromptEditor?: () => void
  onOpenLLMConfig?: () => void
  onOpenConversations?: () => void
  onClearChat?: () => void
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  agents = [],
  selectedAgentId,
  onAgentChange,
  selectedModel = 'gemini-2.5-flash',
  onModelChange,
  onOpenPromptEditor,
  onOpenLLMConfig,
  onOpenConversations,
  onClearChat
}: ChatInterfaceProps) {
  const { theme } = useTheme()
  const [inputValue, setInputValue] = useState('')
  const [expandedChunks, setExpandedChunks] = useState<string | null>(null)
  const [expandedToolDetails, setExpandedToolDetails] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const models = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Rápido e econômico' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Versão anterior' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Groq (Fallback)' }
  ]

  // Auto-foco no input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim())
      setInputValue('')
      
      // Retorna o foco para o input após enviar
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }

  return (
    <div 
      className="flex flex-col h-full relative overflow-hidden"
      style={{
        backgroundColor: theme === 'light' ? '#d2d7de' : undefined
      }}
    >
      {/* Background Layer */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: theme === 'dark' 
            ? 'url(https://camo.githubusercontent.com/ebf18cd85f7aa9dc79fb74c58dc94febf3a6441d8d689cd5a400b2707e19ec0e/68747470733a2f2f7765622e77686174736170702e636f6d2f696d672f62672d636861742d74696c652d6461726b5f61346265353132653731393562366237333364393131306234303866303735642e706e67)'
            : 'url(https://i.pinimg.com/736x/1a/60/06/1a6006376501139749dc1d52da0deee5.jpg)',
          backgroundRepeat: 'repeat',
          backgroundSize: 'auto',
          backgroundPosition: 'center',
          opacity: theme === 'dark' ? 0.05 : 0.1,
          zIndex: 0
        }}
      />
      
      {/* Barra Topo - Dropdowns + Botões de Ação */}
      <div 
        className="flex items-center gap-2 p-3 border-b border-border relative z-20 bg-card"
        style={{
          backgroundColor: theme === 'light' ? '#ffffff' : undefined
        }}
      >
        {/* Dropdown Agente */}
        <div className="flex-1">
          <select
            value={selectedAgentId || ''}
            onChange={(e) => onAgentChange?.(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-card/60 border border-border/50 rounded-lg
                     text-foreground hover:bg-card/80 focus:outline-none focus:ring-2 focus:ring-primary/50
                     transition-all cursor-pointer appearance-none pr-8
                     backdrop-blur-sm"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '12px'
            }}
          >
            {agents.length === 0 && <option value="">Nenhum agente</option>}
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown Modelo */}
        <div className="flex-1">
          <select
            value={selectedModel}
            onChange={(e) => onModelChange?.(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-card/60 border border-border/50 rounded-lg
                     text-foreground hover:bg-card/80 focus:outline-none focus:ring-2 focus:ring-primary/50
                     transition-all cursor-pointer appearance-none pr-8
                     backdrop-blur-sm"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '12px'
            }}
          >
            {models.map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* Botões de Ação - Direita */}
        <div className="flex gap-2 ml-2">
          {onClearChat && messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Tem certeza que deseja limpar todo o histórico de chat? Esta ação não pode ser desfeita.')) {
                  onClearChat()
                }
              }}
              className="p-2 bg-card/60 border border-border/50 rounded-lg
                       text-red-400 hover:bg-red-500/20 hover:border-red-500/50
                       focus:outline-none focus:ring-2 focus:ring-red-500/50
                       transition-all backdrop-blur-sm"
              title="Limpar Chat"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          )}
          {onOpenConversations && (
            <button
              onClick={onOpenConversations}
              className="p-2 bg-card/60 border border-border/50 rounded-lg
                       text-foreground hover:bg-card/80 hover:border-primary/50
                       focus:outline-none focus:ring-2 focus:ring-primary/50
                       transition-all backdrop-blur-sm"
              title="Histórico de Conversas"
            >
              <FiClock className="w-4 h-4" />
            </button>
          )}
          {onOpenLLMConfig && (
            <button
              onClick={onOpenLLMConfig}
              className="p-2 bg-card/60 border border-border/50 rounded-lg
                       text-foreground hover:bg-card/80 hover:border-primary/50
                       focus:outline-none focus:ring-2 focus:ring-primary/50
                       transition-all backdrop-blur-sm"
              title="Configurar LLM"
            >
              <FiSettings className="w-4 h-4" />
            </button>
          )}
          {onOpenPromptEditor && (
            <button
              onClick={onOpenPromptEditor}
              className="p-2 bg-card/60 border border-border/50 rounded-lg
                       text-foreground hover:bg-card/80 hover:border-primary/50
                       focus:outline-none focus:ring-2 focus:ring-primary/50
                       transition-all backdrop-blur-sm"
              title="Editor de Prompt"
            >
              <FiEdit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Messages Container */}
      <div 
        className="flex-1 overflow-y-auto p-4 pr-20 space-y-4 relative"
        style={{
          zIndex: 1
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full relative z-10">
            {/* Empty state sem texto */}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} relative z-10`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                    
                    {/* Imagem gerada pelo Imagen */}
                    {message.metadata?.imageData && (
                      <div className="mt-4 rounded-lg overflow-hidden border-2 border-purple-500/30">
                        <img 
                          src={`data:image/${message.metadata.imageFormat || 'png'};base64,${message.metadata.imageData}`}
                          alt={message.metadata.prompt || "Imagem gerada por IA"}
                          className="w-full h-auto"
                        />
                        {message.metadata.prompt && (
                          <div className="bg-black/40 px-3 py-2 text-xs text-purple-200">
                            <strong>Prompt:</strong> {message.metadata.prompt}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                )}
                
                {/* Métricas de Busca Semântica */}
                {/* Metadata compacta em uma linha */}
                {message.metadata && message.role === 'assistant' && (
                  <div className="mt-2 pt-2 border-t border-current/10">
                    <div className="flex items-center gap-2 text-xs opacity-70">
                      {/* Método de Busca */}
                      {message.metadata.searchMethod && (
                        <span className="font-medium" title={
                          message.metadata.searchMethod === 'semantic' 
                            ? 'Busca semântica com embeddings do Google Gemini' 
                            : message.metadata.searchMethod === 'keyword' 
                            ? 'Busca por palavras-chave' 
                            : 'Chat livre sem base de conhecimento'
                        }>
                          {message.metadata.searchMethod === 'semantic' ? (
                            <><FiZap className="w-3 h-3 inline text-yellow-400" /> Gemini RAG</>
                          ) : message.metadata.searchMethod === 'keyword' ? (
                            <><FiCpu className="w-3 h-3 inline" /> Keywords</>
                          ) : (
                            <><FiMessageCircle className="w-3 h-3 inline" /> Chat Livre</>
                          )}
                        </span>
                      )}
                      
                      {/* Chunks - agora clicável */}
                      {message.metadata.chunksUsed !== undefined && message.metadata.chunks && (
                        <button
                          onClick={() => setExpandedChunks(expandedChunks === message.id ? null : message.id)}
                          className="hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                          title="Clique para ver os trechos do documento utilizados"
                        >
                          <FiLayers className="w-3 h-3 inline" /> {message.metadata.chunksUsed}
                        </button>
                      )}
                      
                      {/* Ferramenta usada - clicável */}
                      {message.metadata.toolUsed && (
                        <button
                          onClick={() => setExpandedToolDetails(expandedToolDetails === message.id ? null : message.id)}
                          className={`${message.metadata.toolUsed === 'nano_banana' || message.metadata.toolUsed === 'dall-e-3' || message.metadata.toolUsed === 'imagen_3' ? 'text-purple-400' : 'text-green-400'} hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors cursor-pointer`}
                          title="Clique para ver detalhes da ferramenta"
                        >
                          {message.metadata.toolUsed === 'evolution_api' ? (
                            <><FiMessageCircle className="w-3 h-3 inline" /> WhatsApp</>
                          ) : message.metadata.toolUsed === 'nano_banana' ? (
                            <><FiImage className="w-3 h-3 inline" /> Nano Banana 🍌</>
                          ) : message.metadata.toolUsed === 'dall-e-3' ? (
                            <><FiImage className="w-3 h-3 inline" /> DALL-E 3</>
                          ) : message.metadata.toolUsed === 'imagen_3' ? (
                            <><FiImage className="w-3 h-3 inline" /> Imagen 3</>
                          ) : (
                            <><FiCpu className="w-3 h-3 inline" /> {message.metadata.toolUsed}</>
                          )}
                        </button>
                      )}
                      
                      {/* Dispositivo usado */}
                      {message.metadata.deviceUsed && (
                        <span title={`Dispositivo: ${message.metadata.deviceUsed}`}>
                          <FiSmartphone className="w-3 h-3 inline" /> {message.metadata.deviceUsed}
                        </span>
                      )}
                      
                      {/* Destinatário e número */}
                      {message.metadata.recipient && (
                        <span title={`Destinatário: ${message.metadata.recipient}${message.metadata.number ? ` (${message.metadata.number})` : ''}`}>
                          <FiUser className="w-3 h-3 inline" /> {message.metadata.recipient}
                        </span>
                      )}
                      
                      {/* Similaridade */}
                      {message.metadata.similarityScore !== undefined && (
                        <span title="Percentual de relevância do trecho mais similar à sua pergunta">
                          <FiTarget className="w-3 h-3 inline" /> {(message.metadata.similarityScore * 100).toFixed(0)}%
                        </span>
                      )}
                      
                      {/* Tempo */}
                      {message.metadata.processingTime !== undefined && (
                        <span title="Tempo de processamento da resposta">
                          <FiClock className="w-3 h-3 inline" /> {message.metadata.processingTime}ms
                        </span>
                      )}
                      
                      {/* Custo */}
                      {message.metadata.cost !== undefined && message.metadata.cost > 0 && (
                        <span className="text-green-400" title="Custo total desta resposta (Embeddings + LLM)">
                          <TbCoin className="w-3 h-3 inline" /> ${message.metadata.cost.toFixed(4)}
                        </span>
                      )}
                      
                      {/* Modelo e Timestamp */}
                      {message.metadata.model && <span title="Modelo de linguagem utilizado">• {message.metadata.model}</span>}
                      <span title={new Date(message.timestamp).toLocaleString('pt-BR')}>• {formatTimestamp(message.timestamp)}</span>
                    </div>
                  </div>
                )}
                
                {/* Chunks expandidos */}
                {message.metadata?.chunks && expandedChunks === message.id && (
                  <div className="mt-3 space-y-2 border-t border-current/10 pt-3">
                    <div className="text-xs font-medium opacity-80 mb-2 flex items-center gap-1.5">
                      <FiLayers className="w-3 h-3" /> Trechos do documento utilizados (ordenados por relevância):
                    </div>
                    {message.metadata.chunks.map((chunk, index) => {
                      const similarity = message.metadata?.chunksSimilarity?.[index];
                      return (
                        <div key={index} className="bg-black/20 rounded p-3 text-xs relative">
                          <div className="mb-2">
                            <span className="font-medium opacity-70">
                              Trecho {index + 1}
                            </span>
                          </div>
                          <p className="opacity-80 whitespace-pre-wrap leading-relaxed mb-1">
                            {chunk.length > 300 ? `${chunk.substring(0, 300)}...` : chunk}
                          </p>
                          {similarity !== undefined && (
                            <div className="flex justify-end mt-2">
                              <span className="text-green-400 text-[10px] font-medium" title="Relevância deste trecho">
                                <FiTarget className="w-2.5 h-2.5 inline" /> {(similarity * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Detalhes da ferramenta expandidos */}
                {message.metadata?.toolUsed && expandedToolDetails === message.id && (
                  <div className="mt-3 border-t border-current/10 pt-3">
                    <div className={`text-xs font-semibold mb-3 flex items-center gap-2 ${message.metadata.toolUsed === 'dall-e-3' || message.metadata.toolUsed === 'imagen_3' ? 'text-purple-400' : 'text-green-400'}`}>
                      {message.metadata.toolUsed === 'dall-e-3' ? (
                        <><FiImage className="w-4 h-4" /> Detalhes da Ferramenta: DALL-E 3</>
                      ) : message.metadata.toolUsed === 'imagen_3' ? (
                        <><FiImage className="w-4 h-4" /> Detalhes da Ferramenta: Imagen 3</>
                      ) : (
                        <><FiMessageCircle className="w-4 h-4" /> Detalhes da Ferramenta: WhatsApp</>
                      )}
                    </div>
                    
                    {/* Painel WhatsApp */}
                    {message.metadata.toolUsed === 'evolution_api' && (
                      <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4 text-xs space-y-3">
                        {/* Comando/Ação */}
                        <div>
                          <div className="font-semibold text-green-300 mb-1.5 flex items-center gap-1.5">
                            <FiZap className="w-3.5 h-3.5" /> Comando:
                          </div>
                          <code className="bg-black/40 text-green-200 px-3 py-1.5 rounded block font-mono">
                            WHATSAPP_SEND
                          </code>
                        </div>
                        
                        {/* Dispositivo */}
                        {message.metadata.deviceUsed && (
                          <div>
                            <div className="font-semibold text-blue-300 mb-1.5 flex items-center gap-1.5">
                              <FiSmartphone className="w-3.5 h-3.5" /> Dispositivo:
                            </div>
                            <div className="bg-black/40 text-blue-200 px-3 py-1.5 rounded">
                              {message.metadata.deviceUsed}
                            </div>
                          </div>
                        )}
                        
                        {/* Destinatário */}
                        {message.metadata.recipient && (
                          <div>
                            <div className="font-semibold text-purple-300 mb-1.5 flex items-center gap-1.5">
                              <FiUser className="w-3.5 h-3.5" /> Destinatário:
                            </div>
                            <div className="bg-black/40 text-purple-200 px-3 py-1.5 rounded">
                              {message.metadata.recipient}
                              {message.metadata.number && (
                                <span className="ml-2 text-emerald-300 font-mono">({message.metadata.number})</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Mensagem enviada */}
                        {message.metadata.sentMessage && (
                          <div>
                            <div className="font-semibold text-amber-300 mb-1.5 flex items-center gap-1.5">
                              <FiMessageCircle className="w-3.5 h-3.5" /> Mensagem Enviada:
                            </div>
                            <div className="bg-black/40 text-amber-100 px-3 py-2.5 rounded whitespace-pre-wrap leading-relaxed">
                              {message.metadata.sentMessage}
                            </div>
                          </div>
                        )}
                        
                        {/* Status */}
                        <div>
                          <div className="font-semibold text-emerald-300 mb-1.5 flex items-center gap-1.5">
                            <FiCheck className="w-3.5 h-3.5" /> Status:
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5">
                              <FiCheck className="w-3 h-3" /> Enviado com sucesso
                            </span>
                            {message.metadata.processingTime && (
                              <span className="text-gray-400 text-[10px]">
                                em {message.metadata.processingTime}ms
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Painel DALL-E 3, Imagen 3 ou Nano Banana */}
                    {(message.metadata.toolUsed === 'dall-e-3' || message.metadata.toolUsed === 'imagen_3' || message.metadata.toolUsed === 'nano_banana') && (
                      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4 text-xs space-y-3">
                        {/* Prompt usado */}
                        {message.metadata.prompt && (
                          <div>
                            <div className="font-semibold text-purple-300 mb-1.5 flex items-center gap-1.5">
                              <FiZap className="w-3.5 h-3.5" /> Prompt Original:
                            </div>
                            <div className="bg-black/40 text-purple-100 px-3 py-2.5 rounded whitespace-pre-wrap leading-relaxed">
                              {message.metadata.prompt}
                            </div>
                          </div>
                        )}
                        
                        {/* Prompt revisado (DALL-E otimiza automaticamente, Nano Banana não) */}
                        {message.metadata.toolUsed !== 'nano_banana' && message.metadata.revisedPrompt && (
                          <div>
                            <div className="font-semibold text-fuchsia-300 mb-1.5 flex items-center gap-1.5">
                              <FiZap className="w-3.5 h-3.5" /> Prompt Otimizado (DALL-E):
                            </div>
                            <div className="bg-black/40 text-fuchsia-100 px-3 py-2.5 rounded whitespace-pre-wrap leading-relaxed text-[11px] italic">
                              {message.metadata.revisedPrompt}
                            </div>
                          </div>
                        )}
                        
                        {/* Formato da imagem */}
                        {message.metadata.imageFormat && (
                          <div>
                            <div className="font-semibold text-pink-300 mb-1.5 flex items-center gap-1.5">
                              <FiImage className="w-3.5 h-3.5" /> Formato:
                            </div>
                            <div className="bg-black/40 text-pink-200 px-3 py-1.5 rounded uppercase">
                              {message.metadata.imageFormat} • 1024x1024 • {
                                message.metadata.toolUsed === 'nano_banana' 
                                  ? 'Nano Banana 🍌' 
                                  : message.metadata.toolUsed === 'dall-e-3'
                                  ? 'DALL-E 3 HD'
                                  : 'Imagen 3'
                              }
                            </div>
                          </div>
                        )}
                        
                        {/* Status */}
                        <div>
                          <div className="font-semibold text-emerald-300 mb-1.5 flex items-center gap-1.5">
                            <FiCheck className="w-3.5 h-3.5" /> Status:
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5">
                              <FiCheck className="w-3 h-3" /> Imagem gerada com sucesso
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Timestamp para mensagens do usuário */}
                {message.role === 'user' && (
                  <p className="text-xs opacity-70 mt-2">
                    {formatTimestamp(message.timestamp)}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary text-secondary-foreground rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                <span>Digitando...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-border relative bg-card" style={{ zIndex: 2 }}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              adjustTextareaHeight()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1 resize-none rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[120px]"
            style={{ backgroundColor: 'hsl(var(--input-bg, var(--background)))' }}
            disabled={isLoading}
            rows={1}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <FiSend className="w-4 h-4" />
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}