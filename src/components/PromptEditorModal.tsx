import { FiX, FiChevronDown, FiZap, FiEdit2, FiCheck, FiTrash2, FiPlus, FiCpu, FiPackage, FiTool, FiBriefcase, FiEdit, FiTarget, FiTrendingUp, FiSun, FiSettings, FiBarChart2, FiPenTool, FiActivity, FiStar, FiZapOff, FiMessageSquare, FiFileText, FiBook, FiAward, FiCircle } from 'react-icons/fi'
import { RAGDocument } from '../types'
import { useState, useEffect } from 'react'
import EvolutionInstanceModal, { EvolutionInstanceData } from './EvolutionInstanceModal'
import { API_ENDPOINTS } from '../lib/api'

interface Agent {
  id: string
  name: string
  emoji: string
  description: string
  systemPrompt: string
  temperature: number
  model: string
  color: string
  isDefault: boolean
  evolutionInstanceId?: string
  createdAt: string
  updatedAt: string
}

interface PromptEditorModalProps {
  isOpen: boolean
  onClose: () => void
  prompt: string
  onChange: (value: string) => void
  ragDocuments: RAGDocument[]
  selectedRagId?: string
  onRagSelect: (id: string | null) => void
  currentLLMModel: string
  onOptimizePrompt: (prompt: string) => Promise<void>
  isOptimizing: boolean
  agents: Agent[]
  selectedAgentId: string | null
  onAgentSelect: (agentId: string | null) => void
  onAgentUpdate: (agentId: string, name: string) => Promise<void>
  onAgentUpdateFull: (agentId: string, data: Partial<Agent>) => Promise<void>
  onAgentCreate: (name: string, emoji: string) => Promise<void>
  onAgentDelete: (agentId: string) => Promise<void>
  authenticatedFetch: any
}

interface LLMConfig {
  provider: string
  model: string
  apiKey?: string
}

export function PromptEditorModal({
  isOpen,
  onClose,
  prompt,
  onChange,
  ragDocuments,
  selectedRagId,
  onRagSelect,
  currentLLMModel,
  onOptimizePrompt,
  isOptimizing,
  agents,
  selectedAgentId,
  onAgentSelect,
  onAgentUpdate,
  onAgentUpdateFull,
  onAgentCreate,
  onAgentDelete,
  authenticatedFetch
}: PromptEditorModalProps) {
  const [llmConfig, setLLMConfig] = useState<LLMConfig>({
    provider: 'groq',
    model: currentLLMModel
  })
  const [selectedRags, setSelectedRags] = useState<Set<string>>(new Set())
  const [isEditingAgentName, setIsEditingAgentName] = useState(false)
  const [editedAgentName, setEditedAgentName] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentEmoji, setNewAgentEmoji] = useState('CPU')
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Estados para ferramentas
  const [availableTools, setAvailableTools] = useState<any[]>([])
  const [agentTools, setAgentTools] = useState<any[]>([])
  const [evolutionInstances, setEvolutionInstances] = useState<any[]>([])
  const [selectedEvolutionInstance, setSelectedEvolutionInstance] = useState<string>('')
  const [showEvolutionModal, setShowEvolutionModal] = useState(false)
  const [isLoadingTools, setIsLoadingTools] = useState(false)

  // Sincronizar RAG selecionado
  useEffect(() => {
    if (selectedRagId) {
      setSelectedRags(new Set([selectedRagId]))
    }
  }, [selectedRagId])

  // Sincronizar nome do agente ao selecionar
  useEffect(() => {
    const currentAgent = agents.find(a => a.id === selectedAgentId)
    if (currentAgent) {
      setEditedAgentName(currentAgent.name)
      console.log('[EVOLUTION] Agente selecionado:', currentAgent)
      console.log('[EVOLUTION] evolutionInstanceId:', currentAgent.evolutionInstanceId)
      
      // Atualizar modelo do LLM config se o agente tiver um modelo específico
      if (currentAgent.model) {
        setLLMConfig(prev => ({
          ...prev,
          model: currentAgent.model
        }))
        console.log('[LLM] Modelo do agente carregado:', currentAgent.model)
      }
      
      // Carregar evolutionInstanceId se existir
      if (currentAgent.evolutionInstanceId) {
        setSelectedEvolutionInstance(currentAgent.evolutionInstanceId)
        console.log('[EVOLUTION] Instância carregada:', currentAgent.evolutionInstanceId)
      } else {
        setSelectedEvolutionInstance('')
        console.log('[EVOLUTION] Nenhuma instância salva para este agente')
      }
    }
  }, [selectedAgentId, agents])
  
  // Carregar ferramentas e instâncias Evolution
  useEffect(() => {
    const loadToolsData = async () => {
      if (!selectedAgentId) return
      
      setIsLoadingTools(true)
      try {
        // Carregar ferramentas disponíveis
        const toolsResponse = await authenticatedFetch(API_ENDPOINTS.TOOLS)
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json()
          console.log('[TOOLS] Ferramentas disponíveis recebidas:', toolsData)
          setAvailableTools(toolsData.data || [])
        }
        
        // Carregar ferramentas do agente
        const agentToolsResponse = await authenticatedFetch(API_ENDPOINTS.AGENT_TOOLS(selectedAgentId))
        if (agentToolsResponse.ok) {
          const agentToolsData = await agentToolsResponse.json()
          console.log('[TOOLS] Ferramentas do agente recebidas:', agentToolsData)
          setAgentTools(agentToolsData.data || [])
        }
        
        // Carregar instâncias Evolution
        const instancesResponse = await authenticatedFetch(API_ENDPOINTS.EVOLUTION_INSTANCES)
        if (instancesResponse.ok) {
          const instancesData = await instancesResponse.json()
          console.log('[EVOLUTION] Instâncias Evolution recebidas:', instancesData)
          setEvolutionInstances(instancesData.data || [])
        }
      } catch (error) {
        console.error('Erro ao carregar ferramentas:', error)
      } finally {
        setIsLoadingTools(false)
      }
    }
    
    loadToolsData()
  }, [selectedAgentId, authenticatedFetch])

  // Lista de ícones React Icons para agentes
  const iconOptions = [
    { icon: <FiCpu className="w-5 h-5" />, name: 'CPU' },
    { icon: <FiPackage className="w-5 h-5" />, name: 'Package' },
    { icon: <FiTool className="w-5 h-5" />, name: 'Tool' },
    { icon: <FiBriefcase className="w-5 h-5" />, name: 'Briefcase' },
    { icon: <FiEdit className="w-5 h-5" />, name: 'Edit' },
    { icon: <FiTarget className="w-5 h-5" />, name: 'Target' },
    { icon: <FiTrendingUp className="w-5 h-5" />, name: 'TrendingUp' },
    { icon: <FiSun className="w-5 h-5" />, name: 'Sun' },
    { icon: <FiSettings className="w-5 h-5" />, name: 'Settings' },
    { icon: <FiBarChart2 className="w-5 h-5" />, name: 'BarChart' },
    { icon: <FiPenTool className="w-5 h-5" />, name: 'PenTool' },
    { icon: <FiActivity className="w-5 h-5" />, name: 'Activity' },
    { icon: <FiStar className="w-5 h-5" />, name: 'Star' },
    { icon: <FiZap className="w-5 h-5" />, name: 'Zap' },
    { icon: <FiZapOff className="w-5 h-5" />, name: 'Fire' },
    { icon: <FiMessageSquare className="w-5 h-5" />, name: 'Message' },
    { icon: <FiFileText className="w-5 h-5" />, name: 'FileText' },
    { icon: <FiBook className="w-5 h-5" />, name: 'Book' },
    { icon: <FiAward className="w-5 h-5" />, name: 'Award' },
    { icon: <FiCircle className="w-5 h-5" />, name: 'Circle' }
  ]

  // Função para renderizar ícone do agente
  const renderAgentIcon = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.name === iconName)
    if (iconOption) {
      return <div className="text-primary">{iconOption.icon}</div>
    }
    // Fallback para ícone padrão
    return <FiCpu className="w-5 h-5 text-primary" />
  }

  // Obter agente atual
  const currentAgent = agents.find(a => a.id === selectedAgentId)

  // Handler para salvar nome do agente
  const handleSaveAgentName = async () => {
    if (!selectedAgentId || !editedAgentName.trim()) return
    
    await onAgentUpdate(selectedAgentId, editedAgentName.trim())
    setIsEditingAgentName(false)
  }

  // Handler para criar novo agente
  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) return
    
    await onAgentCreate(newAgentName.trim(), newAgentEmoji)
    setNewAgentName('')
    setNewAgentEmoji('CPU')
    setIsCreatingAgent(false)
    setIsDropdownOpen(false)
  }

  // Handler para atualizar emoji do agente
  const handleUpdateEmoji = async (emoji: string) => {
    if (!selectedAgentId) return
    
    await onAgentUpdateFull(selectedAgentId, { emoji })
    setIsEmojiPickerOpen(false)
  }

  // Handler para deletar agente
  const handleDeleteAgent = async () => {
    if (!selectedAgentId) return
    
    await onAgentDelete(selectedAgentId)
    setShowDeleteConfirm(false)
  }

  // Handler para selecionar agente
  const handleSelectAgent = (agentId: string) => {
    onAgentSelect(agentId)
    setIsDropdownOpen(false)
  }

  const handleRagToggle = (ragId: string) => {
    const newSelected = new Set(selectedRags)
    if (newSelected.has(ragId)) {
      newSelected.delete(ragId)
      if (selectedRagId === ragId) {
        onRagSelect(null)
      }
    } else {
      newSelected.add(ragId)
      onRagSelect(ragId)
    }
    setSelectedRags(newSelected)
  }

  // Função para obter nome limpo do documento
  const getDocumentDisplayName = (doc: RAGDocument): string => {
    // Se tiver sourceFileName, usa ele
    if (doc.sourceFileName) {
      return doc.sourceFileName.replace(/\.[^/.]+$/, '') // Remove extensão
    }
    // Senão, usa o title mas limita a 50 caracteres
    const cleanTitle = doc.title.length > 50 ? doc.title.substring(0, 50) + '...' : doc.title
    return cleanTitle
  }
  
  // Handler para toggle de ferramenta
  const handleToolToggle = async (toolId: string, enabled: boolean) => {
    if (!selectedAgentId) return
    
    try {
      const endpoint = enabled 
        ? API_ENDPOINTS.AGENT_TOOL_ENABLE(selectedAgentId, toolId)
        : API_ENDPOINTS.AGENT_TOOL_DISABLE(selectedAgentId, toolId)
      
      const response = await authenticatedFetch(endpoint, {
        method: 'POST'
      })
      
      if (response.ok) {
        // Recarregar ferramentas do agente
        const agentToolsResponse = await authenticatedFetch(API_ENDPOINTS.AGENT_TOOLS(selectedAgentId))
        if (agentToolsResponse.ok) {
          const agentToolsData = await agentToolsResponse.json()
          setAgentTools(agentToolsData.data || [])
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar ferramenta:', error)
    }
  }
  
  // Handler para salvar instância Evolution
  const handleSaveEvolutionInstance = async (data: EvolutionInstanceData) => {
    try {
      const response = await authenticatedFetch(API_ENDPOINTS.EVOLUTION_INSTANCES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao salvar instância')
      }
      
      // Recarregar instâncias
      const instancesResponse = await authenticatedFetch(API_ENDPOINTS.EVOLUTION_INSTANCES)
      if (instancesResponse.ok) {
        const instancesData = await instancesResponse.json()
        setEvolutionInstances(instancesData.data || [])
      }
      
      setShowEvolutionModal(false)
    } catch (error: any) {
      throw error
    }
  }
  
  // Verificar se ferramenta está habilitada
  const isToolEnabled = (toolId: string) => {
    const tool = agentTools.find(t => t.id === toolId)
    const enabled = tool?.is_enabled === 1 || tool?.is_enabled === true
    console.log('[TOOL CHECK]', { toolId, tool, enabled })
    return enabled
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[90vw] h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Dropdown de Agentes */}
            <div className="relative">
              {isEditingAgentName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedAgentName}
                    onChange={(e) => setEditedAgentName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveAgentName()
                      if (e.key === 'Escape') setIsEditingAgentName(false)
                    }}
                    className="px-3 py-1.5 bg-background border border-primary rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveAgentName}
                    className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    title="Salvar"
                  >
                    <FiCheck className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary rounded-lg transition-colors group"
                >
                  {currentAgent ? (
                    <>
                      {/* Ícone clicável */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setIsEmojiPickerOpen(!isEmojiPickerOpen)
                          }}
                          className="p-2 hover:bg-secondary rounded-lg transition-all hover:scale-110"
                          title="Alterar ícone"
                        >
                          {renderAgentIcon(currentAgent.emoji)}
                        </button>
                        
                        {/* Icon Picker */}
                        {isEmojiPickerOpen && (
                          <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-lg shadow-xl p-3 grid grid-cols-5 gap-2 w-[240px] z-[60]" onClick={(e) => e.stopPropagation()}>
                            {iconOptions.map((option) => (
                              <button
                                key={option.name}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUpdateEmoji(option.name)
                                }}
                                className="p-2 hover:bg-secondary rounded-lg transition-colors flex items-center justify-center"
                                title={option.name}
                              >
                                {option.icon}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <h2 className="text-xl font-semibold text-card-foreground">{currentAgent.name}</h2>
                    </>
                  ) : (
                    <h2 className="text-xl font-semibold text-muted-foreground">Selecione um agente</h2>
                  )}
                  <FiChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              )}

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  {agents.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Nenhum agente criado ainda
                    </div>
                  ) : (
                    agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleSelectAgent(agent.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left border-b border-border last:border-b-0 ${
                          selectedAgentId === agent.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center w-8 h-8">
                          {renderAgentIcon(agent.emoji)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{agent.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{agent.description}</div>
                        </div>
                        {agent.isDefault && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Padrão</span>
                        )}
                      </button>
                    ))
                  )}
                  
                  {/* Criar Novo Agente */}
                  <div className="border-t border-border">
                    {isCreatingAgent ? (
                      <div className="p-3 space-y-2">
                        {/* Seletor de Ícone */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Ícone:</span>
                          <div className="relative">
                            <button
                              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                              className="p-2 hover:bg-secondary rounded-lg transition-all hover:scale-110"
                              type="button"
                            >
                              {renderAgentIcon(newAgentEmoji)}
                            </button>
                            {isEmojiPickerOpen && (
                              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl p-3 grid grid-cols-5 gap-2 w-[240px] z-[60]">
                                {iconOptions.map((option) => (
                                  <button
                                    key={option.name}
                                    onClick={() => {
                                      setNewAgentEmoji(option.name)
                                      setIsEmojiPickerOpen(false)
                                    }}
                                    className="p-2 hover:bg-secondary rounded-lg transition-colors flex items-center justify-center"
                                    type="button"
                                    title={option.name}
                                  >
                                    {option.icon}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={newAgentName}
                          onChange={(e) => setNewAgentName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateAgent()
                            if (e.key === 'Escape') setIsCreatingAgent(false)
                          }}
                          placeholder="Nome do novo agente"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleCreateAgent}
                            className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                          >
                            Criar
                          </button>
                          <button
                            onClick={() => setIsCreatingAgent(false)}
                            className="px-3 py-1.5 bg-secondary rounded-lg text-sm hover:bg-secondary/80"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsCreatingAgent(true)}
                        className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors text-primary font-medium text-sm"
                      >
                        + Criar Novo Agente
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botão de editar nome (só aparece quando tem agente selecionado) */}
            {currentAgent && !isEditingAgentName && (
              <>
                <button
                  onClick={() => setIsEditingAgentName(true)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  title="Editar nome do agente"
                >
                  <FiEdit2 className="w-4 h-4" />
                </button>
                
                {/* Botão de deletar agente */}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                  title="Excluir agente permanentemente"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Fechar"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content: 70% / 30% Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Coluna 70% - Prompt Text */}
          <div className="w-[70%] p-6 border-r border-border overflow-y-auto hide-scrollbar relative">
            {/* Botão flutuante de otimização - movido para canto superior direito */}
            <button
              onClick={() => !isOptimizing && onOptimizePrompt(prompt)}
              disabled={isOptimizing}
              title="Otimizar Prompt"
              className="absolute top-4 right-4 p-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all hover:scale-110 disabled:hover:scale-100 flex items-center gap-2"
            >
              <FiZap className="w-4 h-4" />
              {isOptimizing && <span className="text-xs">Otimizando...</span>}
            </button>
            <textarea
              value={prompt}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Digite seu prompt aqui..."
              className="w-full h-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none font-mono text-sm leading-relaxed hide-scrollbar pt-2"
            />
          </div>

          {/* Coluna 30% - Configurações */}
          <div className="w-[30%] flex flex-col overflow-hidden">
            {/* Seção 1: Configuração LLM - Altura fixa */}
            <div className="p-4 border-b border-border flex-shrink-0">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Modelo LLM
              </h3>
              <div className="relative">
                <select
                  value={llmConfig.model}
                  onChange={(e) => setLLMConfig({ ...llmConfig, model: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg 
                           text-sm text-foreground appearance-none cursor-pointer
                           hover:bg-secondary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <optgroup label="Groq">
                    <option value="llama-3.1-8b-instant">LLaMA 3.1 8B Instant</option>
                    <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B Versatile</option>
                  </optgroup>
                  <optgroup label="OpenAI">
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                  </optgroup>
                  <optgroup label="Google">
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  </optgroup>
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Seção 2: RAG Documents - 50% do espaço restante */}
            <div className="flex-1 min-h-0 p-4 border-b border-border overflow-y-auto hide-scrollbar scrollbar-hidden">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Base de Conhecimento</h3>
              {ragDocuments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum documento disponível</p>
              ) : (
                <div className="space-y-0">
                  {ragDocuments.map((doc, index) => (
                    <div key={doc.id}>
                      <label className="flex items-center gap-2 px-2 py-2 rounded hover:bg-secondary/40 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedRags.has(doc.id)}
                          onChange={() => handleRagToggle(doc.id)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer flex-shrink-0"
                        />
                        <span className="text-sm truncate flex-1 font-medium" title={doc.sourceFileName || doc.title}>
                          {getDocumentDisplayName(doc)}
                        </span>
                        {doc.chunks && <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded flex-shrink-0">{doc.chunks.length}</span>}
                      </label>
                      {index < ragDocuments.length - 1 && (
                        <div className="h-px bg-border mx-2"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Seção 3: Ferramentas - 50% do espaço restante */}
            <div className="flex-1 min-h-0 p-4 overflow-y-auto hide-scrollbar scrollbar-hidden">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Ferramentas</h3>
              
              {isLoadingTools ? (
                <p className="text-xs text-muted-foreground italic">Carregando...</p>
              ) : availableTools.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma ferramenta disponível</p>
              ) : (
                <div className="space-y-3">
                  {availableTools.map((tool) => {
                    const enabled = isToolEnabled(tool.id)
                    const evolutionTool = tool.name === 'evolution_api'
                    
                    console.log('[TOOL DEBUG]', { 
                      toolId: tool.id, 
                      toolName: tool.name,
                      displayName: tool.display_name,
                      isEvolution: evolutionTool,
                      enabled 
                    })
                    
                    return (
                      <div key={tool.id} className="border border-border rounded-lg p-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => {
                              console.log('[TOOL TOGGLE]', tool.name, e.target.checked)
                              handleToolToggle(tool.id, e.target.checked)
                            }}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer flex-shrink-0"
                          />
                          <span className="text-lg flex-shrink-0">{tool.icon}</span>
                          <span className="text-sm font-medium flex-1">{tool.display_name}</span>
                        </label>
                        
                        {/* Configuração específica para Evolution API */}
                        {evolutionTool && enabled && (
                          <div className="mt-3 pl-6 space-y-2">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Instância Evolution
                            </label>
                            <select
                              value={selectedEvolutionInstance}
                              onChange={async (e) => {
                                const instanceId = e.target.value
                                console.log('[EVOLUTION] Instância selecionada no dropdown:', instanceId)
                                setSelectedEvolutionInstance(instanceId)
                                
                                // Persistir no banco de dados
                                if (selectedAgentId && onAgentUpdateFull) {
                                  try {
                                    await onAgentUpdateFull(selectedAgentId, { evolutionInstanceId: instanceId })
                                    console.log('[EVOLUTION] Instância salva no agente:', instanceId)
                                  } catch (error) {
                                    console.error('[EVOLUTION] Erro ao salvar instância:', error)
                                  }
                                }
                              }}
                              className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                              <option value="">Selecione uma instância</option>
                              {evolutionInstances.map((instance) => {
                                console.log('[EVOLUTION] Instância disponível:', instance)
                                return (
                                  <option key={instance.id} value={instance.id}>
                                    {instance.name}
                                  </option>
                                )
                              })}
                            </select>
                            
                            <button
                              onClick={() => setShowEvolutionModal(true)}
                              className="w-full px-3 py-1.5 bg-primary/10 text-primary rounded text-xs hover:bg-primary/20 transition-colors flex items-center justify-center gap-1"
                            >
                              <FiPlus className="w-3 h-3" />
                              Nova Instância
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-destructive rounded-lg shadow-2xl w-[450px] p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <FiTrash2 className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  Excluir Agente Permanentemente
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Tem certeza que deseja excluir <strong>{currentAgent?.name}</strong>? 
                  Esta ação é irreversível e irá deletar:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-6">
                  <li>Todas as conversas do agente</li>
                  <li>Todas as mensagens e histórico</li>
                  <li>Todas as configurações personalizadas</li>
                  <li>Estatísticas e dados de uso</li>
                </ul>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAgent}
                    className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 font-medium transition-colors"
                  >
                    Sim, Excluir Permanentemente
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Nova Instância Evolution */}
      <EvolutionInstanceModal
        isOpen={showEvolutionModal}
        onClose={() => setShowEvolutionModal(false)}
        onSave={handleSaveEvolutionInstance}
      />
    </div>
  )
}
