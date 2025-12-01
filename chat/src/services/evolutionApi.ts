import { useState } from 'react';

// Tipos locais
interface CreateInstancePayload {
  instanceName: string;
  token: string;
  qrcode: boolean;
  number?: string; // Campo opcional para evitar erro de validação quando vazio
  integration: string;
  rejectCall: boolean;
  msgCall: string;
  groupsIgnore: boolean;
  alwaysOnline: boolean;
  readMessages: boolean;
  readStatus: boolean;
  syncFullHistory: boolean;
}

interface SendTextPayload {
  number: string;
  text: string;
  delay?: number;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  quoted?: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message: any;
  };
}

interface SendTextResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: any;
  messageTimestamp: number;
  status: string;
}

interface CheckWhatsAppPayload {
  numbers: string[];
}

interface CheckWhatsAppResponse {
  exists: boolean;
  jid: string;
  number: string;
}

interface InstanceResponse {
  instance: {
    instanceName: string;
    [key: string]: any;
  };
  code?: string; // QR Code em base64
  qrcode?: string; // QR Code como URL de imagem
  base64?: string; // QR Code como data URL completa (data:image/png;base64,...)
  pairingCode?: string; // Código de pareamento
  count?: number;
}

// Função para obter configurações do ambiente
export function getEvolutionConfig() {
  return {
    url: import.meta.env.VITE_EVOLUTION_API_URL || '',
    apiKey: import.meta.env.VITE_EVOLUTION_API_KEY || '',
    instanceName: import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || '',
  };
}

// Função para obter payload padrão da instância
function getDefaultInstancePayload(): CreateInstancePayload {
  return {
    instanceName: '',
    token: '',
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
    rejectCall: false,
    msgCall: '',
    groupsIgnore: true,
    alwaysOnline: false,
    readMessages: false,
    readStatus: false,
    syncFullHistory: false
  };
}

export class EvolutionApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    const config = getEvolutionConfig();
    this.baseUrl = (baseUrl || config.url).replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey || config.apiKey;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`🌐 Fazendo requisição para: ${url}`);
    console.log(`🔑 API Key presente: ${this.apiKey ? 'Sim' : 'Não'}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
          ...options.headers,
        },
      });

      console.log(`📊 Status da resposta: ${response.status} ${response.statusText}`);
      console.log(`📋 Content-Type: ${response.headers.get('content-type')}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro HTTP ${response.status}:`, errorText.substring(0, 200));
        
        if (response.status === 401) {
          throw new Error('Erro de autenticação: Verifique a API Key da Evolution API.');
        } else if (response.status === 404) {
          throw new Error(`Endpoint não encontrado: ${endpoint}. Verifique a URL da API.`);
        } else if (response.status >= 500) {
          throw new Error(`Erro interno do servidor (${response.status}): O serviço Evolution API pode estar indisponível.`);
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Verificar se a resposta é JSON válido
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Resposta não é JSON:', text.substring(0, 200));
        
        if (text.includes('<!DOCTYPE') || text.includes('<html>')) {
          throw new Error('Servidor retornou HTML em vez de JSON. Verifique a URL da API e se o serviço está funcionando.');
        }
        throw new Error(`Resposta não é JSON válido: ${text.substring(0, 100)}...`);
      }

      try {
        const jsonResponse = await response.json();
        console.log('✅ Resposta JSON válida recebida');
        return jsonResponse;
      } catch (error) {
        const text = await response.text();
        console.error('❌ Erro ao fazer parse do JSON:', error);
        console.error('📄 Resposta recebida:', text.substring(0, 200));
        throw new Error(`Erro ao fazer parse do JSON: ${error}. Resposta: ${text.substring(0, 100)}...`);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ Erro de conectividade:', error.message);
        throw new Error('Erro de conectividade: Não foi possível conectar à API Evolution. Verifique a URL e a conectividade de rede.');
      }
      throw error;
    }
  }

  async createInstance(payload: CreateInstancePayload): Promise<InstanceResponse> {
    return this.makeRequest('/instance/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getInstanceInfo(instanceName: string) {
    return this.makeRequest(`/instance/fetchInstances?instanceName=${instanceName}`);
  }

  async deleteInstance(instanceName: string) {
    return this.makeRequest(`/instance/delete/${instanceName}`, {
      method: 'DELETE',
    });
  }

  async connectInstance(instanceName: string) {
    return this.makeRequest(`/instance/connect/${instanceName}`, {
      method: 'GET',
    });
  }

  async disconnectInstance(instanceName: string) {
    return this.makeRequest(`/instance/logout/${instanceName}`, {
      method: 'DELETE',
    });
  }

  async getQrCode(instanceName: string) {
    return this.makeRequest(`/instance/connect/${instanceName}`);
  }

  async restartInstance(instanceName: string) {
    return this.makeRequest(`/instance/restart/${instanceName}`, {
      method: 'PUT',
    });
  }

  async getInstanceStatus(instanceName: string) {
    return this.makeRequest(`/instance/connectionState/${instanceName}`);
  }

  async listInstances() {
    return this.makeRequest('/instance/fetchInstances');
  }

  async sendText(instanceName: string, payload: SendTextPayload): Promise<SendTextResponse> {
    return this.makeRequest(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async checkWhatsApp(instanceName: string, numbers: string[]): Promise<CheckWhatsAppResponse[]> {
    const payload: CheckWhatsAppPayload = { numbers };
    return this.makeRequest(`/chat/whatsappNumbers/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async instanceExists(instanceName: string): Promise<boolean> {
    try {
      const instances = await this.listInstances();
      if (Array.isArray(instances)) {
        return instances.some((instance: any) => 
          instance.instance?.instanceName === instanceName || 
          instance.instanceName === instanceName
        );
      }
      return false;
    } catch (error) {
      console.warn(`Erro ao verificar existência da instância ${instanceName}:`, error);
      return false;
    }
  }
}

// Hook para usar o serviço da Evolution API
export function useEvolutionApi() {
  const [isLoading, setIsLoading] = useState(false);

  const createInstance = async (url?: string, key?: string, payload?: CreateInstancePayload) => {
    const config = getEvolutionConfig();
    const finalUrl = url || config.url;
    const finalKey = key || config.apiKey;
    
    if (!finalUrl || !finalKey) {
      throw new Error('URL da Evolution API e chave API são obrigatórias');
    }
    
    setIsLoading(true);
    try {
      const service = new EvolutionApiService(finalUrl, finalKey);
      const finalPayload = payload || getDefaultInstancePayload();
      const result = await service.createInstance(finalPayload);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const getInstanceInfo = async (url?: string, key?: string, instanceName?: string) => {
    const config = getEvolutionConfig();
    const finalUrl = url || config.url;
    const finalKey = key || config.apiKey;
    const finalInstanceName = instanceName || config.instanceName;
    
    if (!finalUrl || !finalKey) {
      throw new Error('URL da Evolution API e chave API são obrigatórias');
    }
    const service = new EvolutionApiService(finalUrl, finalKey);
    return service.getInstanceInfo(finalInstanceName);
  };

  const deleteInstance = async (url?: string, key?: string, instanceName?: string) => {
    const config = getEvolutionConfig();
    const finalUrl = url || config.url;
    const finalKey = key || config.apiKey;
    const finalInstanceName = instanceName || config.instanceName;
    
    if (!finalUrl || !finalKey) {
      throw new Error('URL da Evolution API e chave API são obrigatórias');
    }
    const service = new EvolutionApiService(finalUrl, finalKey);
    return service.deleteInstance(finalInstanceName);
  };

  const connectInstance = async (url?: string, key?: string, instanceName?: string) => {
    const config = getEvolutionConfig();
    const finalUrl = url || config.url;
    const finalKey = key || config.apiKey;
    const finalInstanceName = instanceName || config.instanceName;
    
    if (!finalUrl || !finalKey) {
      throw new Error('URL da Evolution API e chave API são obrigatórias');
    }
    const service = new EvolutionApiService(finalUrl, finalKey);
    return service.connectInstance(finalInstanceName);
  };

  const disconnectInstance = async (url?: string, key?: string, instanceName?: string) => {
    const config = getEvolutionConfig();
    const finalUrl = url || config.url;
    const finalKey = key || config.apiKey;
    const finalInstanceName = instanceName || config.instanceName;
    
    if (!finalUrl || !finalKey) {
      throw new Error('URL da Evolution API e chave API são obrigatórias');
    }
    const service = new EvolutionApiService(finalUrl, finalKey);
    return service.disconnectInstance(finalInstanceName);
  };

  const getQrCode = async (url?: string, key?: string, instanceName?: string) => {
    const config = getEvolutionConfig();
    const finalUrl = url || config.url;
    const finalKey = key || config.apiKey;
    const finalInstanceName = instanceName || config.instanceName;
    
    if (!finalUrl || !finalKey) {
      throw new Error('URL da Evolution API e chave API são obrigatórias');
    }
    const service = new EvolutionApiService(finalUrl, finalKey);
    return service.getQrCode(finalInstanceName);
  };

  const restartInstance = async (url?: string, key?: string, instanceName?: string) => {
    const config = getEvolutionConfig();
    const finalUrl = url || config.url;
    const finalKey = key || config.apiKey;
    const finalInstanceName = instanceName || config.instanceName;
    
    if (!finalUrl || !finalKey) {
      throw new Error('URL da Evolution API e chave API são obrigatórias');
    }
    const service = new EvolutionApiService(finalUrl, finalKey);
    return service.restartInstance(finalInstanceName);
  };

  const getInstanceStatus = async (instanceName: string, url?: string, key?: string) => {
    const config = getEvolutionConfig();
    const finalUrl = url || config.url;
    const finalKey = key || config.apiKey;
    
    if (!finalUrl || !finalKey) {
      throw new Error('URL da Evolution API e chave API são obrigatórias');
    }
    
    if (!instanceName) {
      throw new Error('Nome da instância é obrigatório');
    }
    
    const service = new EvolutionApiService(finalUrl, finalKey);
    return service.getInstanceStatus(instanceName);
  };

  const listInstances = async (url?: string, key?: string) => {
    const config = getEvolutionConfig();
    const finalUrl = url || config.url;
    const finalKey = key || config.apiKey;
    
    if (!finalUrl || !finalKey) {
      throw new Error('URL da Evolution API e chave API são obrigatórias');
    }
    const service = new EvolutionApiService(finalUrl, finalKey);
    return service.listInstances();
  };

  const sendText = async (payload: SendTextPayload, url?: string, key?: string, instanceName?: string) => {
    const config = getEvolutionConfig();
    const finalUrl = url || config.url;
    const finalKey = key || config.apiKey;
    const finalInstanceName = instanceName || config.instanceName;
    
    if (!finalUrl || !finalKey) {
      throw new Error('URL da Evolution API e chave API são obrigatórias');
    }
    
    if (!finalInstanceName) {
      throw new Error('Nome da instância é obrigatório');
    }
    
    setIsLoading(true);
    try {
      const service = new EvolutionApiService(finalUrl, finalKey);
      const result = await service.sendText(finalInstanceName, payload);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const instanceExists = async (instanceName: string, url?: string, key?: string): Promise<boolean> => {
    const config = getEvolutionConfig();
    const finalUrl = url || config.url;
    const finalKey = key || config.apiKey;
    
    if (!finalUrl || !finalKey) {
      throw new Error('URL da Evolution API e chave API são obrigatórias');
    }
    
    if (!instanceName) {
      throw new Error('Nome da instância é obrigatório');
    }
    
    const service = new EvolutionApiService(finalUrl, finalKey);
    return service.instanceExists(instanceName);
  };

  return {
    createInstance,
    getInstanceInfo,
    deleteInstance,
    connectInstance,
    disconnectInstance,
    getQrCode,
    restartInstance,
    getInstanceStatus,
    listInstances,
    sendText,
    instanceExists,
    isLoading
  };
}

// Função utilitária para validar configuração da Evolution API
export function validateEvolutionConfig(url: string, apiKey: string): { isValid: boolean; error?: string } {
  if (!url || !url.trim()) {
    return { isValid: false, error: 'URL da Evolution API é obrigatória' };
  }

  if (!apiKey || !apiKey.trim()) {
    return { isValid: false, error: 'Chave API é obrigatória' };
  }

  try {
    new URL(url);
  } catch {
    return { isValid: false, error: 'URL da Evolution API inválida' };
  }

  return { isValid: true };
}

// Configurações padrão para criação de instância
export const defaultInstanceConfig: Partial<CreateInstancePayload> = {
  qrcode: true,
  integration: 'WHATSAPP-BAILEYS',
  rejectCall: false,
  groupsIgnore: true,
  alwaysOnline: false,
  readMessages: false,
  readStatus: false,
  syncFullHistory: false,
};