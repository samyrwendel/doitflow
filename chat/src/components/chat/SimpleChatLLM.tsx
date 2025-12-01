import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Send, Bot, Loader2, Trash2 } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'sonner';
import { nocodbService, type ChatMessage } from '@/services/nocodbService';
import { useConfig } from '@/hooks/useConfig';
import { useLLMTools, llmToolManager } from '@/services/llmTools';

interface AgentConfig {
  prompt: {
    system: string;
    context: string;
    instructions: string[];
  };
  config: {
    model: string;
    temperature: number;
    max_tokens: number;
    top_p: number;
  };
}

interface SimpleChatLLMProps {
  onMessageSent?: (message: ChatMessage) => void;
  className?: string;
  noWrapper?: boolean;
}

export interface SimpleChatLLMRef {
  clearChat: () => void;
}

export const SimpleChatLLM = forwardRef<SimpleChatLLMRef, SimpleChatLLMProps>(
  ({ onMessageSent, className = '', noWrapper = false }, ref) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
    const [sessionId] = useState(() => `session_${Date.now()}`);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Hooks para configuração e ferramentas LLM
    const { config, isSendTextEnabled, updateConfig } = useConfig();
    const { executeToolCall } = useLLMTools();
    




    const groqApiKey = import.meta.env.VITE_GROK_API_KEY;

    // Função para limpar sessão do chat
    const clearChatSession = () => {
      setMessages([]);
      localStorage.removeItem('tupperware-chat-messages');
      toast.success('Sessão do chat limpa');
    };

    // Função temporária para testar scroll com muitas mensagens
    const addTestMessages = () => {
      const testMessages: ChatMessage[] = [];
      for (let i = 1; i <= 20; i++) {
        testMessages.push({
          id: `test-user-${i}`,
          role: 'user',
          content: `Mensagem de teste do usuário ${i}. Esta é uma mensagem mais longa para testar o scroll do chat quando há muito conteúdo.`,
          timestamp: new Date(Date.now() - (20 - i) * 60000).toISOString()
        });
        testMessages.push({
          id: `test-assistant-${i}`,
          role: 'assistant',
          content: `Resposta do assistente ${i}. Esta é uma resposta mais detalhada para simular uma conversa real e verificar se o scroll funciona corretamente quando há muitas mensagens no chat.`,
          timestamp: new Date(Date.now() - (20 - i) * 60000 + 30000).toISOString()
        });
      }
      setMessages(testMessages);
      toast.success('Mensagens de teste adicionadas');
    };

    useImperativeHandle(ref, () => ({
      clearChat: clearChatSession
    }));

    // Auto-scroll para a última mensagem quando novas mensagens são adicionadas
    useEffect(() => {
      if (scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }
    }, [messages]);

    // Focar no input após enviar mensagem
    useEffect(() => {
      if (!isLoading && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [isLoading]);

    // Carregar configuração do agente com retry e backoff exponencial
    const loadAgentConfig = async (retryCount = 0, maxRetries = 3) => {
      const defaultConfig = {
        prompt: {
          system: 'Você é um assistente útil e prestativo.',
          context: '',
          instructions: []
        },
        config: {
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1.0
        }
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        const response = await fetch('/api/agente', {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setAgentConfig(data);
        console.log('Configuração do agente carregada com sucesso');
        
      } catch (error) {
        const isAbortError = error instanceof Error && error.name === 'AbortError';
        const isNetworkError = error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'));
        
        if (retryCount < maxRetries && (isAbortError || isNetworkError)) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Backoff exponencial, máximo 10s
          console.warn(`Tentativa ${retryCount + 1}/${maxRetries + 1} falhou, tentando novamente em ${delay}ms:`, error.message);
          
          setTimeout(() => {
            loadAgentConfig(retryCount + 1, maxRetries);
          }, delay);
          
          return;
        }
        
        // Após esgotar tentativas ou erro não recuperável, usar configuração padrão
        console.error('Falha ao carregar configuração do agente após todas as tentativas:', error instanceof Error ? error.message : String(error));
        console.log('Usando configuração padrão como fallback');
        setAgentConfig(defaultConfig);
      }
    };

    // Carregar mensagens do localStorage ao inicializar
    useEffect(() => {
      const savedMessages = localStorage.getItem('tupperware-chat-messages');
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          setMessages(parsedMessages);
        } catch (error) {
          console.error('Erro ao carregar mensagens salvas:', error);
          // Se falhar, tentar carregar do NocoDB
          loadChatHistory();
        }
      } else {
        // Se não há mensagens salvas, carregar do NocoDB
        loadChatHistory();
      }
      
      loadAgentConfig();
      
      // Escutar evento de atualização de configuração do PromptEditor
      const handleConfigUpdate = () => {
        console.log('SimpleChatLLM recebeu evento de atualização de configuração');
        loadAgentConfig();
      };
      
      window.addEventListener('agentConfigUpdated', handleConfigUpdate);
      
      // Cleanup do event listener
      return () => {
        window.removeEventListener('agentConfigUpdated', handleConfigUpdate);
      };
    }, []);

    // Salvar mensagens no localStorage sempre que mudarem
    useEffect(() => {
      if (messages.length > 0) {
        localStorage.setItem('tupperware-chat-messages', JSON.stringify(messages));
      }
    }, [messages]);

    const loadChatHistory = async () => {
      try {
        const chatHistory = await nocodbService.getChatMessages(sessionId);
        setMessages(chatHistory);
      } catch (error) {
        console.error('Erro ao carregar histórico do chat:', error);
        // Não quebrar a aplicação se não conseguir carregar o histórico
        setMessages([]);
      }
    };

    const buildSystemPrompt = () => {
      if (!agentConfig) {
        return 'Você é um assistente útil e prestativo.';
      }

      const { system, context, instructions } = agentConfig.prompt;
      let prompt = system;
      
      if (context) {
        prompt += `\n\nContexto: ${context}`;
      }
      
      if (instructions && Array.isArray(instructions) && instructions.length > 0) {
        prompt += `\n\nInstruções específicas:\n${instructions.map(inst => `- ${inst}`).join('\n')}`;
      }
      
      // Adicionar informações sobre ferramentas disponíveis se o toggle estiver ativado
      if (isSendTextEnabled && config) {
        prompt += `\n\n🔧 FERRAMENTAS DISPONÍVEIS:\n`;
        prompt += `- Envio de Texto Automático: Posso enviar mensagens via WhatsApp quando solicitado\n`;
        prompt += `- Instância configurada: ${config.instancia || 'Não configurada'}\n`;
        prompt += `- Telefones padrão: ${config.telefones || 'Não configurados'}\n`;
        prompt += `\nQuando o usuário pedir para enviar uma mensagem (ex: "enviar oi", "mandar mensagem"), `;
        prompt += `eu automaticamente usarei a ferramenta de envio de texto para disparar a mensagem via WhatsApp.`;
      }
      
      return prompt;
    };

    const sendMessage = async () => {
      if (!input.trim() || isLoading) return;
      
      // Debug: Verificar API key
      console.log('Debug API Key:', {
        hasKey: !!groqApiKey,
        keyLength: groqApiKey?.length,
        keyPrefix: groqApiKey?.substring(0, 8),
        isValidFormat: groqApiKey?.startsWith('gsk_')
      });
      
      if (!groqApiKey || !groqApiKey.startsWith('gsk_')) {
        toast.error('Chave da API Groq não configurada ou inválida');
        console.error('API Key inválida:', { hasKey: !!groqApiKey, keyPrefix: groqApiKey?.substring(0, 4) });
        return;
      }

      const userMessage: Omit<ChatMessage, 'id'> = {
        role: 'user',
        content: input.trim(),
        timestamp: new Date().toISOString(),
        session_id: sessionId
      };

      setInput('');
      setIsLoading(true);

      try {
        // Adicionar mensagem do usuário ao estado imediatamente
        const userMessageWithId = { ...userMessage, id: `user_${Date.now()}` };
        setMessages(prev => {
          const newMessages = [...prev, userMessageWithId];
          console.log('Mensagem do usuário adicionada:', {
            count: newMessages.length,
            lastMessage: newMessages[newMessages.length - 1]
          });
          return newMessages;
        });

        // Salvar mensagem do usuário no NocoDB (em background)
        try {
          await nocodbService.saveChatMessage(userMessage);
        } catch (saveError) {
          console.warn('Erro ao salvar mensagem no NocoDB:', saveError);
        }

        // Construir mensagens para a API
        const systemMessage = {
          role: 'system' as const,
          content: buildSystemPrompt()
        };
        
        // Usar o estado atual das mensagens (que já inclui a mensagem do usuário)
        const historyMessages = messages
          .concat(userMessageWithId) // Incluir a mensagem atual
          .filter(msg => msg.content && msg.content.trim())
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content.trim()
          }));
        
        const apiMessages = [systemMessage, ...historyMessages];
        
        console.log('Mensagens para API:', {
          systemMessage: systemMessage.content.substring(0, 50) + '...',
          historyCount: historyMessages.length,
          lastMessage: historyMessages[historyMessages.length - 1]
        });
        
        // Validar mensagens
        const isValidMessage = (msg: any) => {
          return msg.role && msg.content && 
                 ['system', 'user', 'assistant'].includes(msg.role) &&
                 typeof msg.content === 'string' && 
                 msg.content.trim().length > 0;
        };
        
        const validMessages = apiMessages.filter(isValidMessage);
        
        if (validMessages.length === 0) {
          throw new Error('Nenhuma mensagem válida para enviar');
        }

        // Obter ferramentas disponíveis
        const availableTools = llmToolManager.getToolsForLLM();
        
        const requestBody = {
          model: agentConfig?.config?.model || 'llama-3.3-70b-versatile',
          messages: validMessages,
          max_tokens: Math.min(Math.max(agentConfig?.config?.max_tokens || 1000, 1), 32768),
          temperature: Math.min(Math.max(agentConfig?.config?.temperature || 0.7, 0), 2),
          top_p: Math.min(Math.max(agentConfig?.config?.top_p || 1.0, 0), 1),
          tools: availableTools.length > 0 ? availableTools : undefined,
          tool_choice: availableTools.length > 0 ? 'auto' : undefined
        };

        // Debug: Log da requisição
        console.log('Enviando para Groq API:', {
          url: 'https://api.groq.com/openai/v1/chat/completions',
          model: requestBody.model,
          messagesCount: requestBody.messages.length,
          lastMessage: requestBody.messages[requestBody.messages.length - 1]
        });

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`
          },
          body: JSON.stringify(requestBody)
        });

        // Debug: Log da resposta
        console.log('Resposta da API:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro na API Groq:', {
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText
          });
          throw new Error(`Erro na API: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // Debug: Log dos dados recebidos
        console.log('Dados recebidos da API:', {
          hasChoices: !!data?.choices,
          choicesLength: data?.choices?.length,
          firstChoice: data?.choices?.[0],
          messageContent: data?.choices?.[0]?.message?.content,
          contentLength: data?.choices?.[0]?.message?.content?.length
        });
        
        let assistantContent = data?.choices?.[0]?.message?.content || 'Sem resposta';
        const toolCalls = data?.choices?.[0]?.message?.tool_calls;
        
        // Processar tool calls se existirem
        if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
          console.log('Tool calls detectadas:', toolCalls);
          
          for (const toolCall of toolCalls) {
            if (toolCall.type === 'function') {
              const functionName = toolCall.function.name;
              const functionArgs = toolCall.function.arguments;
              
              console.log('Executando tool call:', { functionName, functionArgs });
              
              try {
                let parsedArgs: any = {};
                if (functionArgs && typeof functionArgs === 'string') {
                  try {
                    parsedArgs = JSON.parse(functionArgs);
                  } catch (parseError) {
                    console.warn('Erro ao fazer parse dos argumentos:', parseError);
                  }
                }
                
                const toolResult = await executeToolCall({
                  name: functionName,
                  arguments: JSON.stringify(parsedArgs)
                });
                
                if (toolResult.success) {
                  // Usar toolResult.sentText se disponível (texto realmente enviado)
                  if (toolResult.sentText) {
                    assistantContent = `"${toolResult.sentText}"\n\n[WHATSAPP_ICON] Enviado com sucesso`;
                  } else {
                    assistantContent = `✅ ${functionName} executada com sucesso`;
                  }
                  
                  toast.success(functionName === 'send_hello_world' 
                    ? 'Hello World enviado via WhatsApp!' 
                    : 'Ferramenta executada com sucesso!');
                } else {
                  assistantContent += `\n\nErro ao executar ${functionName}: ${toolResult.error}`;
                  toast.error(`Erro ao executar ${functionName}`);
                }
              } catch (error) {
                console.error('Erro ao executar tool call:', error);
                assistantContent += `\n\nErro interno ao executar ${functionName}.`;
                toast.error(`Erro interno ao executar ${functionName}`);
              }
            }
          }
        }
        
        const assistantMessage: Omit<ChatMessage, 'id'> = {
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toISOString(),
          session_id: sessionId
        };
        
        // Debug: Log da mensagem do assistente
        console.log('Mensagem do assistente criada:', {
          role: assistantMessage.role,
          contentLength: assistantMessage.content.length,
          content: assistantMessage.content.substring(0, 100) + '...',
          timestamp: assistantMessage.timestamp
        });

        // Adicionar resposta do assistente ao estado imediatamente
        const assistantMessageWithId = { ...assistantMessage, id: `assistant_${Date.now()}` };
        setMessages(prev => {
          const newMessages = [...prev, assistantMessageWithId];
          console.log('Resposta do assistente adicionada:', {
            previousCount: prev.length,
            newCount: newMessages.length,
            lastMessage: newMessages[newMessages.length - 1],
            content: assistantMessageWithId.content.substring(0, 100) + '...'
          });
          return newMessages;
        });

        // Salvar resposta do assistente no NocoDB (em background)
        try {
          await nocodbService.saveChatMessage(assistantMessage);
        } catch (saveError) {
          console.warn('Erro ao salvar resposta do assistente no NocoDB:', saveError);
        }
        
        if (onMessageSent) {
          onMessageSent(assistantMessage);
        }

      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        toast.error('Erro ao comunicar com o LLM');
      } finally {
        setIsLoading(false);
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
        // Focar novamente no input após um pequeno delay
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 100);
      }
    };



    const chatContent = (
      <>
        <div className="flex-1 overflow-hidden relative min-h-0 max-h-full">
          <ScrollArea 
            ref={scrollAreaRef}
            className="h-full w-full"
            style={{ maxHeight: '100%', height: '100%' }}
          >
            <div className="space-y-3 p-1 pr-4 pb-2">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 mx-auto mb-3" />
                  <p>Inicie uma conversa com o agente</p>
                  {agentConfig && agentConfig.config?.model && (
                    <p className="text-xs mt-2">
                      Modelo: {agentConfig.config?.model}
                    </p>
                  )}
                </div>
              )}
              
              {messages.map((message, index) => {

                return (
                  <div
                    key={message.id || `${message.role}-${message.timestamp || Date.now()}-${index}`}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                  >
                    <div className={`max-w-[80%] ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white rounded-2xl rounded-br-md' 
                        : 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-2xl rounded-bl-md'
                    } p-4 shadow-sm`}>
                      {message.role === 'assistant' ? (
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {message.content.includes('[WHATSAPP_ICON]') ? (
                            <>
                              {message.content.split('[WHATSAPP_ICON]').map((part, index) => (
                                <span key={index}>
                                  {index > 0 && <FaWhatsapp className="inline w-4 h-4 mr-1 text-green-500" />}
                                  {part}
                                </span>
                              ))}
                            </>
                          ) : (
                            message.content
                          )}
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                      <span className={`text-xs mt-2 block ${
                        message.role === 'user' 
                          ? 'text-blue-100' 
                          : 'text-gray-500 dark:text-slate-400'
                      }`}>
                        {message.timestamp && !isNaN(new Date(message.timestamp).getTime()) 
                          ? new Date(message.timestamp).toLocaleTimeString()
                          : 'Agora'
                        }
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="max-w-[80%] bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-2xl rounded-bl-md p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Pensando...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        <div className="flex gap-2 mt-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="lg"
            className="self-end bg-blue-600 hover:bg-blue-700 text-white border-0 h-[60px] min-w-[60px] rounded-full aspect-square"
            style={{ borderRadius: '50%' }}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </>
    );

    if (noWrapper) {
      return (
        <div className={`flex flex-col h-full min-h-0 max-h-full overflow-hidden ${className}`}>
          {chatContent}
        </div>
      );
    }

    return (
      <Card className={`flex flex-col glass-card ${className}`}>
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-gray-400" />
              Chat com Agente
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={addTestMessages}
                className="h-8 px-2 text-xs bg-blue-500 text-white hover:bg-blue-600"
              >
                Testar Scroll
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearChatSession}
                className="h-8 px-2 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar
              </Button>
              <div className="flex items-center gap-2 text-sm">
                <span className={`${isSendTextEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                  Envio Automático
                </span>
                <Switch
                  checked={isSendTextEnabled}
                  onCheckedChange={(checked) => {
                    console.log('🔧 Toggle alterado:', checked);
                    updateConfig({ sendTextEnabled: checked });
                  }}
                />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col gap-3 p-4 min-h-0">
          {chatContent}
        </CardContent>
      </Card>
    );
  }
);

SimpleChatLLM.displayName = 'SimpleChatLLM';