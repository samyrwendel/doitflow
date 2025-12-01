import { useState, useEffect, useCallback } from 'react'
import {
  FiDollarSign, FiTruck, FiPlus, FiTrash2, FiEdit2,
  FiRefreshCw, FiFileText, FiUpload, FiCheck, FiX,
  FiCalendar, FiMapPin, FiClock, FiUser, FiImage, FiDatabase
} from 'react-icons/fi'

interface ExpenseGroup {
  id: string
  group_jid: string
  group_name: string
  device_id: string
  is_active: boolean
  initial_balance: number
  current_balance: number
  period_start: string
  period_end?: string
  created_at: string
}

interface ExpenseRide {
  id: string
  group_id: string
  provider: string
  ride_date: string
  ride_time?: string
  origin?: string
  destination?: string
  cost: number
  sender_name?: string
  status: 'pending' | 'approved' | 'rejected' | 'duplicate'
  confidence_score?: number
  created_at: string
}

interface ExpenseStats {
  total_rides: number
  total_cost: number
  avg_cost: number
  min_cost: number
  max_cost: number
  by_provider: Array<{ provider: string; rides: number; total_cost: number }>
  by_person: Array<{ sender_name: string; rides: number; total_cost: number }>
  by_day: Array<{ ride_date: string; rides: number; total_cost: number }>
  latest_balance: number
  latest_balance_date?: string
}

interface WhatsAppDevice {
  id: string
  name: string
}

interface WhatsAppGroup {
  id: string
  name: string
  description?: string
  participants_count?: number
}

interface ExpenseTrackerPanelProps {
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const PROVIDERS = [
  { value: 'uber', label: 'Uber', color: 'bg-black' },
  { value: '99', label: '99', color: 'bg-yellow-500' },
  { value: 'indriver', label: 'inDriver', color: 'bg-green-600' },
  { value: 'cabify', label: 'Cabify', color: 'bg-purple-600' },
  { value: 'outro', label: 'Outro', color: 'bg-gray-500' }
]

const STATUS_COLORS = {
  pending: 'bg-yellow-600',
  approved: 'bg-green-600',
  rejected: 'bg-red-600',
  duplicate: 'bg-gray-600'
}

const STATUS_LABELS = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  duplicate: 'Duplicado'
}

export function ExpenseTrackerPanel({ authenticatedFetch }: ExpenseTrackerPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rides' | 'groups' | 'upload'>('dashboard')
  const [groups, setGroups] = useState<ExpenseGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [rides, setRides] = useState<ExpenseRide[]>([])
  const [devices, setDevices] = useState<WhatsAppDevice[]>([])
  const [stats, setStats] = useState<ExpenseStats | null>(null)
  const [loading, setLoading] = useState(false)

  // Forms
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [showRideForm, setShowRideForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ExpenseGroup | null>(null)

  const [groupForm, setGroupForm] = useState({
    group_jid: '',
    group_name: '',
    device_id: '',
    initial_balance: 0
  })

  const [rideForm, setRideForm] = useState({
    provider: 'uber',
    ride_date: new Date().toISOString().split('T')[0],
    ride_time: '',
    origin: '',
    destination: '',
    cost: 0,
    image_base64: ''
  })

  // Upload image analysis
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  // WhatsApp groups list
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)

  // Load devices
  const loadDevices = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/whatsapp-devices')
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setDevices(data)
        } else if (data.devices) {
          setDevices(data.devices)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error)
    }
  }, [authenticatedFetch])

  // Load WhatsApp groups from device
  const loadWhatsappGroups = useCallback(async (deviceId: string) => {
    if (!deviceId) {
      setWhatsappGroups([])
      return
    }
    setLoadingGroups(true)
    try {
      const response = await authenticatedFetch(`/api/whatsapp-devices/${deviceId}/groups`)
      if (response.ok) {
        const data = await response.json()
        setWhatsappGroups(Array.isArray(data) ? data : [])
      } else {
        console.error('Erro ao carregar grupos WhatsApp')
        setWhatsappGroups([])
      }
    } catch (error) {
      console.error('Erro ao carregar grupos WhatsApp:', error)
      setWhatsappGroups([])
    }
    setLoadingGroups(false)
  }, [authenticatedFetch])

  // Load groups
  const loadGroups = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/expenses/groups')
      if (response.ok) {
        const data = await response.json()
        setGroups(data)
        if (data.length > 0 && !selectedGroupId) {
          setSelectedGroupId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error)
    }
  }, [authenticatedFetch, selectedGroupId])

  // Load rides
  const loadRides = useCallback(async () => {
    if (!selectedGroupId) return
    try {
      const response = await authenticatedFetch(`/api/expenses/groups/${selectedGroupId}/rides`)
      if (response.ok) {
        const data = await response.json()
        setRides(data)
      }
    } catch (error) {
      console.error('Erro ao carregar corridas:', error)
    }
  }, [authenticatedFetch, selectedGroupId])

  // Load stats
  const loadStats = useCallback(async () => {
    if (!selectedGroupId) return
    try {
      const response = await authenticatedFetch(`/api/expenses/groups/${selectedGroupId}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }, [authenticatedFetch, selectedGroupId])

  // Initial load
  useEffect(() => {
    loadGroups()
    loadDevices()
  }, [loadGroups, loadDevices])

  // Load data when group changes
  useEffect(() => {
    if (selectedGroupId) {
      loadRides()
      loadStats()
    }
  }, [selectedGroupId, loadRides, loadStats])

  // Handlers
  const handleSaveGroup = async () => {
    setLoading(true)
    try {
      const method = editingGroup ? 'PUT' : 'POST'
      const url = editingGroup
        ? `/api/expenses/groups/${editingGroup.id}`
        : '/api/expenses/groups'

      const response = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupForm)
      })

      if (response.ok) {
        await loadGroups()
        setShowGroupForm(false)
        setEditingGroup(null)
        setGroupForm({ group_jid: '', group_name: '', device_id: '', initial_balance: 0 })
      }
    } catch (error) {
      console.error('Erro ao salvar grupo:', error)
    }
    setLoading(false)
  }

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este grupo?')) return
    try {
      await authenticatedFetch(`/api/expenses/groups/${id}`, { method: 'DELETE' })
      await loadGroups()
      if (selectedGroupId === id) {
        setSelectedGroupId('')
      }
    } catch (error) {
      console.error('Erro ao excluir grupo:', error)
    }
  }

  const handleSaveRide = async () => {
    if (!selectedGroupId) return
    setLoading(true)
    try {
      const response = await authenticatedFetch(`/api/expenses/groups/${selectedGroupId}/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rideForm)
      })

      if (response.ok) {
        await loadRides()
        await loadStats()
        setShowRideForm(false)
        setRideForm({
          provider: 'uber',
          ride_date: new Date().toISOString().split('T')[0],
          ride_time: '',
          origin: '',
          destination: '',
          cost: 0,
          image_base64: ''
        })
      }
    } catch (error) {
      console.error('Erro ao salvar corrida:', error)
    }
    setLoading(false)
  }

  const handleUpdateRideStatus = async (rideId: string, status: string) => {
    try {
      await authenticatedFetch(`/api/expenses/rides/${rideId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      await loadRides()
      await loadStats()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const handleDeleteRide = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta corrida?')) return
    try {
      await authenticatedFetch(`/api/expenses/rides/${id}`, { method: 'DELETE' })
      await loadRides()
      await loadStats()
    } catch (error) {
      console.error('Erro ao excluir corrida:', error)
    }
  }

  // Image upload and analysis
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setUploadedImage(base64)
      setAnalysisResult(null)
    }
    reader.readAsDataURL(file)
  }

  const handleAnalyzeImage = async () => {
    if (!uploadedImage) return
    setAnalyzing(true)
    try {
      const response = await authenticatedFetch('/api/expenses/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: uploadedImage })
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysisResult(data)

        // Preencher o formulário com os dados extraídos
        if (data.tipo === 'corrida') {
          setRideForm({
            provider: data.provedor || 'outro',
            ride_date: data.data || new Date().toISOString().split('T')[0],
            ride_time: data.hora || '',
            origin: data.origem || '',
            destination: data.destino || '',
            cost: data.valor || 0,
            image_base64: uploadedImage
          })
          setActiveTab('rides')
          setShowRideForm(true)
        }
      }
    } catch (error) {
      console.error('Erro ao analisar imagem:', error)
    }
    setAnalyzing(false)
  }

  const handleSyncRAG = async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch('/api/expenses/sync-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'RAG sincronizado com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao sincronizar RAG:', error)
      alert('Erro ao sincronizar com o RAG')
    }
    setLoading(false)
  }

  const handleGenerateReport = async () => {
    if (!selectedGroupId) return
    const startDate = prompt('Data início (YYYY-MM-DD):', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    const endDate = prompt('Data fim (YYYY-MM-DD):', new Date().toISOString().split('T')[0])

    if (!startDate || !endDate) return

    try {
      const response = await authenticatedFetch(`/api/expenses/groups/${selectedGroupId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: endDate })
      })

      if (response.ok) {
        const data = await response.json()
        // Abrir relatório em nova aba
        const blob = new Blob([data.report_content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
    }
  }

  const selectedGroup = groups.find(g => g.id === selectedGroupId)

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Seletor de Grupo */}
          <div className="flex-1">
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
            >
              <option value="">Selecione um grupo...</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.group_name}</option>
              ))}
            </select>
          </div>

          {/* Saldo Atual */}
          {selectedGroup && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
              <FiDollarSign className="text-green-400" />
              <span className="text-sm">Saldo:</span>
              <span className={`font-bold ${selectedGroup.current_balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                R$ {selectedGroup.current_balance.toFixed(2)}
              </span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: FiDollarSign },
              { id: 'rides', label: 'Corridas', icon: FiTruck },
              { id: 'groups', label: 'Grupos', icon: FiUser },
              { id: 'upload', label: 'Upload', icon: FiUpload }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <tab.icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {/* Dashboard */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-4">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">Total Corridas</div>
                <div className="text-xl font-bold">{stats.total_rides}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">Total Gasto</div>
                <div className="text-xl font-bold text-red-400">R$ {stats.total_cost?.toFixed(2)}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">Media/Corrida</div>
                <div className="text-xl font-bold">R$ {stats.avg_cost?.toFixed(2)}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">Saldo Atual</div>
                <div className={`text-xl font-bold ${stats.latest_balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  R$ {stats.latest_balance?.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Por Provedor */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">Por Aplicativo</h3>
              <div className="space-y-2">
                {stats.by_provider.map(p => (
                  <div key={p.provider} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${PROVIDERS.find(pr => pr.value === p.provider)?.color || 'bg-gray-500'}`} />
                      <span className="text-sm capitalize">{p.provider}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-400">{p.rides} corridas</span>
                      <span className="ml-2 font-semibold">R$ {p.total_cost?.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Por Pessoa */}
            {stats.by_person.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">Por Pessoa</h3>
                <div className="space-y-2">
                  {stats.by_person.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm">{p.sender_name || 'Desconhecido'}</span>
                      <div className="text-sm">
                        <span className="text-gray-400">{p.rides} corridas</span>
                        <span className="ml-2 font-semibold">R$ {p.total_cost?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botoes de Acao */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleGenerateReport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
              >
                <FiFileText /> Gerar Relatorio
              </button>
              <button
                onClick={handleSyncRAG}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm"
              >
                <FiDatabase /> {loading ? 'Sincronizando...' : 'Sincronizar RAG'}
              </button>
            </div>
          </div>
        )}

        {/* Corridas */}
        {activeTab === 'rides' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Corridas ({rides.length})</h3>
              <button
                onClick={() => setShowRideForm(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
                disabled={!selectedGroupId}
              >
                <FiPlus /> Adicionar
              </button>
            </div>

            {/* Form de Nova Corrida */}
            {showRideForm && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-3">Nova Corrida</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Aplicativo</label>
                    <select
                      value={rideForm.provider}
                      onChange={e => setRideForm({ ...rideForm, provider: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    >
                      {PROVIDERS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={rideForm.cost}
                      onChange={e => setRideForm({ ...rideForm, cost: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Data</label>
                    <input
                      type="date"
                      value={rideForm.ride_date}
                      onChange={e => setRideForm({ ...rideForm, ride_date: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Hora</label>
                    <input
                      type="time"
                      value={rideForm.ride_time}
                      onChange={e => setRideForm({ ...rideForm, ride_time: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Origem</label>
                    <input
                      type="text"
                      value={rideForm.origin}
                      onChange={e => setRideForm({ ...rideForm, origin: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                      placeholder="Endereco de partida"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Destino</label>
                    <input
                      type="text"
                      value={rideForm.destination}
                      onChange={e => setRideForm({ ...rideForm, destination: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                      placeholder="Endereco de chegada"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSaveRide}
                    disabled={loading}
                    className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setShowRideForm(false)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de Corridas */}
            <div className="space-y-2">
              {rides.map(ride => (
                <div key={ride.id} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${PROVIDERS.find(p => p.value === ride.provider)?.color || 'bg-gray-500'}`} />
                      <span className="font-semibold capitalize">{ride.provider}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[ride.status]}`}>
                        {STATUS_LABELS[ride.status]}
                      </span>
                    </div>
                    <span className="font-bold text-lg">R$ {ride.cost.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <FiCalendar size={12} />
                        {new Date(ride.ride_date).toLocaleDateString('pt-BR')}
                        {ride.ride_time && ` ${ride.ride_time}`}
                      </span>
                      {ride.sender_name && (
                        <span className="flex items-center gap-1">
                          <FiUser size={12} />
                          {ride.sender_name}
                        </span>
                      )}
                    </div>
                    {(ride.origin || ride.destination) && (
                      <div className="flex items-center gap-1">
                        <FiMapPin size={12} />
                        {ride.origin && <span>{ride.origin}</span>}
                        {ride.origin && ride.destination && <span>→</span>}
                        {ride.destination && <span>{ride.destination}</span>}
                      </div>
                    )}
                  </div>
                  {/* Acoes */}
                  <div className="flex gap-1 mt-2 justify-end">
                    {ride.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateRideStatus(ride.id, 'approved')}
                          className="p-1.5 text-green-400 hover:bg-gray-700 rounded"
                          title="Aprovar"
                        >
                          <FiCheck size={16} />
                        </button>
                        <button
                          onClick={() => handleUpdateRideStatus(ride.id, 'rejected')}
                          className="p-1.5 text-red-400 hover:bg-gray-700 rounded"
                          title="Rejeitar"
                        >
                          <FiX size={16} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteRide(ride.id)}
                      className="p-1.5 text-red-400 hover:bg-gray-700 rounded"
                      title="Excluir"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {rides.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma corrida registrada ainda.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grupos */}
        {activeTab === 'groups' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Grupos Monitorados ({groups.length})</h3>
              <button
                onClick={() => {
                  setEditingGroup(null)
                  setGroupForm({ group_jid: '', group_name: '', device_id: '', initial_balance: 0 })
                  setShowGroupForm(true)
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
              >
                <FiPlus /> Novo Grupo
              </button>
            </div>

            {/* Form de Grupo */}
            {showGroupForm && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-3">{editingGroup ? 'Editar' : 'Novo'} Grupo</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Dispositivo WhatsApp *</label>
                    <select
                      value={groupForm.device_id}
                      onChange={e => {
                        const deviceId = e.target.value
                        setGroupForm({ ...groupForm, device_id: deviceId, group_jid: '', group_name: '' })
                        loadWhatsappGroups(deviceId)
                      }}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    >
                      <option value="">Selecione o dispositivo...</option>
                      {devices.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Grupo WhatsApp *</label>
                    <select
                      value={groupForm.group_jid}
                      onChange={e => {
                        const selectedGroup = whatsappGroups.find(g => g.id === e.target.value)
                        setGroupForm({
                          ...groupForm,
                          group_jid: e.target.value,
                          group_name: selectedGroup?.name || groupForm.group_name
                        })
                      }}
                      disabled={!groupForm.device_id || loadingGroups}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm disabled:opacity-50"
                    >
                      <option value="">
                        {loadingGroups ? 'Carregando grupos...' : !groupForm.device_id ? 'Selecione um dispositivo primeiro' : 'Selecione o grupo...'}
                      </option>
                      {whatsappGroups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name} {g.participants_count ? `(${g.participants_count} membros)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nome de Exibição</label>
                    <input
                      type="text"
                      value={groupForm.group_name}
                      onChange={e => setGroupForm({ ...groupForm, group_name: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                      placeholder="Nome para identificar o grupo"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Saldo Inicial (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={groupForm.initial_balance}
                      onChange={e => setGroupForm({ ...groupForm, initial_balance: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSaveGroup}
                    disabled={loading}
                    className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setShowGroupForm(false)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de Grupos */}
            <div className="space-y-2">
              {groups.map(group => (
                <div key={group.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{group.group_name}</h4>
                      <p className="text-xs text-gray-400">{group.group_jid}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${group.is_active ? 'bg-green-600' : 'bg-gray-600'}`}>
                        {group.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                      <button
                        onClick={() => {
                          setEditingGroup(group)
                          setGroupForm({
                            group_jid: group.group_jid,
                            group_name: group.group_name,
                            device_id: group.device_id,
                            initial_balance: group.initial_balance
                          })
                          loadWhatsappGroups(group.device_id)
                          setShowGroupForm(true)
                        }}
                        className="p-1.5 text-blue-400 hover:bg-gray-700 rounded"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1.5 text-red-400 hover:bg-gray-700 rounded"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Saldo Inicial:</span>
                      <span className="ml-2">R$ {group.initial_balance.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Saldo Atual:</span>
                      <span className={`ml-2 ${group.current_balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        R$ {group.current_balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {groups.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Nenhum grupo cadastrado. Clique em "Novo Grupo" para começar.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload de Imagem */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Analisar Print de Corrida</h3>
              <p className="text-sm text-gray-400 mb-4">
                Envie um print de corrida do Uber ou 99 para extrair automaticamente os dados.
              </p>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <FiImage size={32} className="text-gray-500" />
                  <span className="text-sm text-gray-400">
                    Clique para selecionar uma imagem
                  </span>
                </label>
              </div>

              {/* Preview */}
              {uploadedImage && (
                <div className="mt-4">
                  <img
                    src={uploadedImage}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      onClick={handleAnalyzeImage}
                      disabled={analyzing}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
                    >
                      {analyzing ? (
                        <>
                          <FiRefreshCw className="animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <FiRefreshCw />
                          Analisar Imagem
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setUploadedImage(null)
                        setAnalysisResult(null)
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              )}

              {/* Resultado da Analise */}
              {analysisResult && (
                <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                  <h4 className="font-semibold mb-2">Dados Extraidos:</h4>
                  <pre className="text-xs text-gray-300 overflow-auto">
                    {JSON.stringify(analysisResult, null, 2)}
                  </pre>
                  {analysisResult.tipo === 'corrida' && (
                    <p className="mt-2 text-sm text-green-400">
                      Dados copiados para o formulario de corrida. Va para a aba "Corridas" para confirmar.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sem grupo selecionado */}
        {!selectedGroupId && activeTab !== 'groups' && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <FiDollarSign size={48} className="text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum grupo selecionado</h3>
            <p className="text-sm text-gray-400 mb-4">
              Selecione um grupo acima ou crie um novo na aba "Grupos".
            </p>
            <button
              onClick={() => setActiveTab('groups')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
            >
              <FiPlus /> Criar Grupo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
