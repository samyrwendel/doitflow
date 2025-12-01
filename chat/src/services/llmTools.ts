import { EvolutionApiService, getEvolutionConfig } from './evolutionApi';
import { webhookService } from '../lib/webhookService';

// Interface para payload de envio de texto
export interface SendTextPayload {
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

// Interface para definir uma ferramenta que a LLM pode usar
export interface LLMTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  execute: (params: any) => Promise<any>;
}

// Ferramenta para envio de texto automático
export class SendTextTool implements LLMTool {
  name = 'send_text_automatic';
  description = 'Envia uma mensagem de texto via WhatsApp usando a Evolution API quando o toggle de envio automático estiver ativado';
  
  parameters = {
    type: 'object',
    properties: {
      number: {
        type: 'string',
        description: 'Número do WhatsApp para enviar a mensagem (formato: 5511999999999)'
      },
      text: {
        type: 'string',
        description: 'Texto da mensagem a ser enviada'
      },
      delay: {
        type: 'number',
        description: 'Delay em milissegundos antes de enviar (opcional)',
        default: 0
      },
      linkPreview: {
        type: 'boolean',
        description: 'Se deve mostrar preview de links (opcional)',
        default: true
      }
    },
    required: ['number', 'text']
  };

  private evolutionApiService: EvolutionApiService;

  constructor() {
    // Cria uma instância do serviço Evolution API sem usar hooks
    this.evolutionApiService = new EvolutionApiService();
  }

  async execute(params: { number: string; text: string; delay?: number; linkPreview?: boolean }) {
    try {
      const config = getEvolutionConfig();
      
      if (!config.url || !config.apiKey || !config.instanceName) {
        throw new Error('Configuração da Evolution API incompleta. Verifique URL, API Key e Instance Name.');
      }

      const payload: SendTextPayload = {
        number: params.number,
        text: params.text,
        delay: params.delay || 0,
        linkPreview: params.linkPreview !== false
      };

      const result = await this.evolutionApiService.sendText(config.instanceName, payload);
      
      return {
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao enviar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        error
      };
    }
  }
}

// Ferramenta para envio de texto personalizado com informações dinâmicas
export class SendCustomTextTool implements LLMTool {
  name = 'send_custom_text';
  description = 'Envia uma mensagem de texto personalizada via WhatsApp para um número específico. Pode incluir informações dinâmicas como data atual, hora, etc.';
  
  parameters = {
    type: 'object',
    properties: {
      number: {
        type: 'string',
        description: 'Número do WhatsApp para enviar a mensagem (formato: 5511999999999)'
      },
      text: {
        type: 'string',
        description: 'Texto da mensagem a ser enviada. Pode incluir informações dinâmicas como data atual.'
      },
      delay: {
        type: 'number',
        description: 'Delay em milissegundos antes de enviar (opcional)',
        default: 0
      },
      linkPreview: {
        type: 'boolean',
        description: 'Se deve mostrar preview de links (opcional)',
        default: true
      }
    },
    required: ['number', 'text']
  };

  private evolutionApiService: EvolutionApiService;

  constructor() {
    this.evolutionApiService = new EvolutionApiService();
  }

  private processText(text: string): string {
    // Processa o texto para incluir informações dinâmicas
    let processedText = text;
    
    // Substitui placeholders de data
    const now = new Date();
    const today = now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const time = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Se o texto menciona "data de hoje", "hoje", ou similar, inclui a data formatada
    if (text.toLowerCase().includes('data de hoje') || 
        text.toLowerCase().includes('hoje') ||
        text.toLowerCase().includes('data atual')) {
      processedText = `📅 ${today}`;
    }
    
    // Se menciona hora atual
    if (text.toLowerCase().includes('hora atual') || 
        text.toLowerCase().includes('que horas')) {
      processedText = `🕐 ${time}`;
    }
    
    // Se menciona data e hora
    if (text.toLowerCase().includes('data e hora')) {
      processedText = `📅 ${today}\n🕐 ${time}`;
    }
    
    return processedText;
  }

  async execute(params: { number: string; text: string; delay?: number; linkPreview?: boolean }) {
    try {
      const config = getEvolutionConfig();
      
      if (!config.url || !config.apiKey || !config.instanceName) {
        throw new Error('Configuração da Evolution API incompleta. Verifique URL, API Key e Instance Name.');
      }

      // Processa o texto para incluir informações dinâmicas
      const processedText = this.processText(params.text);

      const payload: SendTextPayload = {
        number: params.number,
        text: processedText,
        delay: params.delay || 0,
        linkPreview: params.linkPreview !== false
      };

      const result = await this.evolutionApiService.sendText(config.instanceName, payload);
      
      // Registrar mensagem no webhook para monitoramento de ACK
      try {
        if (result.key?.id) {
          await webhookService.registerMessage(result.key.id, params.number, processedText);
          console.log(`[SendCustomTextTool] Mensagem ${result.key.id} registrada no webhook para monitoramento`);
        }
      } catch (webhookError) {
        console.warn('[SendCustomTextTool] Erro ao registrar mensagem no webhook (continuando):', webhookError);
        // Não quebra o fluxo se o webhook falhar
      }
      
      return {
        success: true,
        message: `Mensagem personalizada enviada com sucesso para ${params.number}! 📱`,
        data: result,
        sentText: processedText
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao enviar mensagem personalizada: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        error
      };
    }
  }
}

// Ferramenta para envio de Hello World para número específico
export class HelloWorldTool implements LLMTool {
  name = 'send_hello_world';
  description = 'Envia "Hello World!" para o número 5567991257171 quando a palavra-chave "helloworld" for detectada';
  
  parameters = {
    type: 'object',
    properties: {},
    required: []
  };

  private evolutionApiService: EvolutionApiService;

  constructor() {
    this.evolutionApiService = new EvolutionApiService();
  }

  async execute() {
    try {
      const config = getEvolutionConfig();
      
      if (!config.url || !config.apiKey || !config.instanceName) {
        throw new Error('Configuração da Evolution API incompleta. Verifique URL, API Key e Instance Name.');
      }

      const payload: SendTextPayload = {
        number: '5567991257171',
        text: 'Hello World!',
        delay: 0,
        linkPreview: false
      };

      const result = await this.evolutionApiService.sendText(config.instanceName, payload);
      
      return {
        success: true,
        message: 'Hello World enviado com sucesso para 5567991257171!',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao enviar Hello World: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        error
      };
    }
  }
}

// Gerenciador de ferramentas para a LLM
export class LLMToolManager {
  private tools: Map<string, LLMTool> = new Map();

  constructor() {
    // Registra as ferramentas disponíveis
    this.registerTool(new SendTextTool());
    this.registerTool(new SendCustomTextTool());
    this.registerTool(new HelloWorldTool());
  }

  registerTool(tool: LLMTool) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): LLMTool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): LLMTool[] {
    return Array.from(this.tools.values());
  }

  getToolsForLLM() {
    return this.getAllTools().map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  async executeTool(name: string, params: any) {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Ferramenta '${name}' não encontrada`);
    }
    return await tool.execute(params);
  }
}

// Instância singleton do gerenciador de ferramentas
export const llmToolManager = new LLMToolManager();

// Hook para usar as ferramentas da LLM
export function useLLMTools() {
  const executeToolCall = async (toolCall: { name: string; arguments: string }) => {
    try {
      const params = JSON.parse(toolCall.arguments);
      const result = await llmToolManager.executeTool(toolCall.name, params);
      return result;
    } catch (error) {
      return {
        success: false,
        message: `Erro ao executar ferramenta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        error
      };
    }
  };

  const getAvailableTools = () => {
    return llmToolManager.getToolsForLLM();
  };

  return {
    executeToolCall,
    getAvailableTools
  };
}