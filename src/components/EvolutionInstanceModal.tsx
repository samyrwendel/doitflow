import { useState } from 'react'
import { FiX, FiCheck } from 'react-icons/fi'

interface EvolutionInstanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: EvolutionInstanceData) => Promise<void>
}

export interface EvolutionInstanceData {
  name: string
  apiKey: string
}

export default function EvolutionInstanceModal({ isOpen, onClose, onSave }: EvolutionInstanceModalProps) {
  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSave = async () => {
    // Validação
    if (!name.trim() || !apiKey.trim()) {
      setError('Nome e API Key são obrigatórios')
      return
    }

    setError('')
    setIsSaving(true)

    try {
      await onSave({ name, apiKey })
      // Reset form
      setName('')
      setApiKey('')
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar dispositivo')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setName('')
    setApiKey('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Criar Novo Dispositivo</h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Dispositivo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: cleverson-1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Chave da Evolution API"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FiCheck size={16} />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
