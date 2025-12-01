import { useState, useEffect } from 'react'
import { FiZap, FiDollarSign, FiCpu, FiTrendingUp, FiDatabase, FiMessageSquare } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { ChatMessage } from '../types'

// SVG Icons para LLMs
const GroqIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 9.82l7 3.5v7.36l-7-3.5V9.82zm16 0v7.36l-7 3.5v-7.36l7-3.5z"/>
  </svg>
)

const GeminiIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L3.5 7.5v9L12 22l8.5-5.5v-9L12 2zm0 2.5l6.5 4.2v6.6L12 19.5l-6.5-4.2V8.7L12 4.5z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

interface UsageStats {
  embeddingsGenerated: number
  totalEmbeddingCost: number
  totalLLMCost: number
  totalCost: number
  requestsWithSemanticSearch: number
  requestsWithKeywordSearch: number
  requestsWithoutRAG: number
  totalRequests: number
  cacheSize: number
}

interface UsageStatsPanelProps {
  isExpanded: boolean
  onToggle: () => void
  messages: ChatMessage[]
}

export function UsageStatsPanel({ isExpanded, onToggle, messages }: UsageStatsPanelProps) {
  const { authenticatedFetch } = useAuth()
  const [stats, setStats] = useState<UsageStats | null>(null)

  const fetchStats = async () => {
    try {
      const response = await authenticatedFetch('/api/usage-stats')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStats(data.stats)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // Atualizar estatísticas quando houver novas mensagens
  useEffect(() => {
    if (messages.length > 0) {
      fetchStats()
    }
  }, [messages.length])

  const semanticPercentage = stats && stats.totalRequests > 0 
    ? ((stats.requestsWithSemanticSearch / stats.totalRequests) * 100).toFixed(0)
    : 0

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header compacto */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FiTrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Estatísticas de Uso</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            ${(stats?.totalCost ?? 0).toFixed(4)}
          </span>
          <span className={`text-xs transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <div className="p-3 border-t border-border">
          
          {/* Layout em 2 Colunas */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* Coluna Esquerda */}
            <div className="space-y-3">
              {/* Custo Total com Mini Gráfico Pizza */}
              <div className="relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg px-3 py-2.5 overflow-hidden">
                {/* Background animado */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent animate-pulse" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FiDollarSign className="w-4 h-4 text-green-500" />
                      <div className="text-xs text-muted-foreground">Custo Total</div>
                    </div>
                    {/* Mini gráfico de pizza */}
                    <div className="relative w-10 h-10">
                      <svg className="transform -rotate-90 w-10 h-10" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-secondary/30"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray={`${stats?.totalCost ? ((stats.totalEmbeddingCost / stats.totalCost) * 100) : 0} 100`}
                          className="text-blue-500 transition-all duration-1000 ease-out"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray={`${stats?.totalCost ? ((stats.totalLLMCost / stats.totalCost) * 100) : 0} 100`}
                          strokeDashoffset={`-${stats?.totalCost ? ((stats.totalEmbeddingCost / stats.totalCost) * 100) : 0}`}
                          className="text-purple-500 transition-all duration-1000 ease-out"
                        />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2.5">
                    ${(stats?.totalCost ?? 0).toFixed(4)}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] group cursor-help" title="Google Gemini - Embeddings">
                      <div className="flex items-center gap-1.5">
                        <GeminiIcon className="w-2.5 h-2.5 text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="text-muted-foreground">Embed</span>
                      </div>
                      <span className="font-medium">${(stats?.totalEmbeddingCost ?? 0).toFixed(4)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] group cursor-help" title="Groq - Large Language Model">
                      <div className="flex items-center gap-1.5">
                        <GroqIcon className="w-2.5 h-2.5 text-purple-500 group-hover:scale-110 transition-transform" />
                        <span className="text-muted-foreground">LLM</span>
                      </div>
                      <span className="font-medium">${(stats?.totalLLMCost ?? 0).toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid 2x2 - Otimizado Horizontal */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/30 rounded-lg p-2 flex items-center gap-2 hover:bg-secondary/50 transition-colors group cursor-help" title="Embeddings gerados">
                  <FiZap className="w-4 h-4 text-yellow-500 group-hover:animate-pulse flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold truncate">{stats?.embeddingsGenerated ?? 0}</div>
                    <div className="text-[9px] text-muted-foreground">embed</div>
                  </div>
                </div>
                
                <div className="bg-secondary/30 rounded-lg p-2 flex items-center gap-2 hover:bg-secondary/50 transition-colors group cursor-help" title="Embeddings em cache">
                  <FiCpu className="w-4 h-4 text-cyan-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold truncate">{stats?.cacheSize ?? 0}</div>
                    <div className="text-[9px] text-muted-foreground">cache</div>
                  </div>
                </div>
                
                <div className="bg-secondary/30 rounded-lg p-2 flex items-center gap-2 hover:bg-secondary/50 transition-colors group cursor-help" title="Buscas com RAG">
                  <FiDatabase className="w-4 h-4 text-blue-500 group-hover:rotate-12 transition-transform flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold truncate">{stats?.requestsWithSemanticSearch ?? 0}</div>
                    <div className="text-[9px] text-muted-foreground">RAG</div>
                  </div>
                </div>
                
                <div className="bg-secondary/30 rounded-lg p-2 flex items-center gap-2 hover:bg-secondary/50 transition-colors group cursor-help" title="Total de requisições">
                  <FiMessageSquare className="w-4 h-4 text-gray-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold truncate">{stats?.totalRequests ?? 0}</div>
                    <div className="text-[9px] text-muted-foreground">total</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita - Largura Total */}
            <div className="space-y-3">
              {/* Gráfico de Proporção - Coluna Inteira */}
              <div className="bg-secondary/30 rounded-lg p-2.5">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                  Proporção de Custos
                </div>
                <div className="space-y-2.5">
                  <div className="group cursor-help" title={`Google Gemini: $${(stats?.totalEmbeddingCost ?? 0).toFixed(4)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <GeminiIcon className="w-3 h-3 text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-medium">Embeddings</span>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {stats?.totalCost ? ((stats.totalEmbeddingCost / stats.totalCost) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-1000 ease-out group-hover:from-blue-500 group-hover:to-blue-600"
                        style={{ 
                          width: `${stats?.totalCost ? ((stats.totalEmbeddingCost / stats.totalCost) * 100) : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="group cursor-help" title={`Groq LLM: $${(stats?.totalLLMCost ?? 0).toFixed(4)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <GroqIcon className="w-3 h-3 text-purple-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-medium">LLM</span>
                      </div>
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                        {stats?.totalCost ? ((stats.totalLLMCost / stats.totalCost) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-400 to-purple-500 transition-all duration-1000 ease-out group-hover:from-purple-500 group-hover:to-purple-600"
                        style={{ 
                          width: `${stats?.totalCost ? ((stats.totalLLMCost / stats.totalCost) * 100) : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribuição de Buscas - Coluna Inteira */}
              <div className="bg-secondary/30 rounded-lg p-2.5">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                  Distribuição ({stats?.totalRequests ?? 0})
                </div>
                <div className="space-y-2">
                  {/* Gemini RAG */}
                  <div className="group cursor-help" title="Buscas com RAG semântico usando Gemini">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <FiZap className="w-3 h-3 text-yellow-500 group-hover:animate-pulse" />
                        <span className="text-[10px] font-medium">Gemini RAG</span>
                      </div>
                      <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                        {stats?.requestsWithSemanticSearch ?? 0}
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-1000 ease-out group-hover:from-yellow-500 group-hover:to-yellow-600"
                        style={{ width: `${semanticPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Keywords */}
                  {(stats?.requestsWithKeywordSearch ?? 0) > 0 && (
                    <div className="group cursor-help" title="Buscas por palavras-chave">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <FiDatabase className="w-3 h-3 text-blue-500 group-hover:rotate-12 transition-transform" />
                          <span className="text-[10px] font-medium">Keywords</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                          {stats?.requestsWithKeywordSearch ?? 0}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-1000 ease-out group-hover:from-blue-500 group-hover:to-blue-600"
                          style={{ 
                            width: `${(((stats?.requestsWithKeywordSearch ?? 0) / (stats?.totalRequests ?? 1)) * 100).toFixed(0)}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Chat Livre */}
                  {(stats?.requestsWithoutRAG ?? 0) > 0 && (
                    <div className="group cursor-help" title="Chat sem RAG">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <FiMessageSquare className="w-3 h-3 text-gray-500 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-medium">Chat Livre</span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                          {stats?.requestsWithoutRAG ?? 0}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-gray-400 to-gray-500 transition-all duration-1000 ease-out group-hover:from-gray-500 group-hover:to-gray-600"
                          style={{ 
                            width: `${(((stats?.requestsWithoutRAG ?? 0) / (stats?.totalRequests ?? 1)) * 100).toFixed(0)}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
