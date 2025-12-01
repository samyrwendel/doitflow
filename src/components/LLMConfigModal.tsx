import React, { useState, useEffect } from 'react'
import { FiX, FiChevronDown, FiCheck, FiAlertCircle, FiLoader, FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'

interface LLMConfigModalProps {
  isOpen: boolean
  onClose: () => void
  currentModel: string
  onModelChange: (model: string) => void
}

interface LLMModel {
  id: string
  name: string
  description: string
  contextWindow: string
  pricing?: string
}

interface LLMProvider {
  id: string
  name: string
  apiKeyLabel: string
  models: LLMModel[]
}

const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: 'groq',
    name: 'Groq',
    apiKeyLabel: 'Groq API Key',
    models: [
      { id: 'llama-3.1-8b-instant', name: 'LLaMA 3.1 8B Instant', description: 'Rápido e eficiente', contextWindow: '131K', pricing: '$0.05/1M input, $0.08/1M output' },
      { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B Versatile', description: 'Alta capacidade, mais recente', contextWindow: '131K', pricing: '$0.59/1M input, $0.79/1M output' },
      { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'LLaMA 4 Maverick 17B', description: 'Mais recente (Preview)', contextWindow: '131K', pricing: '$0.20/1M input, $0.60/1M output' },
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'LLaMA 4 Scout 17B', description: 'Mais rápido (Preview)', contextWindow: '131K', pricing: '$0.11/1M input, $0.34/1M output' },
      { id: 'openai/gpt-oss-120b', name: 'OpenAI GPT-OSS 120B', description: 'Modelo aberto da OpenAI', contextWindow: '131K', pricing: '$0.15/1M input, $0.60/1M output' },
      { id: 'openai/gpt-oss-20b', name: 'OpenAI GPT-OSS 20B', description: 'Modelo aberto menor', contextWindow: '131K', pricing: '$0.075/1M input, $0.30/1M output' },
      { id: 'groq/compound', name: 'Groq Compound', description: 'Sistema com ferramentas', contextWindow: '131K', pricing: 'Gratuito' }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    apiKeyLabel: 'OpenAI API Key',
    models: [
      { id: 'gpt-5', name: 'GPT-5', description: 'Melhor modelo para coding e tarefas complexas', contextWindow: '200K', pricing: '$30/1M input, $120/1M output' },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Versão mais rápida e econômica do GPT-5', contextWindow: '200K', pricing: '$3/1M input, $12/1M output' },
      { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Versão mais rápida e econômica', contextWindow: '200K', pricing: '$1/1M input, $4/1M output' },
      { id: 'gpt-5-pro', name: 'GPT-5 Pro', description: 'Versão com respostas mais precisas', contextWindow: '200K', pricing: '$60/1M input, $240/1M output' },
      { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Modelo não-reasoning mais inteligente', contextWindow: '200K', pricing: '$20/1M input, $80/1M output' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Versão menor e mais rápida do GPT-4.1', contextWindow: '200K', pricing: '$2/1M input, $8/1M output' },
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Modelo GPT-4 otimizado', contextWindow: '128K', pricing: '$5/1M input, $15/1M output' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Versão econômica do GPT-4o', contextWindow: '128K', pricing: '$0.15/1M input, $0.60/1M output' },
      { id: 'o3', name: 'o3', description: 'Modelo de reasoning para tarefas complexas', contextWindow: '200K', pricing: '$20/1M input, $80/1M output' },
      { id: 'o3-mini', name: 'o3 Mini', description: 'Alternativa menor ao o3', contextWindow: '200K', pricing: '$2/1M input, $8/1M output' }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    apiKeyLabel: 'Anthropic API Key',
    models: [
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', description: 'Mais inteligente para agentes e coding', contextWindow: '200K', pricing: '$3/1M input, $15/1M output' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', description: 'Mais rápido com inteligência de fronteira', contextWindow: '200K', pricing: '$1/1M input, $5/1M output' },
      { id: 'claude-opus-4-1', name: 'Claude Opus 4.1', description: 'Excepcional para reasoning especializado', contextWindow: '200K', pricing: '$15/1M input, $75/1M output' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Modelo anterior ainda poderoso', contextWindow: '200K', pricing: '$3/1M input, $15/1M output' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Máxima inteligência (Legacy)', contextWindow: '200K', pricing: '$15/1M input, $75/1M output' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanceado (Legacy)', contextWindow: '200K', pricing: '$3/1M input, $15/1M output' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Rápido e econômico (Legacy)', contextWindow: '200K', pricing: '$0.25/1M input, $1.25/1M output' }
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    apiKeyLabel: 'DeepSeek API Key',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3.2 Chat', description: 'Modo não-thinking, atualizado', contextWindow: '64K', pricing: '$0.14/1M input, $0.28/1M output' },
      { id: 'deepseek-reasoner', name: 'DeepSeek V3.2 Reasoner', description: 'Modo thinking, raciocínio avançado', contextWindow: '64K', pricing: '$0.55/1M input, $2.19/1M output' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', description: 'Especializado em código', contextWindow: '16K', pricing: '$0.14/1M input, $0.28/1M output' }
    ]
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    apiKeyLabel: 'Mistral API Key',
    models: [
      { id: 'magistral-medium-1-2', name: 'Magistral Medium 1.2', description: 'Modelo de reasoning multimodal de fronteira', contextWindow: '128K', pricing: '$4/1M input, $12/1M output' },
      { id: 'mistral-medium-3-1', name: 'Mistral Medium 3.1', description: 'Modelo multimodal de fronteira', contextWindow: '128K', pricing: '$2.7/1M input, $8.1/1M output' },
      { id: 'codestral-25-08', name: 'Codestral 25.08', description: 'Modelo avançado para coding', contextWindow: '32K', pricing: '$1/1M input, $3/1M output' },
      { id: 'mistral-small-3-2', name: 'Mistral Small 3.2', description: 'Modelo pequeno atualizado', contextWindow: '128K', pricing: '$1/1M input, $3/1M output' },
      { id: 'mistral-large-2-1', name: 'Mistral Large 2.1', description: 'Modelo grande para tarefas complexas', contextWindow: '128K', pricing: '$3/1M input, $9/1M output' },
      { id: 'pixtral-large', name: 'Pixtral Large', description: 'Modelo multimodal de fronteira', contextWindow: '128K', pricing: '$3/1M input, $9/1M output' }
    ]
  },
  {
    id: 'google',
    name: 'Google AI',
    apiKeyLabel: 'Google API Key',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Modelo mais avançado com thinking', contextWindow: '1M', pricing: '$3.50/1M input, $10.50/1M output' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Melhor custo-benefício com thinking', contextWindow: '1M', pricing: '$0.075/1M input, $0.30/1M output' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Modelo mais rápido e econômico', contextWindow: '1M', pricing: '$0.0375/1M input, $0.15/1M output' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Modelo de segunda geração', contextWindow: '1M', pricing: '$0.075/1M input, $0.30/1M output' },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Versão pequena de segunda geração', contextWindow: '1M', pricing: '$0.0375/1M input, $0.15/1M output' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Modelo avançado (Legacy)', contextWindow: '1M', pricing: '$3.50/1M input, $10.50/1M output' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Rápido (Legacy)', contextWindow: '1M', pricing: '$0.075/1M input, $0.30/1M output' }
    ]
  }
]

const LLMConfigModal: React.FC<LLMConfigModalProps> = ({
  isOpen,
  onClose,
  currentModel,
  onModelChange
}) => {
  const { authenticatedFetch } = useAuth()
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(LLM_PROVIDERS[0])
  const [selectedModel, setSelectedModel] = useState<LLMModel>(LLM_PROVIDERS[0].models[0])
  const [apiKey, setApiKey] = useState('')
  const [savedApiKeys, setSavedApiKeys] = useState<Record<string, string>>({})
  const [showApiKey, setShowApiKey] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [isLoading, setIsLoading] = useState(true)

  // Carregar API keys do usuário do banco de dados
  const loadUserApiKeys = async () => {
    try {
      setIsLoading(true)
      const response = await authenticatedFetch('/api/auth/api-keys/modal')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const keys: Record<string, string> = {}
          data.apiKeys.forEach((key: any) => {
            keys[key.provider] = key.api_key
          })
          setSavedApiKeys(keys)
          console.log('✅ API keys carregadas:', Object.keys(keys))
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar API keys:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadUserApiKeys()
    }
  }, [isOpen])

  useEffect(() => {
    // Encontrar o provider e modelo atual
    for (const provider of LLM_PROVIDERS) {
      const model = provider.models.find(m => m.id === currentModel)
      if (model) {
        setSelectedProvider(provider)
        setSelectedModel(model)
        setApiKey(savedApiKeys[provider.id] || '')
        break
      }
    }
  }, [currentModel, savedApiKeys])

  const handleProviderChange = (providerId: string) => {
    const provider = LLM_PROVIDERS.find(p => p.id === providerId)
    if (provider) {
      setSelectedProvider(provider)
      setSelectedModel(provider.models[0])
      setApiKey(savedApiKeys[providerId] || '')
      setValidationStatus('idle')
    }
  }

  const handleModelChange = (modelId: string) => {
    const model = selectedProvider.models.find(m => m.id === modelId)
    if (model) {
      setSelectedModel(model)
      setValidationStatus('idle')
    }
  }

  const validateApiKey = async () => {
    if (!apiKey.trim()) return
    
    setIsValidating(true)
    setValidationStatus('idle')

    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      const isValid = apiKey.length > 10
      setValidationStatus(isValid ? 'valid' : 'invalid')
    } catch (error) {
      setValidationStatus('invalid')
    } finally {
      setIsValidating(false)
    }
  }

  const saveConfiguration = async () => {
    try {
      // Salvar API key no banco de dados
      const response = await authenticatedFetch('/api/auth/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          provider: selectedProvider.id,
          apiKey: apiKey
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Atualizar estado local
          const newSavedKeys = { ...savedApiKeys, [selectedProvider.id]: apiKey }
          setSavedApiKeys(newSavedKeys)
          
          // Também manter no localStorage como backup
          localStorage.setItem('llm-api-keys', JSON.stringify(newSavedKeys))
          
          onModelChange(selectedModel.id)
          onClose()
          
          console.log('✅ API key salva no banco:', selectedProvider.name)
        } else {
          console.error('❌ Erro ao salvar API key:', data.error)
          alert('Erro ao salvar API key. Tente novamente.')
        }
      }
    } catch (error) {
      console.error('❌ Erro na requisição:', error)
      alert('Erro de conexão. Tente novamente.')
    }
  }

  if (!isOpen) return null

  const hasApiKey = savedApiKeys[selectedProvider.id]
  const isCurrentApiKey = apiKey === savedApiKeys[selectedProvider.id]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-auto border border-gray-200 transform transition-all duration-200 ease-out animate-in fade-in-0 zoom-in-95">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configurar LLM</h2>
            <p className="text-sm text-gray-500 mt-1">Escolha o provedor, modelo e configure a API Key</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <FiLoader className="w-6 h-6 animate-spin text-blue-500 mr-3" />
              <span className="text-gray-600">Carregando configurações...</span>
            </div>
          ) : (
            <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provedor LLM
            </label>
            <div className="relative">
              <select
                value={selectedProvider.id}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full pl-4 pr-10 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer font-medium text-gray-900"
              >
                {LLM_PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id} className="text-gray-900">
                    {provider.name}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modelo {selectedProvider.name}
            </label>
            <div className="relative">
              <select
                value={selectedModel.id}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full pl-4 pr-10 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer font-medium text-gray-900"
              >
                {selectedProvider.models.map((model) => (
                  <option key={model.id} value={model.id} className="text-gray-900">
                    {model.name}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-700">
                <p><strong>Descrição:</strong> {selectedModel.description}</p>
                <p><strong>Contexto:</strong> {selectedModel.contextWindow}</p>
                {selectedModel.pricing && <p><strong>Preço:</strong> {selectedModel.pricing}</p>}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {selectedProvider.apiKeyLabel}
              {hasApiKey && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  <FiCheck className="w-3 h-3 mr-1" />
                  Configurada
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Digite sua ${selectedProvider.apiKeyLabel}`}
                className="w-full pl-4 pr-20 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono text-gray-900"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                {validationStatus === 'valid' && <FiCheck className="w-5 h-5 text-green-500" />}
                {validationStatus === 'invalid' && <FiAlertCircle className="w-5 h-5 text-red-500" />}
                {isValidating && <FiLoader className="w-5 h-5 text-blue-500 animate-spin" />}
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {showApiKey ? <FiEyeOff className="w-4 h-4 text-gray-400" /> : <FiEye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>
            
            {apiKey.trim() && !isCurrentApiKey && (
              <button
                onClick={validateApiKey}
                disabled={isValidating}
                className="mt-2 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors disabled:opacity-50"
              >
                {isValidating ? 'Validando...' : 'Testar API Key'}
              </button>
            )}
            
            {validationStatus === 'valid' && (
              <p className="mt-2 text-sm text-green-600">✅ API Key válida e funcional</p>
            )}
            {validationStatus === 'invalid' && (
              <p className="mt-2 text-sm text-red-600">❌ API Key inválida ou sem saldo</p>
            )}
          </div>
            </>
          )}
        </div>

        <div className="flex justify-between items-center p-6 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <div className="text-sm text-gray-600">
            <strong>Atual:</strong> {selectedProvider.name} → {selectedModel.name}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={saveConfiguration}
              disabled={!apiKey.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Salvar Configuração
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LLMConfigModal
