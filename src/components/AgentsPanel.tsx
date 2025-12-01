import { useState, useEffect } from 'react'
import { API_ENDPOINTS } from '../lib/api'
import { FiPlus, FiEdit2, FiTrash2, FiStar, FiMessageSquare } from 'react-icons/fi'

interface Agent {
  id: string
  name: string
  description: string
  system_prompt: string
  model: string
  temperature: number
  max_tokens: number
  is_active: boolean
  is_default: boolean
  avatar_emoji: string
  color: string
  created_at: string
  last_used_at: string | null
  usage_count: number
}

interface AgentsPanelProps {
  authenticatedFetch: any
  onSelectAgent?: (agentId: string) => void
}

export function AgentsPanel({ authenticatedFetch, onSelectAgent }: AgentsPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    model: 'llama-3.1-8b-instant',
    temperature: 0.7,
    maxTokens: 1000,
    avatarEmoji: '🤖',
    color: '#3b82f6'
  })

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      setIsLoading(true)
      const response = await authenticatedFetch(API_ENDPOINTS.AGENTS)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAgents(data.data)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar agentes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAgent = async () => {
    if (!formData.name || !formData.systemPrompt) {
      alert('Nome e prompt do sistema são obrigatórios')
      return
    }

    try {
      setIsCreating(true)
      const response = await authenticatedFetch(API_ENDPOINTS.AGENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          await loadAgents()
          resetForm()
          setShowForm(false)
        }
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Erro ao criar agente:', error)
      alert('Erro ao criar agente')
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateAgent = async () => {
    if (!editingAgent) return

    try {
      const response = await authenticatedFetch(`${API_ENDPOINTS.AGENTS}/${editingAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await loadAgents()
        setEditingAgent(null)
        resetForm()
        setShowForm(false)
      }
    } catch (error) {
      console.error('Erro ao atualizar agente:', error)
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Tem certeza que deseja deletar este agente? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await authenticatedFetch(`${API_ENDPOINTS.AGENTS}/${agentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadAgents()
      }
    } catch (error) {
      console.error('Erro ao deletar agente:', error)
    }
  }

  const handleSetDefault = async (agentId: string) => {
    try {
      const response = await authenticatedFetch(`${API_ENDPOINTS.AGENTS}/${agentId}/set-default`, {
        method: 'POST'
      })

      if (response.ok) {
        await loadAgents()
      }
    } catch (error) {
      console.error('Erro ao definir agente padrão:', error)
    }
  }

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent)
    setFormData({
      name: agent.name,
      description: agent.description || '',
      systemPrompt: agent.system_prompt,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.max_tokens,
      avatarEmoji: agent.avatar_emoji,
      color: agent.color
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      systemPrompt: '',
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      maxTokens: 1000,
      avatarEmoji: '🤖',
      color: '#3b82f6'
    })
    setEditingAgent(null)
  }

  const emojiOptions = ['🤖', '👨‍💼', '👩‍💻', '🛠️', '💼', '✍️', '📊', '🎯', '💡', '🔧', '📱', '🌟']

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold">Agentes IA</h2>
          <p className="text-sm text-muted-foreground">{agents.length} agente(s)</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          Novo Agente
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-4 border-b border-border bg-accent/50">
          <h3 className="font-semibold mb-3">
            {editingAgent ? 'Editar Agente' : 'Criar Novo Agente'}
          </h3>
          
          <div className="space-y-3">
            {/* Nome e Emoji */}
            <div className="flex gap-2">
              <select
                value={formData.avatarEmoji}
                onChange={(e) => setFormData({ ...formData, avatarEmoji: e.target.value })}
                className="w-16 px-2 py-2 bg-background border border-input rounded-lg text-xl text-center"
              >
                {emojiOptions.map(emoji => (
                  <option key={emoji} value={emoji}>{emoji}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Nome do agente"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="flex-1 px-3 py-2 bg-background border border-input rounded-lg"
              />
            </div>

            {/* Descrição */}
            <input
              type="text"
              placeholder="Descrição (opcional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg"
            />

            {/* Prompt do Sistema */}
            <textarea
              placeholder="Prompt do sistema (define o comportamento do agente)"
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg resize-none"
            />

            {/* Configurações Avançadas */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Modelo</label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-2 py-1.5 bg-background border border-input rounded text-sm"
                >
                  <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
                  <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                  <option value="gemma-7b-it">Gemma 7B</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Temperature: {formData.temperature}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Max Tokens</label>
                <input
                  type="number"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 bg-background border border-input rounded text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Cor</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-9 bg-background border border-input rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2">
              <button
                onClick={editingAgent ? handleUpdateAgent : handleCreateAgent}
                disabled={isCreating}
                className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {isCreating ? 'Salvando...' : (editingAgent ? 'Atualizar' : 'Criar')}
              </button>
              <button
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Agentes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {agents.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Nenhum agente criado ainda</p>
            <p className="text-sm mt-2">Clique em "Novo Agente" para começar</p>
          </div>
        ) : (
          agents.map(agent => (
            <div
              key={agent.id}
              className="p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
              style={{ borderLeftColor: agent.color, borderLeftWidth: '3px' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{agent.avatar_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{agent.name}</h3>
                      {agent.is_default && (
                        <FiStar className="w-4 h-4 text-yellow-500 fill-yellow-500" title="Padrão" />
                      )}
                    </div>
                    {agent.description && (
                      <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{agent.model}</span>
                      <span>•</span>
                      <span>T: {agent.temperature}</span>
                      <span>•</span>
                      <span>{agent.usage_count} uso(s)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onSelectAgent && (
                    <button
                      onClick={() => onSelectAgent(agent.id)}
                      className="p-2 hover:bg-primary/10 rounded-lg"
                      title="Conversar"
                    >
                      <FiMessageSquare className="w-4 h-4" />
                    </button>
                  )}
                  {!agent.is_default && (
                    <button
                      onClick={() => handleSetDefault(agent.id)}
                      className="p-2 hover:bg-yellow-500/10 rounded-lg"
                      title="Definir como padrão"
                    >
                      <FiStar className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEditAgent(agent)}
                    className="p-2 hover:bg-blue-500/10 rounded-lg"
                    title="Editar"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg"
                    title="Deletar"
                  >
                    <FiTrash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Prompt preview (expandível) */}
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Ver prompt do sistema
                </summary>
                <pre className="mt-2 p-2 bg-background/50 rounded text-xs overflow-auto max-h-32">
                  {agent.system_prompt}
                </pre>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
