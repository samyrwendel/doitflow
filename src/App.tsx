import { useState, useEffect } from 'react'
import { KnowledgeBase } from './components/KnowledgeBase'
import { CollapsiblePanel, PANEL_ICONS } from './components/CollapsiblePanel'
import { ChatTab } from './components/ChatTab'
import { PromptEditorModal } from './components/PromptEditorModal'
import { LLMConfigModal } from './components/LLMConfigModalComponent'
import ConfirmDialog from './components/ConfirmDialog'
import SuccessDialog from './components/SuccessDialog'
import AuthLogin from './components/AuthLogin'
import { UsageStatsPanel } from './components/UsageStatsPanel'
import { DevicesPanel } from './components/DevicesPanel'
import { ConversationsPanel } from './components/ConversationsPanel'
import { TeamSchedulerPanel } from './components/TeamSchedulerPanel'
import { ExpenseTrackerPanel } from './components/ExpenseTrackerPanel'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { ChatMessage, RAGDocument, TranscriptionResult, TranscriptionProgress, SavedTranscription, Agent } from './types'
import { generateId } from './lib/utils'
import { API_ENDPOINTS } from './lib/api'
import { FiSun, FiMoon } from 'react-icons/fi'

function MainApp() {
  const { authenticatedFetch, user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [ragDocuments, setRagDocuments] = useState<RAGDocument[]>([])
  const [savedTranscriptions, setSavedTranscriptions] = useState<SavedTranscription[]>([])
  const [currentTranscription, setCurrentTranscription] = useState<TranscriptionResult | null>(null)
  const [transcriptionProgress, setTranscriptionProgress] = useState<TranscriptionProgress>({
    status: 'idle',
    progress: 0
  })
  const [promptText, setPromptText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expandedPanel, setExpandedPanel] = useState<string>('') // Todos os painéis recolhidos por padrão
  
  // Estados para redimensionamento dragável (temporário)
  // const [leftPanelWidth, setLeftPanelWidth] = useState(50) // Porcentagem da largura
  // const [isDragging, setIsDragging] = useState(false)
  
  // Estados para RAG inteligente
  const [selectedRagId, setSelectedRagId] = useState<string | null>(null)
  // Removido índice detalhado de RAG (simplificado no editor de prompt)
  
  // Estados para otimização de prompt
  const [isOptimizing, setIsOptimizing] = useState(false)
  
  // Estados para configuração LLM
  const [selectedLLMModel, setSelectedLLMModel] = useState('llama-3.1-8b-instant')
  
  // Estados para modal de confirmação
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    details: string[]
    onConfirm: () => void
    type: 'danger' | 'warning' | 'info'
  }>({
    isOpen: false,
    title: '',
    message: '',
    details: [],
    onConfirm: () => {},
    type: 'danger'
  })

  // Estados para modal de sucesso
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    details: string[]
  }>({
    isOpen: false,
    title: '',
    message: '',
    details: []
  })
  
  // Estados para persistência
  const [sessionId, setSessionId] = useState<string>('')
  
  // Estados para sincronização de prompt
  // Estados de sincronização de prompt removidos (não usados na UI atual)
  
  // Estados para modais flutuantes
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [isLLMConfigModalOpen, setIsLLMConfigModalOpen] = useState(false)
  const [isConversationsModalOpen, setIsConversationsModalOpen] = useState(false)

  // Estados para Multi-Agentes
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash')

  // Handlers para mudança de agente e modelo
  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId)
    localStorage.setItem('selectedAgentId', agentId)
  }

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    localStorage.setItem('selectedModel', model)
  }

  // Função para carregar documentos RAG
  const loadRAGDocuments = async () => {
    try {
      const ragResponse = await authenticatedFetch(API_ENDPOINTS.RAG_DOCUMENTS)
      if (ragResponse.ok) {
        const ragData = await ragResponse.json()
        if (ragData.success) {
          const ragDocuments = ragData.data.map((r: any) => ({
            id: r.id,
            title: r.title,
            content: r.content,
            chunks: r.chunks,
            createdAt: r.created_at,
            sourceFileName: r.source_filename,
            metadata: r.metadata
          }))
          setRagDocuments(ragDocuments)
          console.log(`[RAG] ${ragDocuments.length} documentos RAG carregados`)
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar documentos RAG:', error)
    }
  }

  // Função para carregar dados persistidos
  const loadPersistedData = async () => {
    try {
      console.log('🔄 Carregando dados persistidos...')

      // Carregar transcrições salvas (APENAS áudio/vídeo)
      const transcriptionsResponse = await authenticatedFetch(API_ENDPOINTS.TRANSCRIPTIONS)
      if (transcriptionsResponse.ok) {
        const transcriptionsData = await transcriptionsResponse.json()
        if (transcriptionsData.success) {
          // Converter para formato SavedTranscription com mapeamento correto
          // FILTRAR: Apenas transcrições que têm duration (áudio/vídeo) OU isAudioVideo=true
          const savedTranscriptions = transcriptionsData.data
            .filter((t: any) => {
              // Aceitar se tem duration (transcrições antigas de áudio/vídeo)
              // OU se está marcado explicitamente como isAudioVideo
              const hasAudioVideoMetadata = t.is_audio_video === 1 || t.is_audio_video === true
              const hasDuration = t.duration && t.duration > 0
              return hasAudioVideoMetadata || hasDuration
            })
            .map((t: any) => ({
              id: t.id,
              title: t.title,
              text: t.content, // content do banco → text do frontend
              fileName: t.source_filename,
              duration: t.duration,
              audioSize: t.file_size,
              characterCount: t.content ? t.content.length : 0,
              createdAt: t.created_at,
              chunks: t.metadata?.chunks || undefined
            }))
          setSavedTranscriptions(savedTranscriptions)
          console.log(`[AUDIO] ${savedTranscriptions.length} transcrições de áudio/vídeo carregadas`)
        }
      }

      // Carregar documentos RAG
      await loadRAGDocuments()

      // Carregar prompts salvos
      console.log('[PROMPT] Buscando último prompt geral...')
      const promptsResponse = await authenticatedFetch(API_ENDPOINTS.PROMPTS)
      if (promptsResponse.ok) {
        const promptsData = await promptsResponse.json()
        console.log('📊 Resposta da API de prompts:', promptsData)
        
        if (promptsData.success && promptsData.data.length > 0) {
          console.log(`📋 Prompts encontrados: ${promptsData.data.length}`)
          
          // Debug: mostrar todos os prompts
          promptsData.data.forEach((p: any, index: number) => {
            console.log(`📄 Prompt ${index + 1}:`, {
              id: p.id,
              title: p.title,
              rag_document_id: p.rag_document_id,
              content_length: p.content?.length || 0,
              created_at: p.created_at
            })
          })
          
          // Filtrar prompts gerais (sem RAG associado)
          const generalPrompts = promptsData.data.filter((p: any) => !p.rag_document_id)
          console.log(`📝 Prompts gerais (sem RAG): ${generalPrompts.length}`)
          
          if (generalPrompts.length > 0) {
            // Pegar o prompt mais recente
            const latestPrompt = generalPrompts[0] // Já vem ordenado por created_at DESC
            setPromptText(latestPrompt.content)
            console.log(`[PROMPT] Prompt geral carregado: ${latestPrompt.title}`)
            console.log(`📄 Conteúdo completo:`, latestPrompt.content)
            
            // Estado de sincronização removido
          } else {
            console.log('⚠️ Nenhum prompt geral encontrado')
          }
        } else {
          console.log('⚠️ Nenhum prompt encontrado no banco ou resposta sem sucesso:', promptsData)
        }
      } else {
        console.error('❌ Erro na resposta da API de prompts:', promptsResponse.status)
      }

      // Gerar ID de sessão para novo chat
      const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      setSessionId(newSessionId)
      console.log('[CHAT] Nova sessão de chat:', newSessionId)

    } catch (error) {
      console.error('❌ Erro ao carregar dados persistidos:', error)
    }
  }

  // Inicialização da aplicação
  useEffect(() => {
    loadPersistedData()
    loadAgents() // Carregar agentes
    // Estados de sincronização removidos
    
    // Carregar selectedRagId do localStorage
    const savedRagId = localStorage.getItem('selectedRagId')
    if (savedRagId) {
      setSelectedRagId(savedRagId)
    }

    // Carregar selectedAgentId do localStorage
    const savedAgentId = localStorage.getItem('selectedAgentId')
    if (savedAgentId) {
      setSelectedAgentId(savedAgentId)
    }
    
    // Carregar selectedModel do localStorage
    const savedModel = localStorage.getItem('selectedModel')
    if (savedModel) {
      setSelectedModel(savedModel)
    }
  }, []) // Apenas na inicialização

  // Função para carregar agentes
  const loadAgents = async () => {
    try {
      const response = await authenticatedFetch(API_ENDPOINTS.AGENTS)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Mapear campos do banco para o frontend
          const mappedAgents = data.data.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            emoji: agent.avatar_emoji || '🤖',
            description: agent.description || '',
            systemPrompt: agent.system_prompt || '',
            temperature: agent.temperature || 0.7,
            model: agent.model || 'llama-3.1-8b-instant',
            color: agent.color || '#3b82f6',
            isDefault: Boolean(agent.is_default),
            evolutionInstanceId: agent.evolution_instance_id,
            createdAt: agent.created_at,
            updatedAt: agent.updated_at
          }))
          
          setAgents(mappedAgents)
          console.log(`[AGENTS] ${mappedAgents.length} agentes carregados`)
          
          // Se não tiver agente selecionado, selecionar o padrão
          if (!localStorage.getItem('selectedAgentId') && mappedAgents.length > 0) {
            const defaultAgent = mappedAgents.find((a: Agent) => a.isDefault) || mappedAgents[0]
            setSelectedAgentId(defaultAgent.id)
            localStorage.setItem('selectedAgentId', defaultAgent.id)
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar agentes:', error)
    }
  }

  // Função para criar novo agente
  const handleCreateAgent = async (name: string, emoji: string) => {
    try {
      const response = await authenticatedFetch(API_ENDPOINTS.AGENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          avatarEmoji: emoji,
          description: '',
          system_prompt: '',
          temperature: 0.7,
          model: selectedLLMModel
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          await loadAgents()
          setSelectedAgentId(data.data.id)
          localStorage.setItem('selectedAgentId', data.data.id)
          // Limpar prompt e RAG para construir do zero
          setPromptText('')
          setSelectedRagId(null)
          console.log('✅ Agente criado:', name)
        }
      }
    } catch (error) {
      console.error('❌ Erro ao criar agente:', error)
    }
  }

  // Função para atualizar agente completo
  const handleUpdateAgentFull = async (agentId: string, data: Partial<Agent>) => {
    try {
      const agent = agents.find(a => a.id === agentId)
      if (!agent) return

      // Mapear campos do frontend para backend
      const backendData: any = {}
      if (data.name !== undefined) backendData.name = data.name
      if (data.emoji !== undefined) backendData.avatarEmoji = data.emoji
      if (data.description !== undefined) backendData.description = data.description
      if (data.systemPrompt !== undefined) backendData.systemPrompt = data.systemPrompt
      if (data.temperature !== undefined) backendData.temperature = data.temperature
      if (data.model !== undefined) backendData.model = data.model
      if (data.color !== undefined) backendData.color = data.color
      if (data.evolutionInstanceId !== undefined) backendData.evolutionInstanceId = data.evolutionInstanceId

      const response = await authenticatedFetch(`${API_ENDPOINTS.AGENTS}/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendData)
      })
      
      if (response.ok) {
        await loadAgents()
        console.log('✅ Agente atualizado')
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar agente:', error)
    }
  }

  // Função para deletar agente
  const handleDeleteAgent = async (agentId: string) => {
    try {
      const response = await authenticatedFetch(`${API_ENDPOINTS.AGENTS}/${agentId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Limpar seleção se era o agente deletado
        if (selectedAgentId === agentId) {
          setSelectedAgentId(null)
          localStorage.removeItem('selectedAgentId')
          setPromptText('')
        }
        await loadAgents()
        console.log('✅ Agente deletado')
      }
    } catch (error) {
      console.error('❌ Erro ao deletar agente:', error)
    }
  }

  // Função para atualizar nome do agente
  const handleUpdateAgent = async (agentId: string, name: string) => {
    try {
      const agent = agents.find(a => a.id === agentId)
      if (!agent) return

      const response = await authenticatedFetch(`${API_ENDPOINTS.AGENTS}/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...agent, name })
      })
      
      if (response.ok) {
        await loadAgents()
        console.log('✅ Agente atualizado:', name)
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar agente:', error)
    }
  }

  // Função para selecionar agente
  const handleSelectAgent = (agentId: string | null) => {
    setSelectedAgentId(agentId)
    if (agentId) {
      localStorage.setItem('selectedAgentId', agentId)
      // Carregar systemPrompt do agente
      const agent = agents.find(a => a.id === agentId)
      if (agent) {
        setPromptText(agent.systemPrompt)
        setSelectedLLMModel(agent.model)
      }
    } else {
      localStorage.removeItem('selectedAgentId')
    }
  }

  // Função para salvar prompt no agente selecionado (com debounce)
  const handlePromptChange = (newPrompt: string) => {
    setPromptText(newPrompt)
    
    // Salvar no agente selecionado
    if (selectedAgentId) {
      // Debounce: aguardar 1 segundo após parar de digitar
      if ((window as any).promptSaveTimeout) {
        clearTimeout((window as any).promptSaveTimeout)
      }
      
      (window as any).promptSaveTimeout = setTimeout(async () => {
        try {
          await handleUpdateAgentFull(selectedAgentId, { systemPrompt: newPrompt })
          console.log('✅ Prompt salvo automaticamente')
        } catch (error) {
          console.error('❌ Erro ao salvar prompt:', error)
        }
      }, 1000)
    }
  }

  // Carrega último prompt geral (simplificado)
  const loadLastGeneralPrompt = async () => {
    try {
      const response = await authenticatedFetch(API_ENDPOINTS.PROMPTS)
      if (!response.ok) return
      const data = await response.json()
      if (!data.success || !data.data.length) return
      const generalPrompts = data.data.filter((p: any) => !p.rag_document_id)
      if (!generalPrompts.length) return
      const latestPrompt = generalPrompts[0]
      setPromptText(latestPrompt.content)
      console.log('✅ Prompt geral carregado:', latestPrompt.title)
    } catch (error) {
      console.error('❌ Erro ao carregar prompt geral:', error)
    }
  }

  // Função para carregar último prompt salvo para um RAG específico
  const loadLastPromptForRAG = async (ragId: string | null) => {
    try {
      const response = await authenticatedFetch(API_ENDPOINTS.PROMPTS)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.length > 0) {
          // Buscar o prompt mais recente para este RAG específico
          const relevantPrompts = data.data.filter((prompt: any) => 
            ragId ? prompt.rag_document_id === ragId : !prompt.rag_document_id
          )
          
          if (relevantPrompts.length > 0) {
            // Pegar o mais recente
            const latestPrompt = relevantPrompts[0] // Já vem ordenado por created_at DESC
            setPromptText(latestPrompt.content)
            console.log('📝 Prompt carregado:', latestPrompt.title)
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar prompt:', error)
    }
  }

  // Carregar prompt quando RAG for selecionado ou não
  useEffect(() => {
    if (selectedRagId) {
      loadLastPromptForRAG(selectedRagId)
      localStorage.setItem('selectedRagId', selectedRagId)
    } else {
      // Se não há RAG selecionado, carregar último prompt geral
      loadLastGeneralPrompt()
      localStorage.removeItem('selectedRagId')
    }
  }, [selectedRagId])

  // Carregar prompt do agente quando agentes forem carregados ou agente selecionado mudar
  useEffect(() => {
    if (selectedAgentId && agents.length > 0) {
      const agent = agents.find(a => a.id === selectedAgentId)
      if (agent && agent.systemPrompt) {
        setPromptText(agent.systemPrompt)
        console.log('✅ Prompt do agente carregado:', agent.name)
      }
    }
  }, [agents, selectedAgentId])

  // Índice detalhado removido (não usado na interface minimalista)

  // Não gerar mais prompt automático - será baseado no RAG selecionado
  useEffect(() => {
    if (ragDocuments.length > 0 && !selectedRagId) {
      setPromptText('') // Limpar prompt quando não há RAG selecionado
    }
  }, [ragDocuments, selectedRagId])

  // Lógica de auto-sincronização removida

  // Salvamento de prompt removido nesta versão

  // Limpar chat (apaga mensagens do banco de dados)
  const handleClearChat = async () => {
    if (!selectedAgentId) {
      console.warn('[CHAT] Nenhum agente selecionado para limpar mensagens')
      return
    }

    try {
      const response = await authenticatedFetch(
        API_ENDPOINTS.AGENT_CLEAR_MESSAGES(selectedAgentId),
        { method: 'DELETE' }
      )

      if (response.ok) {
        const data = await response.json()
        console.log(`[CHAT] ${data.deleted} mensagens deletadas do banco de dados`)
        setMessages([])

        // Gerar nova sessão de chat
        const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        setSessionId(newSessionId)
        console.log('[CHAT] Nova sessão de chat:', newSessionId)
      } else {
        console.error('[CHAT] Erro ao limpar mensagens:', response.status)
      }
    } catch (error) {
      console.error('[CHAT] Erro ao limpar mensagens:', error)
    }
  }

  const handleSendMessage = async (content: string) => {
    // Debug básico
    console.log('[CHAT] Enviando mensagem do usuário')
    
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Determinar documentos RAG para usar
      const documentsToUse = selectedRagId 
        ? ragDocuments.filter(doc => doc.id === selectedRagId)
        : [] // Sem documentos se nenhum selecionado

      // Determinar qual modelo usar: do agente selecionado ou do estado global
      const currentAgent = agents.find(a => a.id === selectedAgentId)
      const modelToUse = currentAgent?.model || selectedLLMModel
      
      // Integrar com backend real
      const response = await authenticatedFetch(API_ENDPOINTS.CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          ragDocuments: documentsToUse, // Apenas o documento selecionado
          useSmartSearch: true, // Flag para busca inteligente
          customPrompt: promptText.trim(), // Enviar prompt customizado
          sessionId: sessionId, // Incluir ID da sessão para persistência
          model: modelToUse, // Usar modelo do agente se disponível
          agentId: selectedAgentId // Incluir agente selecionado para ferramentas
        })
      })

      if (!response.ok) {
        throw new Error('Falha na comunicação com o servidor')
      }

      const data = await response.json()
      
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        metadata: data.metadata // Incluir métricas retornadas pelo backend
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Atualizar sessionId se retornado pelo servidor
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId)
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      
      // Fallback para simulação se o backend não estiver disponível
      const fallbackResponse = await simulateAgentResponse(content, ragDocuments)
      
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleTranscriptionComplete = async (transcription: TranscriptionResult) => {
    // Documentos vão direto para RAG, não ficam em "Transcrições Salvas"
    if (transcription.isDocument) {
      console.log('📄 Documento processado - adicionando diretamente ao RAG')
      
      // Recarregar documentos RAG para mostrar o novo documento
      await loadRAGDocuments()
      
      // Limpar transcrição atual
      setCurrentTranscription(null)
      setTranscriptionProgress({ status: 'completed', progress: 100 })
      
      return // Não salvar em transcrições
    }
    
    // APENAS áudio e vídeo são salvos em "Transcrições Salvas"
    console.log('🎵 Áudio/Vídeo processado - salvando em Transcrições Salvas')
    
    // Criar estrutura da transcrição
    const savedTranscription: SavedTranscription = {
      id: generateId(),
      title: transcription.fileName 
        ? `${transcription.fileName.replace(/\.[^/.]+$/, "")}` 
        : `Transcrição ${new Date().toLocaleString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`,
      text: transcription.text,
      fileName: transcription.fileName,
      duration: transcription.duration,
      audioSize: transcription.audioSize,
      characterCount: transcription.text.length,
      createdAt: new Date().toISOString(),
      chunks: transcription.chunks
    }
    
    // Salvar no banco primeiro, depois adicionar ao estado local apenas se sucesso
    const success = await saveTranscriptionToDatabase(savedTranscription)
    if (success) {
      setSavedTranscriptions(prev => [savedTranscription, ...prev])
    }
    
    setCurrentTranscription(null) // Limpar transcrição atual
    setTranscriptionProgress({ status: 'completed', progress: 100 })
  }

  // Função para salvar transcrição no banco
  const saveTranscriptionToDatabase = async (transcription: SavedTranscription): Promise<boolean> => {
    try {
      const response = await authenticatedFetch(API_ENDPOINTS.TRANSCRIPTIONS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: transcription.id,
          title: transcription.title,
          content: transcription.text,
          sourceFileName: transcription.fileName,
          fileSize: transcription.audioSize,
          duration: transcription.duration,
          audioFormat: 'wav', // Pode ser obtido do arquivo original
          isAudioVideo: true, // Marcar explicitamente como áudio/vídeo
          metadata: {
            characterCount: transcription.characterCount,
            chunks: transcription.chunks
          }
        })
      })

      if (response.ok) {
        console.log('✅ Transcrição salva no banco de dados')
        return true
      } else {
        console.warn('⚠️ Erro ao salvar transcrição:', await response.text())
        return false
      }
    } catch (error) {
      console.error('❌ Erro ao salvar transcrição:', error)
      return false
    }
  }

  const handleTranscriptionProgress = (progress: TranscriptionProgress) => {
    setTranscriptionProgress(progress)
  }

  const handleTransformToChunks = () => {
    // Esta função não é mais usada diretamente, pois agora 
    // trabalhamos com transcrições salvas via handleTransformTranscriptionToChunks
  }

  const handleSaveTranscription = () => {
    // Esta função não é mais usada, pois as transcrições 
    // são salvas automaticamente em handleTranscriptionComplete
  }

  const handleNewTranscription = () => {
    setCurrentTranscription(null)
    setTranscriptionProgress({ status: 'idle', progress: 0 })
  }

  // Função para otimizar prompt com IA
  const handleOptimizePrompt = async (prompt: string): Promise<void> => {
    if (!prompt.trim()) {
      alert('Digite um prompt antes de otimizar')
      return
    }

    setIsOptimizing(true)
    console.log('🔧 Iniciando otimização do prompt...', { originalLength: prompt.length })

    try {
      const response = await authenticatedFetch(API_ENDPOINTS.OPTIMIZE_PROMPT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro na otimização')
      }

      const data = await response.json()
      
      if (data.success && data.optimizedPrompt) {
        // Atualizar o prompt com a versão otimizada
        setPromptText(data.optimizedPrompt)
        
        // Mostrar feedback de sucesso
        const improvement = data.improvement
        const changeInfo = improvement.lengthChange > 0 
          ? `+${improvement.lengthChange} caracteres` 
          : `${improvement.lengthChange} caracteres`
        
        setSuccessDialog({
          isOpen: true,
          title: 'Prompt otimizado com sucesso!',
          message: 'O prompt foi melhorado para gerar respostas mais precisas!',
          details: [
            `Original: ${improvement.originalLength} caracteres`,
            `Otimizado: ${improvement.optimizedLength} caracteres`,
            `Mudança: ${changeInfo}`
          ]
        })
        
        console.log('✅ Prompt otimizado:', { 
          originalLength: improvement.originalLength,
          optimizedLength: improvement.optimizedLength,
          improvement: improvement.lengthChange 
        })
      } else {
        throw new Error('Resposta inválida do servidor')
      }
    } catch (error) {
      console.error('❌ Erro na otimização do prompt:', error)
      alert(`❌ Erro ao otimizar prompt:\n${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nTente novamente em alguns segundos.`)
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleDeleteTranscription = async (transcriptionId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Transcrição',
      message: 'Esta ação irá apagar permanentemente a transcrição selecionada.',
      details: [
        'Não será possível recuperar os dados após a exclusão',
        'Todo o conteúdo transcrito será perdido',
        'Esta operação não pode ser desfeita'
      ],
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await authenticatedFetch(`${API_ENDPOINTS.TRANSCRIPTIONS}/${transcriptionId}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            setSavedTranscriptions(prev => prev.filter(t => t.id !== transcriptionId))
            console.log('✅ Transcrição deletada com sucesso')
          } else {
            console.error('❌ Erro ao deletar transcrição:', await response.text())
            alert('Erro ao deletar transcrição. Tente novamente.')
          }
        } catch (error) {
          console.error('❌ Erro ao deletar transcrição:', error)
          alert('Erro de conexão. Verifique sua internet e tente novamente.')
        }
        
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleDeleteRAGDocument = async (documentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Documento RAG',
      message: 'Esta ação irá apagar permanentemente o documento RAG selecionado.',
      details: [
        'Não será possível recuperar os dados após a exclusão',
        'Todo o conteúdo e chunks serão perdidos',
        'Busca semântica não funcionará mais para este documento'
      ],
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await authenticatedFetch(`${API_ENDPOINTS.RAG_DOCUMENTS}/${documentId}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            setRagDocuments(prev => prev.filter(doc => doc.id !== documentId))
            console.log('✅ Documento RAG deletado com sucesso')
          } else {
            console.error('❌ Erro ao deletar documento RAG:', await response.text())
            alert('Erro ao deletar documento. Tente novamente.')
          }
        } catch (error) {
          console.error('❌ Erro ao deletar documento RAG:', error)
          alert('Erro de conexão. Verifique sua internet e tente novamente.')
        }
        
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleDownloadChunks = (ragDoc: RAGDocument) => {
    // Baixar cada chunk como arquivo separado
    ragDoc.chunks.forEach((chunk, index) => {
      const filename = `${ragDoc.title.replace(/[^a-z0-9]/gi, '_')}_chunk_${(index + 1).toString().padStart(3, '0')}.txt`
      
      const chunkContent = `# Chunk ${index + 1} de ${ragDoc.chunks.length}
# Documento: ${ragDoc.title}
# Data: ${new Date(ragDoc.createdAt).toLocaleString('pt-BR')}
# Tamanho: ${chunk.length} caracteres

${chunk}

---
Chunk ${index + 1}/${ragDoc.chunks.length} - ${chunk.length} chars
Gerado em: ${new Date().toLocaleString('pt-BR')}`

      const blob = new Blob([chunkContent], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  const handleDownloadAllChunks = (ragDoc: RAGDocument) => {
    // Baixar todos os chunks em um arquivo único
    const filename = `${ragDoc.title.replace(/[^a-z0-9]/gi, '_')}_todos_chunks.txt`
    
    const allChunksContent = `# TODOS OS CHUNKS - ${ragDoc.title}
# Data: ${new Date(ragDoc.createdAt).toLocaleString('pt-BR')}
# Total de chunks: ${ragDoc.chunks.length}
# Tamanho total: ${ragDoc.content.length} caracteres
# Arquivo original: ${ragDoc.sourceFileName || 'N/A'}

${ragDoc.metadata ? `# Metadados:
# - Documento longo: ${ragDoc.metadata.isLongDocument ? 'Sim' : 'Não'}
# - Tamanho original: ${ragDoc.metadata.originalLength || 'N/A'} caracteres
# - Duração áudio: ${ragDoc.metadata.duration ? `${Math.round(ragDoc.metadata.duration)}s` : 'N/A'}
# - Tamanho áudio: ${ragDoc.metadata.audioSize ? `${(ragDoc.metadata.audioSize / 1024 / 1024).toFixed(1)}MB` : 'N/A'}

` : ''}${'='.repeat(80)}

${ragDoc.chunks.map((chunk, index) => `
${'='.repeat(40)} CHUNK ${index + 1}/${ragDoc.chunks.length} ${'='.repeat(40)}

${chunk}

[Chunk ${index + 1} - ${chunk.length} caracteres]
`).join('\n')}

${'='.repeat(80)}
# Análise completa gerada em: ${new Date().toLocaleString('pt-BR')}
# Total processado: ${ragDoc.chunks.length} chunks, ${ragDoc.content.length} caracteres`

    const blob = new Blob([allChunksContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadTranscription = async (transcriptionId: string) => {
    try {
      // Buscar os dados da transcrição
      const transcription = savedTranscriptions.find(t => t.id === transcriptionId)
      if (!transcription) {
        alert('Transcrição não encontrada')
        return
      }

      // Buscar o conteúdo completo da transcrição via API
      const response = await authenticatedFetch(`${API_ENDPOINTS.TRANSCRIPTIONS}/${transcriptionId}`)
      
      if (!response.ok) {
        throw new Error('Falha ao buscar conteúdo da transcrição')
      }

      const data = await response.json()
      const content = data.data?.content || data.content || ''

      // Criar nome do arquivo limpo
      const filename = `${transcription.title.replace(/[^a-z0-9]/gi, '_')}_transcricao.txt`
      
      // Criar conteúdo do arquivo com metadados
      const fileContent = `# TRANSCRIÇÃO - ${transcription.title}
# Data: ${new Date(transcription.createdAt).toLocaleString('pt-BR')}
${transcription.duration ? `# Duração: ${Math.floor(transcription.duration / 60)}:${String(Math.floor(transcription.duration % 60)).padStart(2, '0')}` : ''}
${transcription.audioSize ? `# Tamanho do arquivo: ${(transcription.audioSize / 1024 / 1024).toFixed(2)} MB` : ''}
# Caracteres: ${transcription.characterCount.toLocaleString()}

${'='.repeat(80)}

${content}

${'='.repeat(80)}
# Download gerado em: ${new Date().toLocaleString('pt-BR')}`

      // Download do arquivo
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log('✅ Download da transcrição concluído:', filename)
    } catch (error) {
      console.error('❌ Erro ao fazer download da transcrição:', error)
      alert('Erro ao fazer download. Tente novamente.')
    }
  }

  const handleTranscriptionToChunks = async (transcriptionId: string) => {
    try {
      // Buscar os dados da transcrição
      const transcription = savedTranscriptions.find(t => t.id === transcriptionId)
      if (!transcription) {
        alert('Transcrição não encontrada')
        return
      }

      // Verificar se já tem chunks
      if (transcription.chunkCount && transcription.chunkCount > 0) {
        alert('Esta transcrição já foi transformada em chunks RAG!')
        return
      }

      // Buscar o conteúdo completo da transcrição
      const response = await authenticatedFetch(`${API_ENDPOINTS.TRANSCRIPTIONS}/${transcriptionId}`)
      
      if (!response.ok) {
        throw new Error('Falha ao buscar conteúdo da transcrição')
      }

      const data = await response.json()
      const content = data.data?.content || data.content || ''

      // Enviar para processamento de chunks (mesmo endpoint de upload de documentos)
      const formData = new FormData()
      const textBlob = new Blob([content], { type: 'text/plain' })
      formData.append('document', textBlob, `${transcription.title}.txt`)

      const uploadResponse = await authenticatedFetch(API_ENDPOINTS.UPLOAD_DOCUMENT, {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Falha ao processar chunks')
      }

      const result = await uploadResponse.json()

      // Atualizar lista de documentos RAG
      loadRAGDocuments()

      // Atualizar a transcrição com info de chunks
      setSavedTranscriptions(prev => prev.map(t => 
        t.id === transcriptionId 
          ? { ...t, chunkCount: result.document.chunkCount }
          : t
      ))

      // Mostrar diálogo de sucesso
      setSuccessDialog({
        isOpen: true,
        title: 'Chunks gerados com sucesso!',
        message: `A transcrição foi transformada em ${result.document.chunkCount} chunks RAG`,
        details: [
          `${result.document.characterCount.toLocaleString()} caracteres processados`,
          `Pronto para busca semântica`,
          result.document.embeddingCost > 0 
            ? `Custo: $${result.document.embeddingCost.toFixed(6)}` 
            : 'Embeddings gratuitos'
        ]
      })

      console.log('✅ Transcrição transformada em chunks:', result)
    } catch (error) {
      console.error('❌ Erro ao transformar em chunks:', error)
      alert(`Erro ao processar chunks:\n${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const handlePanelToggle = (panelId: string) => {
    setExpandedPanel(expandedPanel === panelId ? '' : panelId)
  }

  // Função simulada para resposta do agente (fallback se backend não estiver disponível)
  const simulateAgentResponse = async (userMessage: string, ragDocs: RAGDocument[]): Promise<string> => {
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (ragDocs.length === 0) {
      return "Olá! Eu sou um assistente de IA. Para que eu possa responder suas perguntas com base em documentos, primeiro faça o upload de um arquivo de áudio na seção de transcrição à direita."
    }
    
    // Simular busca nos documentos RAG
    const relevantDocs = ragDocs.filter(doc =>
      doc.content.toLowerCase().includes(userMessage.toLowerCase()) ||
      doc.chunks.some(chunk => chunk.toLowerCase().includes(userMessage.toLowerCase()))
    )
    
    if (relevantDocs.length === 0) {
      return "Não encontrei informações relevantes nos documentos disponíveis para responder sua pergunta. Tente fazer o upload de mais documentos ou reformular sua pergunta."
    }
    
    return `Com base nos documentos transcritos, encontrei informações relevantes sobre "${userMessage}". Os documentos contêm ${relevantDocs.length} fonte(s) relacionada(s) a este assunto. Esta é uma resposta simulada - na implementação final, eu forneceria uma resposta detalhada baseada no conteúdo real dos documentos.`
  }

  // Funções para drag e redimensionamento (temporário)
  /*
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    const containerWidth = window.innerWidth
    const newLeftWidth = (e.clientX / containerWidth) * 100
    
    // Limitar entre 20% e 80% para manter usabilidade
    const clampedWidth = Math.min(Math.max(newLeftWidth, 20), 80)
    setLeftPanelWidth(clampedWidth)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Effect para adicionar/remover event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = 'none' // Prevenir seleção de texto durante drag
      document.body.style.cursor = 'col-resize'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDragging])
  */

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden flex flex-col">
      {/* Header com informações do usuário, toggle de tema e logout */}
      <div className="bg-card border-b border-border px-4 py-2 flex justify-end items-center flex-shrink-0">
        <div className="flex items-center space-x-3">
          {user && (
            <span className="text-sm text-muted-foreground">
              Olá, <span className="font-medium">{user.fullName || user.username}</span>
            </span>
          )}
          
          {/* Toggle de Tema */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-primary 
                     hover:bg-accent rounded-lg transition-all duration-200 group"
            title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            {theme === 'dark' ? (
              <FiSun className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <FiMoon className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>
          
          {/* Botão de Logout */}
          <button
            onClick={logout}
            className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-red-500 
                     hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors group"
            title="Sair"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex h-full flex-1 overflow-hidden">
        {/* COLUNA ESQUERDA: Chat IA */}
        <div className="w-1/2 flex flex-col h-full overflow-hidden p-4">
          <div className="flex-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden flex flex-col">
            <ChatTab
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onOpenPromptEditor={() => setIsPromptModalOpen(true)}
              onOpenLLMConfig={() => setIsLLMConfigModalOpen(true)}
              onOpenConversations={() => setIsConversationsModalOpen(true)}
              onClearChat={handleClearChat}
              agents={agents}
              selectedAgentId={selectedAgentId}
              onAgentChange={handleAgentChange}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />
          </div>
        </div>

        {/* COLUNA DIREITA: Base de Conhecimento */}
        <div className="w-1/2 flex flex-col h-full overflow-hidden p-4">
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Painel de Estatísticas */}
            <UsageStatsPanel 
              isExpanded={expandedPanel === 'statistics'}
              onToggle={() => handlePanelToggle('statistics')}
              messages={messages}
            />
            
            <CollapsiblePanel
              id="knowledge"
              title="Base de Conhecimento"
              icon={PANEL_ICONS.rag}
              isExpanded={expandedPanel === 'knowledge'}
              onToggle={handlePanelToggle}
            >
              <KnowledgeBase
                promptText={promptText}
                messages={messages}
                transcription={currentTranscription}
                progress={transcriptionProgress}
                onTranscriptionComplete={handleTranscriptionComplete}
                onTranscriptionProgress={handleTranscriptionProgress}
                onSaveTranscription={handleSaveTranscription}
                onTransformToChunks={handleTransformToChunks}
                onNewTranscription={handleNewTranscription}
                documents={ragDocuments}
                onDownloadChunks={handleDownloadChunks}
                onDownloadAllChunks={handleDownloadAllChunks}
                savedTranscriptions={savedTranscriptions}
                onDeleteTranscription={handleDeleteTranscription}
                onDeleteRAGDocument={handleDeleteRAGDocument}
                onDownloadTranscription={handleDownloadTranscription}
                onTranscriptionToChunks={handleTranscriptionToChunks}
                authenticatedFetch={authenticatedFetch}
              />
            </CollapsiblePanel>
            
            <CollapsiblePanel
              id="devices"
              title="Dispositivos"
              icon={PANEL_ICONS.devices}
              isExpanded={expandedPanel === 'devices'}
              onToggle={handlePanelToggle}
            >
              <DevicesPanel />
            </CollapsiblePanel>

            <CollapsiblePanel
              id="scheduler"
              title="Agendamentos"
              icon={PANEL_ICONS.scheduler}
              isExpanded={expandedPanel === 'scheduler'}
              onToggle={handlePanelToggle}
            >
              <TeamSchedulerPanel authenticatedFetch={authenticatedFetch} />
            </CollapsiblePanel>

            <CollapsiblePanel
              id="expenses"
              title="Gastos Transporte"
              icon={PANEL_ICONS.expenses}
              isExpanded={expandedPanel === 'expenses'}
              onToggle={handlePanelToggle}
            >
              <ExpenseTrackerPanel authenticatedFetch={authenticatedFetch} />
            </CollapsiblePanel>
          </div>
        </div>
      </div>
      
      {/* Modal de Confirmação */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        details={confirmDialog.details}
        type={confirmDialog.type}
        confirmText="Excluir Permanentemente"
        cancelText="Cancelar"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Modal de Sucesso */}
      <SuccessDialog
        isOpen={successDialog.isOpen}
        title={successDialog.title}
        message={successDialog.message}
        details={successDialog.details}
        onClose={() => setSuccessDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Modal de Editor de Prompt */}
      <PromptEditorModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        prompt={promptText}
        onChange={handlePromptChange}
        ragDocuments={ragDocuments}
        selectedRagId={selectedRagId || undefined}
        onRagSelect={setSelectedRagId}
        onOptimizePrompt={handleOptimizePrompt}
        isOptimizing={isOptimizing}
        currentLLMModel={selectedLLMModel}
        agents={agents}
        selectedAgentId={selectedAgentId}
        onAgentSelect={handleSelectAgent}
        onAgentUpdate={handleUpdateAgent}
        onAgentUpdateFull={handleUpdateAgentFull}
        onAgentCreate={handleCreateAgent}
        onAgentDelete={handleDeleteAgent}
        authenticatedFetch={authenticatedFetch}
      />

      {/* Modal de Configuração LLM */}
      <LLMConfigModal
        isOpen={isLLMConfigModalOpen}
        onClose={() => setIsLLMConfigModalOpen(false)}
        currentModel={selectedLLMModel}
        onModelChange={setSelectedLLMModel}
      />

      {/* Modal de Histórico de Conversas */}
      <ConversationsPanel 
        isOpen={isConversationsModalOpen}
        onClose={() => setIsConversationsModalOpen(false)}
        agentId={selectedAgentId}
      />
    </div>
  )
}

// Componente de autenticação que gerencia login/logout
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthWrapper />
      </AuthProvider>
    </ThemeProvider>
  )
}

// Wrapper que decide entre mostrar login ou aplicação principal
function AuthWrapper() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthLogin />
  }

  return <MainApp />
}

export default App