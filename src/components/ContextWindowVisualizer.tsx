import { useMemo } from 'react'
import { RAGDocument, ChatMessage } from '../types'
import { FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi'

interface ContextWindowVisualizerProps {
  documents: RAGDocument[]
  promptText?: string // Prompt customizado
  messages?: ChatMessage[] // Histórico do chat
  maxContextTokens?: number
  optimalTokens?: number
  warningTokens?: number
}

// Função para estimar tokens (aproximadamente 1 token = 4 caracteres em português)
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
}

// Tipos de risco de alucinação
type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'

interface RiskAnalysis {
  level: RiskLevel
  color: string
  bgColor: string
  icon: JSX.Element
  title: string
  description: string
  recommendations: string[]
}

export function ContextWindowVisualizer({ 
  documents, 
  promptText = '',
  messages = [],
  maxContextTokens = 8000,
  optimalTokens = 1024,
  warningTokens = 5000
}: ContextWindowVisualizerProps) {
  
  const stats = useMemo(() => {
    // Calcular tokens do prompt customizado
    const promptTokens = estimateTokens(promptText)
    
    // Calcular tokens do histórico de chat
    const chatTokens = messages.reduce((acc, msg) => acc + estimateTokens(msg.content), 0)
    
    // Calcular tokens do índice (documentos RAG)
    const indexTokens = documents.reduce((acc, doc) => {
      if (doc.chunks) {
        return acc + doc.chunks.reduce((chunkAcc, chunk) => chunkAcc + estimateTokens(chunk), 0)
      }
      return acc + estimateTokens(doc.content || '')
    }, 0)
    
    // Total: Prompt + Chat + Índice (contexto completo)
    const totalTokens = promptTokens + chatTokens + indexTokens
    const totalChunks = documents.reduce((acc, doc) => acc + (doc.chunks?.length || 0), 0)

    const utilizationPercent = (totalTokens / maxContextTokens) * 100
    
    // Detectar método de busca da última mensagem do assistente
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')
    const searchMethod = lastAssistantMessage?.metadata?.searchMethod || 'none'
    const hasSemanticSearch = searchMethod === 'semantic'
    const hasKeywordSearch = searchMethod === 'keyword'
    const hasRAGDocuments = documents.length > 0
    
    return {
      totalChunks,
      totalTokens,
      promptTokens,
      chatTokens,
      indexTokens,
      utilizationPercent,
      remainingTokens: maxContextTokens - totalTokens,
      isOptimal: totalTokens <= optimalTokens,
      isWarning: totalTokens > warningTokens,
      isCritical: totalTokens > maxContextTokens * 0.9,
      searchMethod,
      hasSemanticSearch,
      hasKeywordSearch,
      hasRAGDocuments
    }
  }, [documents, promptText, messages, maxContextTokens, optimalTokens, warningTokens])

  // Análise inteligente de risco de alucinação
  const riskAnalysis = useMemo((): RiskAnalysis => {
    const { utilizationPercent, hasSemanticSearch, hasKeywordSearch, hasRAGDocuments, indexTokens } = stats
    
    // RISCO BAIXO: Busca semântica ativa + contexto controlado
    if (hasSemanticSearch && utilizationPercent < 80) {
      return {
        level: 'low',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-500/10 border-green-500/30',
        icon: <FiCheckCircle className="w-4 h-4" />,
        title: 'Risco Baixo',
        description: 'Busca semântica Gemini RAG ativa',
        recommendations: [
          'Sistema otimizado para respostas precisas',
          'Usando apenas chunks relevantes',
          'Contexto bem dimensionado'
        ]
      }
    }
    
    // RISCO MODERADO: Busca semântica mas contexto elevado
    if (hasSemanticSearch && utilizationPercent >= 80 && utilizationPercent < 95) {
      return {
        level: 'moderate',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-500/10 border-yellow-500/30',
        icon: <FiInfo className="w-4 h-4" />,
        title: 'Risco Moderado',
        description: 'Busca semântica ativa, contexto próximo do limite',
        recommendations: [
          'Considere reduzir o histórico de mensagens',
          'Busca semântica funcionando corretamente',
          `${indexTokens} tokens de índice RAG em uso`
        ]
      }
    }
    
    // RISCO MODERADO: Busca por palavra-chave
    if (hasKeywordSearch && utilizationPercent < 90) {
      return {
        level: 'moderate',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-500/10 border-yellow-500/30',
        icon: <FiInfo className="w-4 h-4" />,
        title: 'Risco Moderado',
        description: 'Busca por palavras-chave (não semântica)',
        recommendations: [
          'Chunks podem não ser totalmente relevantes',
          'Considere ativar busca semântica',
          'Contexto ainda controlado'
        ]
      }
    }
    
    // RISCO ALTO: Sem busca semântica + contexto elevado
    if (!hasSemanticSearch && hasRAGDocuments && utilizationPercent >= 80) {
      return {
        level: 'high',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-500/10 border-orange-500/30',
        icon: <FiAlertTriangle className="w-4 h-4" />,
        title: 'Risco Alto',
        description: 'Contexto inflado sem busca semântica',
        recommendations: [
          'Ative a busca semântica para melhor precisão',
          'Reduza o histórico ou documentos RAG',
          'Sistema pode misturar informações irrelevantes'
        ]
      }
    }
    
    // RISCO CRÍTICO: Contexto muito próximo ou acima do limite
    if (utilizationPercent >= 95) {
      return {
        level: 'critical',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-500/10 border-red-500/30',
        icon: <FiAlertTriangle className="w-4 h-4" />,
        title: 'Risco Crítico',
        description: 'Contexto excede 95% do limite do modelo',
        recommendations: [
          'URGENTE: Reduza o contexto imediatamente',
          'Modelo pode "esquecer" partes do prompt',
          hasSemanticSearch 
            ? 'Reduza histórico ou número de chunks'
            : 'Ative busca semântica e reduza contexto'
        ]
      }
    }
    
    // RISCO BAIXO: Sem documentos RAG (chat livre)
    if (!hasRAGDocuments && utilizationPercent < 80) {
      return {
        level: 'low',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-500/10 border-blue-500/30',
        icon: <FiInfo className="w-4 h-4" />,
        title: 'Chat Livre',
        description: 'Sem documentos RAG, usando conhecimento geral',
        recommendations: [
          'Respostas baseadas no treinamento do modelo',
          'Para maior precisão, adicione documentos RAG',
          'Contexto controlado'
        ]
      }
    }
    
    // DEFAULT: Risco moderado
    return {
      level: 'moderate',
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-500/10 border-gray-500/30',
      icon: <FiInfo className="w-4 h-4" />,
      title: 'Risco Moderado',
      description: 'Contexto padrão sem otimizações específicas',
      recommendations: [
        'Sistema funcionando normalmente',
        'Considere ativar busca semântica para maior precisão',
        'Monitore o crescimento do contexto'
      ]
    }
  }, [stats])

  // Criar grid de blocos (similar ao GitHub contributions) - Otimizado para menos espaço
  const gridCols = 40
  const gridRows = 4
  const totalBlocks = gridCols * gridRows
  const blocksToFill = Math.min(Math.ceil((stats.totalTokens / maxContextTokens) * totalBlocks), totalBlocks)

  const getBlockColor = (blockIndex: number): string => {
    if (blockIndex >= blocksToFill) return 'bg-muted'
    
    const fillPercentage = (blockIndex + 1) / totalBlocks
    
    // Usar cores baseadas no risco
    if (riskAnalysis.level === 'low') {
      if (fillPercentage <= 0.5) return 'bg-green-400/20'
      if (fillPercentage <= 0.8) return 'bg-green-500/40'
      return 'bg-green-600/60'
    }
    
    if (riskAnalysis.level === 'moderate') {
      if (fillPercentage <= 0.5) return 'bg-yellow-400/20'
      if (fillPercentage <= 0.8) return 'bg-yellow-500/40'
      return 'bg-yellow-600/60'
    }
    
    if (riskAnalysis.level === 'high') {
      if (fillPercentage <= 0.5) return 'bg-orange-400/20'
      if (fillPercentage <= 0.8) return 'bg-orange-500/40'
      return 'bg-orange-600/60'
    }
    
    // Critical
    if (fillPercentage <= 0.5) return 'bg-red-400/20'
    if (fillPercentage <= 0.8) return 'bg-red-500/40'
    return 'bg-red-600'
  }

  return (
    <div className="space-y-2">
      {/* Header ultra compacto */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-card-foreground">
          Contexto (P:{stats.promptTokens} + C:{stats.chatTokens} + I:{stats.indexTokens})
        </h4>
        <div className={`text-xs px-1.5 py-0.5 rounded ${
          stats.isOptimal ? 'bg-primary/10 text-primary' :
          stats.isCritical ? 'bg-destructive/10 text-destructive' :
          stats.isWarning ? 'bg-muted-foreground/10 text-muted-foreground' :
          'bg-accent text-accent-foreground'
        }`}>
          {stats.utilizationPercent.toFixed(0)}%
        </div>
      </div>

      {/* Grid mini */}
      <div className="bg-muted/50 p-2 rounded border border-border shadow-sm">
        <div 
          className="grid mx-auto"
          style={{ 
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gridTemplateRows: `repeat(${gridRows}, 1fr)`,
            maxWidth: '100%',
            aspectRatio: '10/1',
            gap: '1px'
          }}
        >
          {Array.from({ length: totalBlocks }, (_, index) => (
            <div
              key={index}
              className={`w-full h-full ${getBlockColor(index)}`}
              style={{ aspectRatio: '1/1' }}
              title={`Prompt: ${stats.promptTokens} + Chat: ${stats.chatTokens} + Índice: ${stats.indexTokens} = ${stats.totalTokens} tokens`}
            />
          ))}
        </div>
      </div>

      {/* Análise inteligente de risco - COMPACTO EM UMA LINHA */}
      <div className={`border rounded-lg px-3 py-2 ${riskAnalysis.bgColor}`}>
        <div className="flex items-center gap-3">
          <span className={riskAnalysis.color}>
            {riskAnalysis.icon}
          </span>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h5 className={`text-xs font-semibold ${riskAnalysis.color} whitespace-nowrap`}>
              {riskAnalysis.title}
            </h5>
            <span className="text-xs text-muted-foreground/50">•</span>
            <p className="text-xs text-muted-foreground truncate">
              {riskAnalysis.description}
            </p>
          </div>
          {stats.searchMethod !== 'none' && (
            <span className="text-xs text-muted-foreground/70 capitalize whitespace-nowrap">
              {stats.searchMethod}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}