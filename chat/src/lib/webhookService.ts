export interface MessageStatus {
  id: string;
  remoteJid: string;
  body: string;
  status: 'sent' | 'DELIVERY_ACK' | 'READ' | 'PENDING';
  timestamp: string;
  updatedAt?: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface WebhookMessage {
  id: string;
  remoteJid: string;
  body: string;
  status: string;
  timestamp: string;
  updatedAt?: string;
  deliveredAt?: string;
  readAt?: string;
}

class WebhookService {
  private baseUrl = 'https://tupperware.sofia.ms';

  // Registra uma mensagem no webhook
  async registerMessage(id: string, remoteJid: string, body: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, remoteJid, body }),
      });

      if (!response.ok) {
        console.warn(`[Webhook Service] Erro ao registrar mensagem ${id}: ${response.statusText}`);
        return; // Não quebra o envio da mensagem
      }

      console.log(`[Webhook Service] Mensagem ${id} registrada para monitoramento de ACK`);
    } catch (error) {
      console.warn(`[Webhook Service] Falha ao registrar mensagem ${id} (continuando sem ACK):`, error);
      // Não relança o erro para não quebrar o envio da mensagem
    }
  }

  // Busca todas as mensagens e seus status
  async getMessages(): Promise<MessageStatus[]> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`);
      
      if (!response.ok) {
        console.warn(`[Webhook Service] Erro HTTP ${response.status}: ${response.statusText}`);
        return [];
      }

      const text = await response.text();
      
      // Verificar se a resposta é JSON válido
      if (!text.trim().startsWith('[') && !text.trim().startsWith('{')) {
        console.warn('[Webhook Service] Resposta não é JSON válido:', text.substring(0, 100));
        return [];
      }

      const messages: WebhookMessage[] = JSON.parse(text);
      
      return messages.map(msg => ({
        id: msg.id,
        remoteJid: msg.remoteJid,
        body: msg.body,
        status: this.normalizeStatus(msg.status),
        timestamp: msg.timestamp,
        updatedAt: msg.updatedAt,
        deliveredAt: msg.deliveredAt,
        readAt: msg.readAt
      }));
    } catch (error) {
      console.warn('[Webhook Service] Erro ao buscar mensagens (continuando sem ACK):', error);
      return []; // Retorna array vazio em vez de quebrar o app
    }
  }

  // Busca o status de uma mensagem específica
  async getMessageStatus(messageId: string): Promise<MessageStatus | null> {
    try {
      const messages = await this.getMessages();
      return messages.find(msg => msg.id === messageId) || null;
    } catch (error) {
      console.error(`[Webhook Service] Falha ao buscar status da mensagem ${messageId}:`, error);
      return null;
    }
  }

  // Normaliza os status para um formato consistente
  private normalizeStatus(status: string): 'sent' | 'DELIVERY_ACK' | 'READ' | 'PENDING' {
    switch (status.toUpperCase()) {
      case 'SENT':
        return 'sent';
      case 'DELIVERY_ACK':
      case 'DELIVERED':
        return 'DELIVERY_ACK';
      case 'READ':
        return 'READ';
      case 'PENDING':
      default:
        return 'PENDING';
    }
  }

  // Converte status para emoji visual
  getStatusEmoji(status: string): string {
    switch (status) {
      case 'sent':
        return '✓';
      case 'DELIVERY_ACK':
        return '✓✓';
      case 'read':
        return '✓✓';
      case 'PENDING':
      default:
        return '⏳';
    }
  }

  // Converte status para cor
  getStatusColor(status: string): string {
    switch (status) {
      case 'sent':
        return 'text-gray-500';
      case 'DELIVERY_ACK':
        return 'text-blue-500';
      case 'read':
        return 'text-green-500';
      case 'PENDING':
      default:
        return 'text-yellow-500';
    }
  }

  // Converte status para texto legível
  getStatusText(status: string): string {
    switch (status) {
      case 'sent':
        return 'Enviado';
      case 'DELIVERY_ACK':
        return 'Entregue';
      case 'read':
        return 'Lido';
      case 'PENDING':
      default:
        return 'Pendente';
    }
  }
}

export const webhookService = new WebhookService();