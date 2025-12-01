import { useState, useEffect, useRef } from 'react'
import { FiSmartphone, FiCheck, FiX, FiAlertCircle, FiTrash2, FiClock, FiMic, FiSettings, FiPlus } from 'react-icons/fi'
import { RiRobot2Line } from 'react-icons/ri'
import { useAuth } from '../contexts/AuthContext'
import { EvolutionConfigPanel } from './EvolutionConfigPanel'
import { API_ENDPOINTS } from '../lib/api'

interface ConnectionInfo {
  ownerJid: string
  profileName: string
  profilePicUrl: string
  connectionStatus: string
}

interface Device {
  id: string
  name: string
  createdAt: string
  qrCode?: string
  connectionInfo?: ConnectionInfo
  aiAgentEnabled?: boolean
  transcriptionEnabled?: boolean
  lastHealthCheck?: string
}

export function DevicesPanel() {
  const { authenticatedFetch } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showEvolutionConfig, setShowEvolutionConfig] = useState(false)
  const [showNewDeviceModal, setShowNewDeviceModal] = useState(false)
  const [newDeviceName, setNewDeviceName] = useState('')
  const [isCreatingDevice, setIsCreatingDevice] = useState(false)
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const pollingCounters = useRef<Map<string, number>>(new Map()) // Contador de requisições
  const timeoutTimers = useRef<Map<string, NodeJS.Timeout>>(new Map()) // Timers de timeout
  const [remainingSeconds, setRemainingSeconds] = useState<Map<string, number>>(new Map()) // Segundos restantes por device
  const healthCheckInterval = useRef<NodeJS.Timeout | null>(null) // Health check a cada 1 minuto

  // Carregar dispositivos do banco ao montar
  useEffect(() => {
    loadDevices()
  }, [])

  // Health check automático quando devices conectados mudam
  useEffect(() => {
    const hasConnectedDevices = devices.some(d => d.connectionInfo)
    
    if (hasConnectedDevices && !healthCheckInterval.current) {
      // Só inicia se não tiver um interval rodando
      startHealthCheck()
    } else if (!hasConnectedDevices && healthCheckInterval.current) {
      // Para health check se não há dispositivos conectados
      clearInterval(healthCheckInterval.current)
      healthCheckInterval.current = null
    }
  }, [devices])

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      pollingIntervals.current.forEach(interval => clearInterval(interval))
      pollingIntervals.current.clear()
      timeoutTimers.current.forEach(timer => clearInterval(timer))
      timeoutTimers.current.clear()
      pollingCounters.current.clear()
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current)
      }
    }
  }, [])

  const loadDevices = async () => {
    try {
      const response = await authenticatedFetch('/api/whatsapp-devices')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dispositivos')
      }

      const dbDevices = await response.json()
      
      // Converter formato do banco para formato do componente
      const convertedDevices: Device[] = dbDevices.map((d: any) => ({
        id: d.id,
        name: d.name,
        createdAt: d.created_at,
        aiAgentEnabled: d.ai_agent_enabled === 1 || d.ai_agent_enabled === true,
        transcriptionEnabled: d.transcription_enabled === 1 || d.transcription_enabled === true,
        connectionInfo: d.connection_status === 'open' && d.owner_jid ? {
          ownerJid: d.owner_jid,
          profileName: d.profile_name,
          profilePicUrl: d.profile_pic_url,
          connectionStatus: d.connection_status
        } : undefined
      }))

      setDevices(convertedDevices)

      // Iniciar polling e timer apenas para dispositivos sem conexão
      convertedDevices.forEach(device => {
        if (!device.connectionInfo) {
          startPolling(device.name)
          // Inicia timer de timeout de 60 segundos
          startTimeoutTimer(device.name, device.id)
        }
      })

      // Inicia health check para dispositivos conectados
      startHealthCheck()
    } catch (err) {
      console.error('Erro ao carregar dispositivos:', err)
    }
  }

  const saveDeviceToDb = async (device: Device) => {
    try {
      console.log('💾 Salvando dispositivo no banco:', device)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
      
      const response = await authenticatedFetch('/api/whatsapp-devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: device.id,
          name: device.name,
          owner_jid: device.connectionInfo?.ownerJid,
          profile_name: device.connectionInfo?.profileName,
          profile_pic_url: device.connectionInfo?.profilePicUrl,
          connection_status: device.connectionInfo?.connectionStatus
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error('❌ Erro ao salvar - Status:', response.status)
        const errorText = await response.text()
        console.error('❌ Erro ao salvar - Resposta:', errorText)
        throw new Error('Erro ao salvar dispositivo')
      }

      const saved = await response.json()
      console.log('✅ Dispositivo salvo no banco:', saved)
      return saved
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('❌ Timeout ao salvar no banco')
      } else {
        console.error('❌ Erro ao salvar no banco:', err)
      }
    }
  }

  // Função para deletar instância da Evolution API (via backend)
  const deleteDeviceFromEvolution = async (instanceName: string) => {
    try {
      // Usar endpoint do backend para deletar da Evolution
      const response = await authenticatedFetch(API_ENDPOINTS.EVOLUTION_INSTANCE_DELETE(instanceName), {
        method: 'DELETE',
      })

      if (!response.ok) {
        console.warn(`Falha ao deletar instância ${instanceName} da Evolution:`, response.status)
      } else {
        console.log(`✅ Instância ${instanceName} deletada da Evolution`)
      }
    } catch (error) {
      console.error(`Erro ao deletar instância ${instanceName} da Evolution:`, error)
    }
  }

  // Função para criar novo dispositivo via Evolution API (via backend para evitar CORS)
  const createNewDevice = async () => {
    if (!newDeviceName.trim()) {
      setError('Digite um nome para o dispositivo')
      return
    }

    setIsCreatingDevice(true)
    setError(null)

    try {
      // 1. Criar instância na Evolution API via backend (evita CORS)
      const evolutionResponse = await authenticatedFetch(API_ENDPOINTS.EVOLUTION_INSTANCES_CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instanceName: newDeviceName.trim() }),
      })

      if (!evolutionResponse.ok) {
        const errorData = await evolutionResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Falha ao criar instância na Evolution API')
      }

      const evolutionData = await evolutionResponse.json()
      console.log('📱 Resposta Evolution:', evolutionData)

      // 2. Criar dispositivo local no banco
      const deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      const newDevice: Device = {
        id: deviceId,
        name: evolutionData.instanceName || newDeviceName.trim(),
        createdAt: new Date().toISOString(),
        qrCode: evolutionData.qrcode?.base64 || evolutionData.base64,
      }

      // Salvar no banco
      await saveDeviceToDb(newDevice)

      // Adicionar à lista local
      setDevices(prev => [...prev, newDevice])

      // Iniciar polling para verificar conexão
      startPolling(newDevice.name)
      startTimeoutTimer(newDevice.name, newDevice.id)

      // Fechar modal e limpar
      setShowNewDeviceModal(false)
      setNewDeviceName('')
      setSuccess('Dispositivo criado! Escaneie o QR Code')
      setTimeout(() => setSuccess(null), 5000)

    } catch (err: any) {
      console.error('Erro ao criar dispositivo:', err)
      setError(err.message || 'Erro ao criar dispositivo')
    } finally {
      setIsCreatingDevice(false)
    }
  }

  const deleteDevice = async (deviceId: string) => {
    try {
      const device = devices.find(d => d.id === deviceId)
      if (!device) return

      // Para o polling se estiver ativo
      const interval = pollingIntervals.current.get(deviceId)
      if (interval) {
        clearInterval(interval)
        pollingIntervals.current.delete(deviceId)
      }

      // Para o timer de timeout se estiver ativo
      const timer = timeoutTimers.current.get(device.name)
      if (timer) {
        clearInterval(timer)
        timeoutTimers.current.delete(device.name)
      }

      // Limpa contadores
      pollingCounters.current.delete(device.name)
      setRemainingSeconds(prev => {
        const newMap = new Map(prev)
        newMap.delete(device.name)
        return newMap
      })

      // Deleta da Evolution API
      await deleteDeviceFromEvolution(device.name)

      const response = await authenticatedFetch(`/api/whatsapp-devices/${deviceId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao deletar dispositivo')
      }

      // Remover da lista local
      setDevices(prev => prev.filter(d => d.id !== deviceId))

      setSuccess('Dispositivo removido com sucesso')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Erro ao deletar dispositivo:', err)
      setError('Erro ao remover dispositivo')
      setTimeout(() => setError(null), 3000)
    }
  }

  // Função para ativar/desativar agente de IA
  const toggleAiAgent = async (deviceId: string, deviceName: string, currentState: boolean) => {
    const newState = !currentState
    const action = newState ? 'on' : 'off'

    try {
      // Atualiza UI otimisticamente
      setDevices(prev => prev.map(d => 
        d.id === deviceId ? { ...d, aiAgentEnabled: newState } : d
      ))

      // Notifica n8n
      await fetch('https://n8n.sofia.ms/webhook/leticia-wb3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName: deviceName,
          action: action
        }),
      })

      // Atualiza no banco de dados
      const response = await authenticatedFetch(`/api/whatsapp-devices/${deviceId}/ai-agent`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          aiAgentEnabled: newState
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar agente de IA')
      }

      console.log(`🤖 Agente de IA ${action} para ${deviceName}`)
    } catch (error) {
      console.error('Erro ao alternar agente de IA:', error)
      // Reverte mudança otimista em caso de erro
      setDevices(prev => prev.map(d => 
        d.id === deviceId ? { ...d, aiAgentEnabled: currentState } : d
      ))
      setError(`Erro ao ${action} agente de IA`)
      setTimeout(() => setError(null), 3000)
    }
  }

  // Função para ativar/desativar modo de transcrição
  const toggleTranscription = async (deviceId: string, deviceName: string, currentState: boolean) => {
    const newState = !currentState
    const action = newState ? 'on' : 'off'

    try {
      // Atualiza UI otimisticamente
      setDevices(prev => prev.map(d => 
        d.id === deviceId ? { ...d, transcriptionEnabled: newState } : d
      ))

      // Notifica n8n
      await fetch('https://n8n.sofia.ms/webhook/leticia-wb4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName: deviceName,
          action: action
        }),
      })

      // Atualiza no banco de dados
      const response = await authenticatedFetch(`/api/whatsapp-devices/${deviceId}/transcription`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcriptionEnabled: newState
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar modo de transcrição')
      }

      console.log(`🎤 Modo de transcrição ${action} para ${deviceName}`)
    } catch (error) {
      console.error('Erro ao alternar modo de transcrição:', error)
      // Reverte mudança otimista em caso de erro
      setDevices(prev => prev.map(d => 
        d.id === deviceId ? { ...d, transcriptionEnabled: currentState } : d
      ))
      setError(`Erro ao ${action} modo de transcrição`)
      setTimeout(() => setError(null), 3000)
    }
  }

  // Health check: Verifica status de dispositivos conectados a cada 1 minuto
  const startHealthCheck = () => {
    // Limpa health check anterior se existir para evitar múltiplos intervals
    if (healthCheckInterval.current) {
      clearInterval(healthCheckInterval.current)
      healthCheckInterval.current = null
    }

    console.log('🏥 Iniciando health check (intervalo: 60 segundos)')

    // Executa imediatamente
    checkConnectedDevicesHealth()

    // Depois executa a cada 1 minuto (60000ms)
    healthCheckInterval.current = setInterval(() => {
      checkConnectedDevicesHealth()
    }, 60000)
  }

  const checkConnectedDevicesHealth = async () => {
    const connectedDevices = devices.filter(d => d.connectionInfo)

    if (connectedDevices.length === 0) {
      console.log('🏥 Health check: Nenhum dispositivo conectado')
      return
    }

    console.log(`🏥 Health check: Verificando ${connectedDevices.length} dispositivo(s) conectado(s)`)

    for (const device of connectedDevices) {
      try {
        // Usar endpoint do backend que consulta a Evolution API local
        const response = await authenticatedFetch(API_ENDPOINTS.EVOLUTION_INSTANCE_STATUS(device.name))

        if (!response.ok) {
          console.warn(`⚠️ Health check falhou para ${device.name}:`, response.status)
          await handleDisconnectedDevice(device.id, device.name, 'Falha na comunicação com Evolution')
          continue
        }

        const data = await response.json()
        const instanceData = data.data

        if (!instanceData) {
          console.warn(`⚠️ Instância ${device.name} não encontrada na Evolution`)
          await handleDisconnectedDevice(device.id, device.name, 'Instância não encontrada')
          continue
        }

        // Verifica se está realmente conectado
        if (instanceData.connectionStatus !== 'open') {
          console.warn(`⚠️ Instância ${device.name} desconectada: ${instanceData.connectionStatus}`)
          await handleDisconnectedDevice(device.id, device.name, `Status: ${instanceData.connectionStatus}`)
          continue
        }

        // Atualiza timestamp do último health check e dados do perfil
        const now = new Date().toISOString()
        setDevices(prev => prev.map(d => {
          if (d.id === device.id) {
            // Atualiza connectionInfo com dados mais recentes
            const updatedConnectionInfo = d.connectionInfo ? {
              ...d.connectionInfo,
              profilePicUrl: instanceData.profilePicUrl || d.connectionInfo.profilePicUrl,
              profileName: instanceData.profileName || d.connectionInfo.profileName,
              ownerJid: instanceData.ownerJid || d.connectionInfo.ownerJid
            } : d.connectionInfo

            return { ...d, lastHealthCheck: now, connectionInfo: updatedConnectionInfo }
          }
          return d
        }))

        console.log(`✅ Health check OK: ${device.name} (${instanceData.connectionStatus}) - Foto: ${instanceData.profilePicUrl || 'N/A'}`)
      } catch (error) {
        console.error(`❌ Erro no health check de ${device.name}:`, error)
        await handleDisconnectedDevice(device.id, device.name, 'Erro de conexão')
      }
    }
  }

  const handleDisconnectedDevice = async (deviceId: string, deviceName: string, reason: string) => {
    console.log(`🔌 Removendo dispositivo desconectado: ${deviceName} (${reason})`)

    // Deleta da Evolution API
    await deleteDeviceFromEvolution(deviceName)

    // Deleta do banco de dados
    try {
      await authenticatedFetch(`/api/whatsapp-devices/${deviceId}`, {
        method: 'DELETE',
      })

      // Remove da lista local
      setDevices(prev => prev.filter(d => d.id !== deviceId))

      // Mensagem com horário detalhado (sem auto-close)
      const now = new Date()
      const timestamp = now.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      setError(`[${timestamp}] Dispositivo "${deviceName}" foi removido automaticamente. Motivo: ${reason}`)
      // Não fecha automaticamente - usuário deve fechar manualmente
    } catch (error) {
      console.error('Erro ao deletar dispositivo desconectado:', error)
    }
  }

  // Função para timeout automático (60 segundos)
  const startTimeoutTimer = (deviceName: string, deviceId: string) => {
    let secondsLeft = 60
    setRemainingSeconds(prev => new Map(prev).set(deviceName, secondsLeft))

    const timer = setInterval(() => {
      secondsLeft--
      setRemainingSeconds(prev => new Map(prev).set(deviceName, secondsLeft))

      if (secondsLeft <= 0) {
        clearInterval(timer)
        timeoutTimers.current.delete(deviceName)
        handleDeviceTimeout(deviceId, deviceName)
      }
    }, 1000)

    timeoutTimers.current.set(deviceName, timer)
  }

  // Função para lidar com timeout do dispositivo
  const handleDeviceTimeout = async (deviceId: string, deviceName: string) => {
    console.log(`⏱️ Timeout: Removendo dispositivo ${deviceName} após 60 segundos sem conexão`)

    // Para polling se estiver ativo
    const interval = pollingIntervals.current.get(deviceName)
    if (interval) {
      clearInterval(interval)
      pollingIntervals.current.delete(deviceName)
    }

    // Limpa contadores
    pollingCounters.current.delete(deviceName)
    setRemainingSeconds(prev => {
      const newMap = new Map(prev)
      newMap.delete(deviceName)
      return newMap
    })

    // Deleta da Evolution API
    await deleteDeviceFromEvolution(deviceName)

    // Deleta do banco de dados
    try {
      await authenticatedFetch(`/api/whatsapp-devices/${deviceId}`, {
        method: 'DELETE',
      })

      // Remove da lista local
      setDevices(prev => prev.filter(d => d.id !== deviceId))
      
      // Mensagem com horário detalhado (sem auto-close)
      const now = new Date()
      const timestamp = now.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      setError(`[${timestamp}] Dispositivo "${deviceName}" foi removido automaticamente. Motivo: Tempo limite de 60 segundos excedido sem conexão`)
      // Não fecha automaticamente - usuário deve fechar manualmente
    } catch (error) {
      console.error('Erro ao deletar dispositivo do banco:', error)
    }
  }

  const checkConnectionStatus = async (deviceName: string) => {
    try {
      // Usar endpoint do backend que consulta a Evolution API local
      const response = await authenticatedFetch(API_ENDPOINTS.EVOLUTION_INSTANCE_STATUS(deviceName))
      if (!response.ok) return

      const data = await response.json()
      console.log('🔍 Resposta do status:', data)

      const instanceData = data.data
      console.log('📱 Dados da instância:', instanceData)
      console.log('🔌 Status de conexão:', instanceData?.connectionStatus)

      if (instanceData && instanceData.connectionStatus === 'open') {
        console.log('✅ Instância conectada! Atualizando interface...')

        // Stop polling
        const interval = pollingIntervals.current.get(deviceName)
        if (interval) {
          clearInterval(interval)
          pollingIntervals.current.delete(deviceName)
        }

        // Para o timer de timeout
        const timer = timeoutTimers.current.get(deviceName)
        if (timer) {
          clearInterval(timer)
          timeoutTimers.current.delete(deviceName)
        }

        // Limpa contadores e timer visual
        pollingCounters.current.delete(deviceName)
        setRemainingSeconds(prev => {
          const newMap = new Map(prev)
          newMap.delete(deviceName)
          return newMap
        })

        // Update device with connection info
        const updatedDevice = {
          ownerJid: instanceData.ownerJid,
          profileName: instanceData.profileName,
          profilePicUrl: instanceData.profilePicUrl,
          connectionStatus: instanceData.connectionStatus
        }

        setDevices(prev => prev.map(device => {
          if (device.name === deviceName) {
            console.log('🔄 Atualizando dispositivo:', deviceName)
            const updated = {
              ...device,
              qrCode: undefined,
              connectionInfo: updatedDevice
            }

            // Salvar no banco
            saveDeviceToDb(updated)

            return updated
          }
          return device
        }))
      }
    } catch (err) {
      console.error('Erro ao verificar status de conexão:', err)
    }
  }

  const startPolling = (deviceName: string) => {
    // Clear existing interval if any
    const existingInterval = pollingIntervals.current.get(deviceName)
    if (existingInterval) {
      clearInterval(existingInterval)
    }

    // Inicializa contador de requisições
    pollingCounters.current.set(deviceName, 0)

    // Start new polling interval
    const interval = setInterval(() => {
      const currentCount = pollingCounters.current.get(deviceName) || 0
      
      // Limita a 30 requisições (60 segundos ÷ 2s)
      if (currentCount >= 30) {
        console.log(`🛑 Polling limitado: 30 requisições atingidas para ${deviceName}`)
        clearInterval(interval)
        pollingIntervals.current.delete(deviceName)
        pollingCounters.current.delete(deviceName)
        return
      }

      pollingCounters.current.set(deviceName, currentCount + 1)
      checkConnectionStatus(deviceName)
    }, 2000) // 2 seconds

    pollingIntervals.current.set(deviceName, interval)

    // Check immediately
    checkConnectionStatus(deviceName)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
          <FiAlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-2">
          <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-green-400">{success}</p>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-green-400 hover:text-green-300"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex gap-2">
        {/* Botão Novo Dispositivo */}
        <button
          onClick={() => setShowNewDeviceModal(true)}
          className="flex-1 px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg flex items-center justify-center gap-2 text-green-500 transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          <span className="font-medium">Novo Dispositivo WhatsApp</span>
        </button>

        {/* Botão Configurações Evolution API */}
        <button
          onClick={() => setShowEvolutionConfig(true)}
          className="px-4 py-3 bg-accent hover:bg-accent/80 border border-border rounded-lg flex items-center justify-center gap-2 text-muted-foreground hover:text-card-foreground transition-colors"
          title="Configurações da Evolution API"
        >
          <FiSettings className="w-5 h-5" />
        </button>
      </div>

      {/* Lista de Dispositivos */}
      {devices.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground mb-3 px-2.5">Dispositivos ({devices.length})</h4>
          {devices.map((device) => (
            <div key={device.id}>
              {/* Dispositivo Conectado - Layout Minimalista em Uma Linha */}
              {device.connectionInfo && (
                <div className="bg-card border border-border px-6 py-3 hover:border-accent rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    {/* Foto de Perfil com Indicador Online */}
                    <div className="relative">
                      {device.connectionInfo.profilePicUrl ? (
                        <img
                          src={device.connectionInfo.profilePicUrl}
                          alt={device.connectionInfo.profileName}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback se a imagem falhar ao carregar
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            target.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      {/* Avatar padrão quando não há foto */}
                      <div className={`w-10 h-10 rounded-full bg-green-600 flex items-center justify-center ${device.connectionInfo.profilePicUrl ? 'hidden' : ''}`}>
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                      {/* Bolinha Verde Online */}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-black" />
                    </div>
                    
                    {/* Info Principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate text-card-foreground">{device.name}</p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-green-500 dark:text-green-400">{device.connectionInfo.profileName}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{device.connectionInfo.ownerJid?.split('@')[0] || 'N/A'}</span>
                        <span>•</span>
                        <span>{new Date(device.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                        {device.lastHealthCheck && (
                          <>
                            <span>•</span>
                            <span title="Última verificação de saúde">
                              {new Date(device.lastHealthCheck).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Ações */}
                    <div className="flex items-center gap-2">
                      {/* Toggle Agente de IA */}
                      <button
                        onClick={() => toggleAiAgent(device.id, device.name, device.aiAgentEnabled || false)}
                        className={`p-2 rounded-full transition-all ${
                          device.aiAgentEnabled
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                        title={device.aiAgentEnabled ? 'Desativar agente de IA' : 'Ativar agente de IA'}
                      >
                        <RiRobot2Line className="w-4 h-4" />
                      </button>
                      
                      {/* Toggle Modo de Transcrição */}
                      <button
                        onClick={() => toggleTranscription(device.id, device.name, device.transcriptionEnabled || false)}
                        className={`p-2 rounded-full transition-all ${
                          device.transcriptionEnabled
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                        title={device.transcriptionEnabled ? 'Desativar modo de transcrição' : 'Ativar modo de transcrição'}
                      >
                        <FiMic className="w-4 h-4" />
                      </button>
                      
                      {/* Botão Deletar */}
                      <button
                        onClick={() => deleteDevice(device.id)}
                        className="p-2 rounded-full bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all"
                        title="Remover dispositivo"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Dispositivo Aguardando QR Code */}
              {device.qrCode && !device.connectionInfo && (
                <div className="bg-card border border-primary/20 px-6 py-4 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FiSmartphone className="w-4 h-4 text-primary" />
                        <p className="font-medium text-sm text-card-foreground">{device.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(device.createdAt).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {/* Timer de Timeout */}
                        {remainingSeconds.has(device.name) && (
                          <span className={`flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded ${
                            (remainingSeconds.get(device.name) || 0) <= 10
                              ? 'bg-red-500/20 text-red-400 animate-pulse'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            <FiClock className="w-3 h-3" />
                            {remainingSeconds.get(device.name)}s
                          </span>
                        )}
                        <button
                          onClick={() => deleteDevice(device.id)}
                          className="ml-auto p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Remover dispositivo"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="bg-white p-3 rounded-lg inline-block">
                        <img
                          src={device.qrCode}
                          alt="QR Code WhatsApp"
                          className="w-48 h-48"
                        />
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-primary mt-2">
                        <FiSmartphone className="w-3.5 h-3.5" />
                        Escaneie com o WhatsApp do seu celular
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Dispositivo */}
      {showNewDeviceModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => !isCreatingDevice && setShowNewDeviceModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-card-foreground">Novo Dispositivo WhatsApp</h2>
                <button
                  onClick={() => !isCreatingDevice && setShowNewDeviceModal(false)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                  disabled={isCreatingDevice}
                >
                  <FiX className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Nome do Dispositivo
                  </label>
                  <input
                    type="text"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    placeholder="Ex: meu-whatsapp-1"
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-card-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500"
                    disabled={isCreatingDevice}
                    onKeyDown={(e) => e.key === 'Enter' && createNewDevice()}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use apenas letras, números e hífens
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => !isCreatingDevice && setShowNewDeviceModal(false)}
                    className="flex-1 px-4 py-2 bg-accent hover:bg-accent/80 text-card-foreground rounded-lg transition-colors"
                    disabled={isCreatingDevice}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={createNewDevice}
                    disabled={isCreatingDevice || !newDeviceName.trim()}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCreatingDevice ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Criando...
                      </>
                    ) : (
                      <>
                        <FiPlus className="w-4 h-4" />
                        Criar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Configuração Evolution API */}
      {showEvolutionConfig && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowEvolutionConfig(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <FiSettings className="w-4 h-4 text-green-500" />
                  </div>
                  <h2 className="text-lg font-semibold text-card-foreground">Configuração Evolution API</h2>
                </div>
                <button
                  onClick={() => setShowEvolutionConfig(false)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-0">
                <EvolutionConfigPanel />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
