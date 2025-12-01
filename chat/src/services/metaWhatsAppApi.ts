import { useState } from 'react';

// Tipos para a API do WhatsApp Business da Meta
interface MetaWhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  baseUrl: string;
}

interface SendMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text' | 'template' | 'image' | 'document';
  text?: {
    body: string;
    preview_url?: boolean;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text?: string;
        image?: {
          link: string;
        };
        document?: {
          link: string;
          filename: string;
        };
      }>;
    }>;
  };
  image?: {
    link: string;
    caption?: string;
  };
  document?: {
    link: string;
    filename: string;
    caption?: string;
  };
}

interface SendMessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

interface MediaUploadResponse {
  id: string;
}

// Função para obter configurações do ambiente
export function getMetaWhatsAppConfig(): MetaWhatsAppConfig {
  return {
    accessToken: import.meta.env.VITE_META_WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: import.meta.env.VITE_META_WHATSAPP_PHONE_NUMBER_ID || '',
    apiVersion: import.meta.env.VITE_META_WHATSAPP_API_VERSION || 'v18.0',
    baseUrl: import.meta.env.VITE_META_WHATSAPP_BASE_URL || 'https://graph.facebook.com',
  };
}

export class MetaWhatsAppApiService {
  private config: MetaWhatsAppConfig;

  constructor(config?: Partial<MetaWhatsAppConfig>) {
    const defaultConfig = getMetaWhatsAppConfig();
    this.config = { ...defaultConfig, ...config };
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.baseUrl}/${this.config.apiVersion}${endpoint}`;
    
    console.log(`🌐 Fazendo requisição para Meta API: ${url}`);
    console.log(`🔑 Access Token presente: ${this.config.accessToken ? 'Sim' : 'Não'}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
          ...options.headers,
        },
      });

      console.log(`📊 Status da resposta: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro HTTP ${response.status}:`, errorText);
        
        if (response.status === 401) {
          throw new Error('Erro de autenticação: Verifique o Access Token da Meta API.');
        } else if (response.status === 404) {
          throw new Error(`Endpoint não encontrado: ${endpoint}. Verifique a configuração da API.`);
        } else if (response.status >= 500) {
          throw new Error(`Erro interno do servidor (${response.status}): O serviço Meta API pode estar indisponível.`);
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const jsonResponse = await response.json();
      console.log('✅ Resposta JSON válida recebida da Meta API');
      return jsonResponse;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ Erro de conectividade:', error.message);
        throw new Error('Erro de conectividade: Não foi possível conectar à Meta API. Verifique a URL e a conectividade de rede.');
      }
      throw error;
    }
  }

  async sendTextMessage(to: string, body: string, previewUrl = false): Promise<SendMessageResponse> {
    const payload: SendMessagePayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body,
        preview_url: previewUrl
      }
    };

    return this.makeRequest(`/${this.config.phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async sendTemplateMessage(
    to: string, 
    templateName: string, 
    languageCode = 'pt_BR',
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text?: string;
        image?: {
          link: string;
        };
        document?: {
          link: string;
          filename: string;
        };
      }>;
    }>
  ): Promise<SendMessageResponse> {
    const payload: SendMessagePayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components
      }
    };

    return this.makeRequest(`/${this.config.phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<SendMessageResponse> {
    const payload: SendMessagePayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: {
        link: imageUrl,
        caption
      }
    };

    return this.makeRequest(`/${this.config.phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async sendDocumentMessage(
    to: string, 
    documentUrl: string, 
    filename: string, 
    caption?: string
  ): Promise<SendMessageResponse> {
    const payload: SendMessagePayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: {
        link: documentUrl,
        filename,
        caption
      }
    };

    return this.makeRequest(`/${this.config.phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async uploadMedia(file: File): Promise<MediaUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('messaging_product', 'whatsapp');

    const url = `${this.config.baseUrl}/${this.config.apiVersion}/${this.config.phoneNumberId}/media`;
    
    console.log(`🌐 Fazendo upload de mídia para Meta API: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro no upload de mídia ${response.status}:`, errorText);
        throw new Error(`Erro no upload de mídia: HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Upload de mídia realizado com sucesso');
      return result;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ Erro de conectividade no upload:', error.message);
        throw new Error('Erro de conectividade no upload de mídia.');
      }
      throw error;
    }
  }

  async getMediaUrl(mediaId: string): Promise<{ url: string }> {
    return this.makeRequest(`/${mediaId}`);
  }
}

// Hook para usar o serviço da Meta WhatsApp API
export function useMetaWhatsAppApi() {
  const [isLoading, setIsLoading] = useState(false);

  const sendTextMessage = async (
    to: string, 
    body: string, 
    previewUrl = false,
    config?: Partial<MetaWhatsAppConfig>
  ) => {
    const finalConfig = { ...getMetaWhatsAppConfig(), ...config };
    
    if (!finalConfig.accessToken || !finalConfig.phoneNumberId) {
      throw new Error('Access Token e Phone Number ID são obrigatórios');
    }
    
    setIsLoading(true);
    try {
      const service = new MetaWhatsAppApiService(finalConfig);
      const result = await service.sendTextMessage(to, body, previewUrl);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTemplateMessage = async (
    to: string, 
    templateName: string, 
    languageCode = 'pt_BR',
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text?: string;
        image?: {
          link: string;
        };
        document?: {
          link: string;
          filename: string;
        };
      }>;
    }>,
    config?: Partial<MetaWhatsAppConfig>
  ) => {
    const finalConfig = { ...getMetaWhatsAppConfig(), ...config };
    
    if (!finalConfig.accessToken || !finalConfig.phoneNumberId) {
      throw new Error('Access Token e Phone Number ID são obrigatórios');
    }
    
    setIsLoading(true);
    try {
      const service = new MetaWhatsAppApiService(finalConfig);
      const result = await service.sendTemplateMessage(to, templateName, languageCode, components);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const sendImageMessage = async (
    to: string, 
    imageUrl: string, 
    caption?: string,
    config?: Partial<MetaWhatsAppConfig>
  ) => {
    const finalConfig = { ...getMetaWhatsAppConfig(), ...config };
    
    if (!finalConfig.accessToken || !finalConfig.phoneNumberId) {
      throw new Error('Access Token e Phone Number ID são obrigatórios');
    }
    
    setIsLoading(true);
    try {
      const service = new MetaWhatsAppApiService(finalConfig);
      const result = await service.sendImageMessage(to, imageUrl, caption);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const sendDocumentMessage = async (
    to: string, 
    documentUrl: string, 
    filename: string, 
    caption?: string,
    config?: Partial<MetaWhatsAppConfig>
  ) => {
    const finalConfig = { ...getMetaWhatsAppConfig(), ...config };
    
    if (!finalConfig.accessToken || !finalConfig.phoneNumberId) {
      throw new Error('Access Token e Phone Number ID são obrigatórios');
    }
    
    setIsLoading(true);
    try {
      const service = new MetaWhatsAppApiService(finalConfig);
      const result = await service.sendDocumentMessage(to, documentUrl, filename, caption);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadMedia = async (
    file: File,
    config?: Partial<MetaWhatsAppConfig>
  ) => {
    const finalConfig = { ...getMetaWhatsAppConfig(), ...config };
    
    if (!finalConfig.accessToken || !finalConfig.phoneNumberId) {
      throw new Error('Access Token e Phone Number ID são obrigatórios');
    }
    
    setIsLoading(true);
    try {
      const service = new MetaWhatsAppApiService(finalConfig);
      const result = await service.uploadMedia(file);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const getMediaUrl = async (
    mediaId: string,
    config?: Partial<MetaWhatsAppConfig>
  ) => {
    const finalConfig = { ...getMetaWhatsAppConfig(), ...config };
    
    if (!finalConfig.accessToken) {
      throw new Error('Access Token é obrigatório');
    }
    
    setIsLoading(true);
    try {
      const service = new MetaWhatsAppApiService(finalConfig);
      const result = await service.getMediaUrl(mediaId);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendTextMessage,
    sendTemplateMessage,
    sendImageMessage,
    sendDocumentMessage,
    uploadMedia,
    getMediaUrl,
    isLoading
  };
}

// Função utilitária para validar configuração da Meta API
export function validateMetaWhatsAppConfig(config: MetaWhatsAppConfig): { isValid: boolean; error?: string } {
  if (!config.accessToken || !config.accessToken.trim()) {
    return { isValid: false, error: 'Access Token da Meta API é obrigatório' };
  }

  if (!config.phoneNumberId || !config.phoneNumberId.trim()) {
    return { isValid: false, error: 'Phone Number ID é obrigatório' };
  }

  if (!config.baseUrl || !config.baseUrl.trim()) {
    return { isValid: false, error: 'URL da Meta API é obrigatória' };
  }

  try {
    new URL(config.baseUrl);
  } catch {
    return { isValid: false, error: 'URL da Meta API inválida' };
  }

  return { isValid: true };
}