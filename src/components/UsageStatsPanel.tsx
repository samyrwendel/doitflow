import { useState, useEffect, useRef } from 'react'
import { FiZap, FiDollarSign, FiCpu, FiTrendingUp, FiDatabase } from 'react-icons/fi'
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

// Componente de Barra Animada (líquido preenchendo)
const AnimatedBar = ({ 
  percentage, 
  color, 
  delay = 0 
}: { 
  percentage: number
  color: string
  delay?: number 
}) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0)
  const hasAnimated = useRef(false)
  
  useEffect(() => {
    if (!hasAnimated.current) {
      const timeout = setTimeout(() => {
        setAnimatedPercentage(percentage)
        hasAnimated.current = true
      }, delay)
      return () => clearTimeout(timeout)
    } else {
      // Atualiza sem animação após primeira vez
      setAnimatedPercentage(percentage)
    }
  }, [percentage, delay])
  
  return (
    <div className="h-4 bg-secondary/70 rounded-full overflow-hidden relative">
      <div 
        className={`h-full ${color} rounded-full transition-all duration-[1500ms] ease-out`}
        style={{ width: `${animatedPercentage}%` }}
      />
    </div>
  )
}

// Componente de Gráfico de Pizza Animado
const AnimatedPieChart = ({ 
  embeddingPercentage, 
  llmPercentage 
}: { 
  embeddingPercentage: number
  llmPercentage: number 
}) => {
  const [animated, setAnimated] = useState(false)
  
  useEffect(() => {
    const timeout = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(timeout)
  }, [])
  
  const circumference = 2 * Math.PI * 40
  const embeddingLength = animated ? (embeddingPercentage / 100) * circumference : 0
  const llmLength = animated ? (llmPercentage / 100) * circumference : 0
  
  return (
    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
      {/* Background circle */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="currentColor"
        strokeWidth="20"
        className="text-secondary/30"
      />
      {/* Embedding slice */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="currentColor"
        strokeWidth="20"
        strokeDasharray={`${embeddingLength} ${circumference}`}
        className="text-blue-500 transition-all duration-[2000ms] ease-out"
        strokeLinecap="round"
      />
      {/* LLM slice */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="currentColor"
        strokeWidth="20"
        strokeDasharray={`${llmLength} ${circumference}`}
        strokeDashoffset={-embeddingLength}
        className="text-purple-500 transition-all duration-[2000ms] ease-out delay-300"
        strokeLinecap="round"
      />
    </svg>
  )
}

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

interface TimelineDataPoint {
  date: string
  llmCost: number
  ragCost: number
  requests: number
}

interface UsageStatsPanelProps {
  isExpanded: boolean
  onToggle: () => void
  messages: ChatMessage[]
}

// Componente de Gráfico de Linha do Tempo
const TimelineChart = ({ data }: { data: TimelineDataPoint[] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  if (data.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
        <FiTrendingUp className="w-8 h-8 opacity-30" />
        <span>Dados históricos em breve</span>
        <span className="text-xs opacity-70">O gráfico será preenchido conforme você usar o sistema</span>
      </div>
    )
  }
  
  const maxCost = Math.max(...data.map(d => d.llmCost + d.ragCost), 0.0001)
  
  return (
    <div className="h-48 relative">
      {/* Grid de fundo */}
      <div className="absolute inset-0 flex flex-col justify-between">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="border-t border-border/30" />
        ))}
      </div>
      
      {/* Gráfico */}
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Área de RAG */}
        <path
          d={data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = 100 - ((d.ragCost / maxCost) * 90)
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ') + ` L 100 100 L 0 100 Z`}
          fill="url(#ragGradient)"
          className="transition-all duration-500"
        />
        
        {/* Área de LLM */}
        <path
          d={data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = 100 - (((d.llmCost + d.ragCost) / maxCost) * 90)
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ') + ` L 100 100 L 0 100 Z`}
          fill="url(#llmGradient)"
          className="transition-all duration-500"
          opacity="0.8"
        />
        
        {/* Linha de tendência */}
        <path
          d={data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = 100 - (((d.llmCost + d.ragCost) / maxCost) * 90)
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-primary"
        />
        
        {/* Definições de gradientes */}
        <defs>
          <linearGradient id="ragGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="llmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Pontos interativos */}
      <div className="absolute inset-0 flex items-end">
        {data.map((d, i) => {
          const leftPercent = (i / (data.length - 1)) * 100
          const totalCost = d.llmCost + d.ragCost
          const bottomPercent = (totalCost / maxCost) * 90
          
          return (
            <div
              key={i}
              className="absolute bottom-0 transform -translate-x-1/2"
              style={{ left: `${leftPercent}%`, bottom: `${bottomPercent}%` }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className={`w-2 h-2 rounded-full bg-primary transition-all duration-200 ${
                hoveredIndex === i ? 'scale-150' : 'scale-100'
              }`} />
              
              {/* Tooltip */}
              {hoveredIndex === i && (
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-popover border border-border rounded-lg p-2 shadow-lg whitespace-nowrap z-10">
                  <div className="text-xs font-semibold mb-1">{d.date}</div>
                  <div className="text-xs space-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>LLM: ${d.llmCost.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>RAG: ${d.ragCost.toFixed(4)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {d.requests} requisições
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Labels do eixo X */}
      <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-muted-foreground">
        <span>{data[0]?.date}</span>
        {data.length > 1 && <span>{data[Math.floor(data.length / 2)]?.date}</span>}
        {data.length > 1 && <span>{data[data.length - 1]?.date}</span>}
      </div>
    </div>
  )
}

export function UsageStatsPanel({ isExpanded, onToggle, messages }: UsageStatsPanelProps) {
  const { authenticatedFetch } = useAuth()
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>([])

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

  // Timeline histórica - por enquanto vazia (dados reais seriam coletados ao longo do tempo)
  // TODO: Implementar coleta diária de estatísticas para gráfico de evolução
  useEffect(() => {
    // Limpa os dados de timeline (não usa dados simulados)
    setTimelineData([])
  }, [stats])

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      fetchStats()
    }
  }, [messages.length])

  const embeddingPercentage = stats?.totalCost && stats.totalCost > 0
    ? (stats.totalEmbeddingCost / stats.totalCost) * 100
    : 0
    
  const llmPercentage = stats?.totalCost && stats.totalCost > 0
    ? (stats.totalLLMCost / stats.totalCost) * 100
    : 0

  return (
    <div className={`bg-card border border-border rounded-lg flex flex-col ${isExpanded ? 'flex-1 min-h-0' : ''}`}>
      {/* Header compacto */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <FiTrendingUp className="w-5 h-5 text-primary animate-pulse" />
          <span className="text-base font-semibold">Estatísticas de Uso</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-green-600 dark:text-green-400">
            ${(stats?.totalCost ?? 0).toFixed(4)}
          </span>
          <span className={`text-sm transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Conteúdo expandido com scroll interno */}
      {isExpanded && (
        <div className="flex-1 min-h-0 overflow-y-auto border-t border-border">
          <div className="p-4 lg:p-5 space-y-4">
          
          {/* Grid de 8 Cards DISCRIMINADOS - Responsivo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2">
            
            {/* Linha 1: Custos Detalhados */}
            
            {/* Card 1: Embeddings Google */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2.5 hover:border-blue-500/60 transition-all duration-300 group cursor-help" title="Google AI Embeddings&#10;$0.00001 por 1k caracteres&#10;Vetorização semântica para RAG">
              <div className="flex items-center justify-between mb-1">
                <GeminiIcon className="w-4 h-4 text-blue-500 group-hover:scale-125 transition-all duration-300" />
                <FiDollarSign className="w-3 h-3 text-blue-500/50" />
              </div>
              <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                ${(stats?.totalEmbeddingCost ?? 0).toFixed(6)}
              </div>
              <div className="text-[9px] text-muted-foreground font-semibold">Embeddings</div>
              <div className="text-[8px] text-blue-500/70 mt-0.5">{stats?.embeddingsGenerated ?? 0} vetores</div>
            </div>
            
            {/* Card 2: Gemini Flash (LLM) */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2.5 hover:border-purple-500/60 transition-all duration-300 group cursor-help" title="Gemini 2.5 Flash&#10;$0.0001875 / 1M input&#10;$0.00075 / 1M output&#10;Geração de respostas texto">
              <div className="flex items-center justify-between mb-1">
                <GeminiIcon className="w-4 h-4 text-purple-500 group-hover:scale-125 transition-all duration-300" />
                <FiDollarSign className="w-3 h-3 text-purple-500/50" />
              </div>
              <div className="text-base font-bold text-purple-600 dark:text-purple-400">
                ${((stats as any)?.geminiCost ?? 0).toFixed(6)}
              </div>
              <div className="text-[9px] text-muted-foreground font-semibold">Gemini Flash</div>
              <div className="text-[8px] text-purple-500/70 mt-0.5">LLM Principal</div>
            </div>
            
            {/* Card 3: Nano Banana (Imagens) */}
            <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-2.5 hover:border-pink-500/60 transition-all duration-300 group cursor-help" title="Nano Banana 🍌&#10;Gemini 2.5 Flash Image&#10;~$0.0009675 por imagem&#10;(1290 tokens × $0.00075)">
              <div className="flex items-center justify-between mb-1">
                <span className="text-base">🍌</span>
                <FiDollarSign className="w-3 h-3 text-pink-500/50" />
              </div>
              <div className="text-base font-bold text-pink-600 dark:text-pink-400">
                ${((stats as any)?.nanoBananaCost ?? 0).toFixed(6)}
              </div>
              <div className="text-[9px] text-muted-foreground font-semibold">Nano Banana</div>
              <div className="text-[8px] text-pink-500/70 mt-0.5">{(stats as any)?.imagesGenerated ?? 0} imagens</div>
            </div>
            
            {/* Card 4: Groq Llama (Fallback) */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-2.5 hover:border-indigo-500/60 transition-all duration-300 group cursor-help" title="Groq Llama 3.1 8B&#10;$0.05 / 1M input&#10;$0.08 / 1M output&#10;LLM alternativo">
              <div className="flex items-center justify-between mb-1">
                <GroqIcon className="w-4 h-4 text-indigo-500 group-hover:scale-125 transition-all duration-300" />
                <FiDollarSign className="w-3 h-3 text-indigo-500/50" />
              </div>
              <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                ${((stats as any)?.groqCost ?? 0).toFixed(6)}
              </div>
              <div className="text-[9px] text-muted-foreground font-semibold">Groq Llama</div>
              <div className="text-[8px] text-indigo-500/70 mt-0.5">Fallback</div>
            </div>
            
            {/* Linha 2: Métricas e Total */}
            
            {/* Card 5: Total Geral */}
            <div className="bg-green-500/10 border-2 border-green-500/50 rounded-lg p-2.5 hover:border-green-500/70 transition-all duration-300 group cursor-help" title="Custo total acumulado&#10;Todos os serviços">
              <div className="flex items-center justify-between mb-1">
                <FiDollarSign className="w-4 h-4 text-green-500 group-hover:scale-125 transition-all duration-300" />
                <FiTrendingUp className="w-3 h-3 text-green-500/50" />
              </div>
              <div className="text-base font-bold text-green-600 dark:text-green-400">
                ${(stats?.totalCost ?? 0).toFixed(4)}
              </div>
              <div className="text-[9px] text-muted-foreground font-semibold">Total Geral</div>
              <div className="text-[8px] text-green-500/70 mt-0.5">Acumulado</div>
            </div>
            
            {/* Card 6: Requisições RAG */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2.5 hover:border-cyan-500/60 transition-all duration-300 group cursor-help" title="Requisições com busca RAG&#10;Retrieval-augmented generation">
              <div className="flex items-center justify-between mb-1">
                <FiDatabase className="w-4 h-4 text-cyan-500 group-hover:scale-125 transition-all duration-300" />
                <span className="text-[10px] text-cyan-500/70">{stats?.requestsWithSemanticSearch ?? 0}</span>
              </div>
              <div className="text-base font-bold text-cyan-600 dark:text-cyan-400">
                {stats?.requestsWithSemanticSearch ?? 0}
              </div>
              <div className="text-[9px] text-muted-foreground font-semibold">RAG</div>
              <div className="text-[8px] text-cyan-500/70 mt-0.5">Busca semântica</div>
            </div>
            
            {/* Card 7: Requisições Totais */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2.5 hover:border-yellow-500/60 transition-all duration-300 group cursor-help" title="Total de requisições&#10;Todas as consultas ao sistema">
              <div className="flex items-center justify-between mb-1">
                <FiZap className="w-4 h-4 text-yellow-500 group-hover:animate-bounce" />
                <span className="text-[10px] text-yellow-500/70">{stats?.totalRequests ?? 0}</span>
              </div>
              <div className="text-base font-bold text-yellow-600 dark:text-yellow-400">
                {stats?.totalRequests ?? 0}
              </div>
              <div className="text-[9px] text-muted-foreground font-semibold">Requisições</div>
              <div className="text-[8px] text-yellow-500/70 mt-0.5">Total</div>
            </div>
            
            {/* Card 8: Cache */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2.5 hover:border-orange-500/60 transition-all duration-300 group cursor-help" title="Embeddings em cache&#10;Vetores reutilizáveis">
              <div className="flex items-center justify-between mb-1">
                <FiCpu className="w-4 h-4 text-orange-500 group-hover:rotate-180 transition-all duration-700" />
                <span className="text-[10px] text-orange-500/70">{stats?.cacheSize ?? 0}</span>
              </div>
              <div className="text-base font-bold text-orange-600 dark:text-orange-400">
                {stats?.cacheSize ?? 0}
              </div>
              <div className="text-[9px] text-muted-foreground font-semibold">Cache</div>
              <div className="text-[8px] text-orange-500/70 mt-0.5">Em memória</div>
            </div>
          </div>

          {/* Grid 2 Colunas PRINCIPAIS: Pizza grande + Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
            
            {/* Coluna Esquerda: Pizza Animada GRANDE */}
            <div className="bg-secondary/30 border-2 border-border/50 rounded-xl p-4 lg:p-6 overflow-hidden min-w-0">
              <div className="text-xs lg:text-sm font-bold text-foreground uppercase tracking-wider mb-3 lg:mb-5 flex items-center gap-2">
                <FiDollarSign className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="truncate">Proporção de Custos</span>
              </div>
              
              <div className="flex items-center justify-center mb-8">
                <AnimatedPieChart 
                  embeddingPercentage={embeddingPercentage}
                  llmPercentage={llmPercentage}
                />
              </div>
              
              <div className="space-y-5">
                <div className="flex items-center justify-between group cursor-help" title={`Embeddings: ${embeddingPercentage.toFixed(1)}% do custo total`}>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                    <span className="text-base font-semibold">Embeddings</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {embeddingPercentage.toFixed(0)}%
                  </span>
                </div>
                
                <AnimatedBar percentage={embeddingPercentage} color="bg-blue-500" delay={300} />
                
                <div className="flex items-center justify-between group cursor-help" title={`LLM: ${llmPercentage.toFixed(1)}% do custo total`}>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-purple-500" />
                    <span className="text-base font-semibold">LLM</span>
                  </div>
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {llmPercentage.toFixed(0)}%
                  </span>
                </div>
                
                <AnimatedBar percentage={llmPercentage} color="bg-purple-500" delay={600} />
              </div>
            </div>
            
            {/* Coluna Direita: Gráfico de Linha do Tempo */}
            <div className="bg-secondary/30 border-2 border-border/50 rounded-xl p-4 lg:p-6 overflow-hidden min-w-0">
              <div className="text-xs lg:text-sm font-bold text-foreground uppercase tracking-wider mb-3 lg:mb-5 flex items-center gap-2">
                <FiTrendingUp className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="truncate">Consumo ao Longo do Tempo</span>
              </div>
              
              <TimelineChart data={timelineData} />
              
              {/* Legenda */}
              <div className="flex items-center justify-center gap-6 mt-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="font-semibold">LLM</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="font-semibold">RAG</span>
                </div>
              </div>
            </div>
            
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
