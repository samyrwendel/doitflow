import { useState, useEffect, useCallback } from 'react'
import { API_ENDPOINTS } from '../lib/api'
import {
  FiUsers, FiCalendar, FiClock, FiPlay, FiPause, FiPlus,
  FiEdit2, FiTrash2, FiSend, FiActivity, FiMessageCircle,
  FiPhone, FiCheckCircle, FiXCircle, FiAlertCircle
} from 'react-icons/fi'

// ============================================
// INTERFACES
// ============================================

interface TeamMember {
  id: string
  name: string
  phone_number: string
  role?: string
  department?: string
  timezone: string
  is_active: boolean
  created_at: string
}

interface Schedule {
  id: string
  name: string
  schedule_type: string
  time_of_day: string
  days_of_week: number[]
  team_member_id: string
  team_member_name?: string
  phone_number?: string
  device_id: string
  device_name?: string
  initial_message: string
  followup_message?: string
  is_active: boolean
  next_trigger_at?: string
  last_triggered_at?: string
}

interface Execution {
  id: string
  schedule_name: string
  schedule_type: string
  team_member_name: string
  status: string
  message_sent?: string
  response_received?: string
  triggered_at: string
  responded_at?: string
  followup_count: number
}

interface Activity {
  id: string
  team_member_name: string
  activity_type: string
  description: string
  priority?: string
  reported_date: string
  status: string
}

interface Device {
  id: string
  name: string
}

interface TeamSchedulerPanelProps {
  authenticatedFetch: any
}

// ============================================
// CONSTANTES
// ============================================

const SCHEDULE_TYPES = [
  { value: 'daily_start', label: 'Inicio do Dia', icon: '🌅' },
  { value: 'daily_end', label: 'Fim do Dia', icon: '🌆' },
  { value: 'weekly', label: 'Semanal', icon: '📅' },
  { value: 'custom', label: 'Personalizado', icon: '⚙️' }
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' }
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-500',
  sent: 'bg-blue-500',
  awaiting_response: 'bg-yellow-500',
  responded: 'bg-green-500',
  no_response: 'bg-red-500',
  completed: 'bg-green-600',
  failed: 'bg-red-600'
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  awaiting_response: 'Aguardando',
  responded: 'Respondido',
  no_response: 'Sem Resposta',
  completed: 'Concluido',
  failed: 'Falhou'
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function TeamSchedulerPanel({ authenticatedFetch }: TeamSchedulerPanelProps) {
  // State
  const [activeTab, setActiveTab] = useState<'members' | 'schedules' | 'executions' | 'activities'>('schedules')
  const [isLoading, setIsLoading] = useState(true)
  const [schedulerStatus, setSchedulerStatus] = useState<{ isRunning: boolean }>({ isRunning: false })

  // Data states
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [devices, setDevices] = useState<Device[]>([])

  // Form states
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)

  // Form data
  const [memberForm, setMemberForm] = useState({
    name: '',
    phone_number: '',
    role: '',
    department: ''
  })

  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    schedule_type: 'daily_start',
    time_of_day: '08:00',
    days_of_week: [1, 2, 3, 4, 5],
    team_member_id: '',
    device_id: '',
    initial_message: '',
    followup_message: '',
    wait_for_response: true,
    response_timeout_minutes: 60,
    max_followups: 2
  })

  // ============================================
  // LOAD FUNCTIONS
  // ============================================

  const loadTeamMembers = useCallback(async () => {
    try {
      const response = await authenticatedFetch(API_ENDPOINTS.SCHEDULER_TEAM_MEMBERS)
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data)
      }
    } catch (error) {
      console.error('Erro ao carregar membros:', error)
    }
  }, [authenticatedFetch])

  const loadSchedules = useCallback(async () => {
    try {
      const response = await authenticatedFetch(API_ENDPOINTS.SCHEDULER_SCHEDULES)
      if (response.ok) {
        const data = await response.json()
        setSchedules(data)
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    }
  }, [authenticatedFetch])

  const loadExecutions = useCallback(async () => {
    try {
      const response = await authenticatedFetch(API_ENDPOINTS.SCHEDULER_EXECUTIONS)
      if (response.ok) {
        const data = await response.json()
        setExecutions(data)
      }
    } catch (error) {
      console.error('Erro ao carregar execucoes:', error)
    }
  }, [authenticatedFetch])

  const loadActivities = useCallback(async () => {
    try {
      const response = await authenticatedFetch(API_ENDPOINTS.SCHEDULER_ACTIVITIES)
      if (response.ok) {
        const data = await response.json()
        setActivities(data)
      }
    } catch (error) {
      console.error('Erro ao carregar atividades:', error)
    }
  }, [authenticatedFetch])

  const loadDevices = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/whatsapp-devices')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDevices(data.devices || [])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error)
    }
  }, [authenticatedFetch])

  const loadSchedulerStatus = useCallback(async () => {
    try {
      const response = await authenticatedFetch(API_ENDPOINTS.SCHEDULER_STATUS)
      if (response.ok) {
        const data = await response.json()
        setSchedulerStatus(data)
      }
    } catch (error) {
      console.error('Erro ao verificar status do scheduler:', error)
    }
  }, [authenticatedFetch])

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true)
      await Promise.all([
        loadTeamMembers(),
        loadSchedules(),
        loadExecutions(),
        loadActivities(),
        loadDevices(),
        loadSchedulerStatus()
      ])
      setIsLoading(false)
    }
    loadAll()
  }, [loadTeamMembers, loadSchedules, loadExecutions, loadActivities, loadDevices, loadSchedulerStatus])

  // ============================================
  // HANDLER FUNCTIONS
  // ============================================

  const handleToggleScheduler = async () => {
    try {
      const endpoint = schedulerStatus.isRunning ? API_ENDPOINTS.SCHEDULER_STOP : API_ENDPOINTS.SCHEDULER_START
      const response = await authenticatedFetch(endpoint, { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        setSchedulerStatus(data.status)
      }
    } catch (error) {
      console.error('Erro ao alternar scheduler:', error)
    }
  }

  const handleSaveMember = async () => {
    try {
      const url = editingMember
        ? `${API_ENDPOINTS.SCHEDULER_TEAM_MEMBERS}/${editingMember.id}`
        : API_ENDPOINTS.SCHEDULER_TEAM_MEMBERS

      const response = await authenticatedFetch(url, {
        method: editingMember ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberForm)
      })

      if (response.ok) {
        await loadTeamMembers()
        setShowMemberForm(false)
        setEditingMember(null)
        setMemberForm({ name: '', phone_number: '', role: '', department: '' })
      }
    } catch (error) {
      console.error('Erro ao salvar membro:', error)
    }
  }

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return

    try {
      const response = await authenticatedFetch(`${API_ENDPOINTS.SCHEDULER_TEAM_MEMBERS}/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        await loadTeamMembers()
      }
    } catch (error) {
      console.error('Erro ao deletar membro:', error)
    }
  }

  const handleSaveSchedule = async () => {
    try {
      const url = editingSchedule
        ? `${API_ENDPOINTS.SCHEDULER_SCHEDULES}/${editingSchedule.id}`
        : API_ENDPOINTS.SCHEDULER_SCHEDULES

      const response = await authenticatedFetch(url, {
        method: editingSchedule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm)
      })

      if (response.ok) {
        await loadSchedules()
        setShowScheduleForm(false)
        setEditingSchedule(null)
        resetScheduleForm()
      }
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error)
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este agendamento?')) return

    try {
      const response = await authenticatedFetch(`${API_ENDPOINTS.SCHEDULER_SCHEDULES}/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        await loadSchedules()
      }
    } catch (error) {
      console.error('Erro ao deletar agendamento:', error)
    }
  }

  const handleTriggerSchedule = async (id: string) => {
    try {
      const response = await authenticatedFetch(API_ENDPOINTS.SCHEDULER_SCHEDULE_TRIGGER(id), {
        method: 'POST'
      })
      if (response.ok) {
        alert('Agendamento disparado com sucesso!')
        await loadExecutions()
      }
    } catch (error) {
      console.error('Erro ao disparar agendamento:', error)
    }
  }

  const resetScheduleForm = () => {
    setScheduleForm({
      name: '',
      schedule_type: 'daily_start',
      time_of_day: '08:00',
      days_of_week: [1, 2, 3, 4, 5],
      team_member_id: '',
      device_id: '',
      initial_message: '',
      followup_message: '',
      wait_for_response: true,
      response_timeout_minutes: 60,
      max_followups: 2
    })
  }

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member)
    setMemberForm({
      name: member.name,
      phone_number: member.phone_number,
      role: member.role || '',
      department: member.department || ''
    })
    setShowMemberForm(true)
  }

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setScheduleForm({
      name: schedule.name,
      schedule_type: schedule.schedule_type,
      time_of_day: schedule.time_of_day,
      days_of_week: schedule.days_of_week || [1, 2, 3, 4, 5],
      team_member_id: schedule.team_member_id,
      device_id: schedule.device_id,
      initial_message: schedule.initial_message,
      followup_message: schedule.followup_message || '',
      wait_for_response: true,
      response_timeout_minutes: 60,
      max_followups: 2
    })
    setShowScheduleForm(true)
  }

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FiCalendar className="text-blue-400" />
            Agendamento de Equipe
          </h2>
          <button
            onClick={handleToggleScheduler}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              schedulerStatus.isRunning
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {schedulerStatus.isRunning ? (
              <>
                <FiPause /> Scheduler Ativo
              </>
            ) : (
              <>
                <FiPlay /> Scheduler Parado
              </>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'schedules', label: 'Agendamentos', icon: FiCalendar },
            { id: 'members', label: 'Equipe', icon: FiUsers },
            { id: 'executions', label: 'Historico', icon: FiActivity },
            { id: 'activities', label: 'Atividades', icon: FiCheckCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Tab: Membros da Equipe */}
        {activeTab === 'members' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Membros da Equipe ({teamMembers.length})</h3>
              <button
                onClick={() => {
                  setEditingMember(null)
                  setMemberForm({ name: '', phone_number: '', role: '', department: '' })
                  setShowMemberForm(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                <FiPlus /> Adicionar Membro
              </button>
            </div>

            {showMemberForm && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-4">{editingMember ? 'Editar' : 'Novo'} Membro</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={memberForm.name}
                      onChange={e => setMemberForm({ ...memberForm, name: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      placeholder="Nome do funcionario"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Telefone (WhatsApp) *</label>
                    <input
                      type="text"
                      value={memberForm.phone_number}
                      onChange={e => setMemberForm({ ...memberForm, phone_number: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      placeholder="5511999999999"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Cargo</label>
                    <input
                      type="text"
                      value={memberForm.role}
                      onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      placeholder="Ex: Desenvolvedor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Departamento</label>
                    <input
                      type="text"
                      value={memberForm.department}
                      onChange={e => setMemberForm({ ...memberForm, department: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      placeholder="Ex: TI"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSaveMember}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setShowMemberForm(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-3">
              {teamMembers.map(member => (
                <div key={member.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{member.name}</div>
                      <div className="text-sm text-gray-400 flex items-center gap-2">
                        <FiPhone size={12} />
                        {member.phone_number}
                        {member.role && <span className="ml-2">| {member.role}</span>}
                        {member.department && <span className="ml-2">| {member.department}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditMember(member)}
                      className="p-2 text-blue-400 hover:bg-gray-700 rounded"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-2 text-red-400 hover:bg-gray-700 rounded"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Nenhum membro cadastrado. Clique em "Adicionar Membro" para comecar.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Agendamentos */}
        {activeTab === 'schedules' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Agendamentos ({schedules.length})</h3>
              <button
                onClick={() => {
                  setEditingSchedule(null)
                  resetScheduleForm()
                  setShowScheduleForm(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                disabled={teamMembers.length === 0 || devices.length === 0}
              >
                <FiPlus /> Novo Agendamento
              </button>
            </div>

            {(teamMembers.length === 0 || devices.length === 0) && (
              <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-4 text-yellow-400">
                <FiAlertCircle className="inline mr-2" />
                {teamMembers.length === 0 && 'Cadastre membros da equipe primeiro. '}
                {devices.length === 0 && 'Conecte um dispositivo WhatsApp primeiro.'}
              </div>
            )}

            {showScheduleForm && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-4">{editingSchedule ? 'Editar' : 'Novo'} Agendamento</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nome do Agendamento *</label>
                    <input
                      type="text"
                      value={scheduleForm.name}
                      onChange={e => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      placeholder="Ex: Check-in Matinal"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Tipo *</label>
                    <select
                      value={scheduleForm.schedule_type}
                      onChange={e => setScheduleForm({ ...scheduleForm, schedule_type: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    >
                      {SCHEDULE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Horario *</label>
                    <input
                      type="time"
                      value={scheduleForm.time_of_day}
                      onChange={e => setScheduleForm({ ...scheduleForm, time_of_day: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Dias da Semana</label>
                    <div className="flex gap-1">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            const days = scheduleForm.days_of_week.includes(day.value)
                              ? scheduleForm.days_of_week.filter(d => d !== day.value)
                              : [...scheduleForm.days_of_week, day.value]
                            setScheduleForm({ ...scheduleForm, days_of_week: days.sort() })
                          }}
                          className={`px-2 py-1 rounded text-xs ${
                            scheduleForm.days_of_week.includes(day.value)
                              ? 'bg-blue-600'
                              : 'bg-gray-600'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Membro da Equipe *</label>
                    <select
                      value={scheduleForm.team_member_id}
                      onChange={e => setScheduleForm({ ...scheduleForm, team_member_id: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    >
                      <option value="">Selecione...</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Dispositivo WhatsApp *</label>
                    <select
                      value={scheduleForm.device_id}
                      onChange={e => setScheduleForm({ ...scheduleForm, device_id: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    >
                      <option value="">Selecione...</option>
                      {devices.map(device => (
                        <option key={device.id} value={device.id}>
                          {device.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Mensagem Inicial *</label>
                    <textarea
                      value={scheduleForm.initial_message}
                      onChange={e => setScheduleForm({ ...scheduleForm, initial_message: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 h-24"
                      placeholder="Use {nome} para o nome do funcionario, {data} para a data, {hora} para a hora"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Mensagem de Follow-up</label>
                    <textarea
                      value={scheduleForm.followup_message}
                      onChange={e => setScheduleForm({ ...scheduleForm, followup_message: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 h-20"
                      placeholder="Enviada se nao houver resposta"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSaveSchedule}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setShowScheduleForm(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-3">
              {schedules.map(schedule => (
                <div key={schedule.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {SCHEDULE_TYPES.find(t => t.value === schedule.schedule_type)?.icon || '📅'}
                      </span>
                      <div>
                        <div className="font-semibold">{schedule.name}</div>
                        <div className="text-sm text-gray-400">
                          {schedule.team_member_name} | {schedule.time_of_day}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${schedule.is_active ? 'bg-green-600' : 'bg-gray-600'}`}>
                        {schedule.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                      <button
                        onClick={() => handleTriggerSchedule(schedule.id)}
                        className="p-2 text-green-400 hover:bg-gray-700 rounded"
                        title="Disparar agora"
                      >
                        <FiSend />
                      </button>
                      <button
                        onClick={() => handleEditSchedule(schedule)}
                        className="p-2 text-blue-400 hover:bg-gray-700 rounded"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="p-2 text-red-400 hover:bg-gray-700 rounded"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    <FiClock className="inline mr-1" />
                    Proximo disparo: {schedule.next_trigger_at ? new Date(schedule.next_trigger_at).toLocaleString('pt-BR') : 'Nao agendado'}
                  </div>
                </div>
              ))}
              {schedules.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Nenhum agendamento criado. Clique em "Novo Agendamento" para comecar.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Historico de Execucoes */}
        {activeTab === 'executions' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Historico de Execucoes</h3>
            <div className="grid gap-3">
              {executions.map(exec => (
                <div key={exec.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold">{exec.schedule_name}</div>
                      <div className="text-sm text-gray-400">{exec.team_member_name}</div>
                    </div>
                    <span className={`px-3 py-1 rounded text-xs ${STATUS_COLORS[exec.status] || 'bg-gray-600'}`}>
                      {STATUS_LABELS[exec.status] || exec.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <FiClock className="inline mr-1" />
                    {new Date(exec.triggered_at).toLocaleString('pt-BR')}
                    {exec.followup_count > 0 && (
                      <span className="ml-2">| {exec.followup_count} follow-up(s)</span>
                    )}
                  </div>
                  {exec.response_received && (
                    <div className="mt-2 p-2 bg-gray-700 rounded text-sm">
                      <FiMessageCircle className="inline mr-1 text-green-400" />
                      {exec.response_received.substring(0, 200)}...
                    </div>
                  )}
                </div>
              ))}
              {executions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma execucao registrada ainda.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Atividades Extraidas */}
        {activeTab === 'activities' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Atividades da Equipe</h3>
            <div className="grid gap-3">
              {activities.map(activity => (
                <div key={activity.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {activity.activity_type === 'completed' ? (
                        <FiCheckCircle className="text-green-400" />
                      ) : activity.activity_type === 'pending' ? (
                        <FiClock className="text-yellow-400" />
                      ) : (
                        <FiXCircle className="text-red-400" />
                      )}
                      <span className="font-semibold">{activity.team_member_name}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      activity.activity_type === 'completed' ? 'bg-green-600' :
                      activity.activity_type === 'pending' ? 'bg-yellow-600' :
                      activity.activity_type === 'planned' ? 'bg-blue-600' : 'bg-gray-600'
                    }`}>
                      {activity.activity_type === 'completed' ? 'Concluida' :
                       activity.activity_type === 'pending' ? 'Pendente' :
                       activity.activity_type === 'planned' ? 'Planejada' : activity.activity_type}
                    </span>
                  </div>
                  <p className="text-sm">{activity.description}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(activity.reported_date).toLocaleDateString('pt-BR')}
                    {activity.priority && <span className="ml-2">| Prioridade: {activity.priority}</span>}
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma atividade registrada ainda. As atividades serao extraidas das respostas dos funcionarios.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
