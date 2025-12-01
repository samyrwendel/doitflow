import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { nocodbService, type ChatMessage } from '@/services/nocodbService';

interface ChatLLMProps {
  onMessageSent?: (message: ChatMessage) => void;
  className?: string;
}

export function ChatLLM({ onMessageSent, className = '' }: ChatLLMProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const apiKey = import.meta.env.VITE_GROK_API_KEY;
  const model = import.meta.env.VITE_GROK_MODEL || 'grok-beta';

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Carregar mensagens do localStorage ao inicializar
  useEffect(() => {
    const savedMessages = localStorage.getItem('tupperware-chatllm-messages');
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
  }, []);

  // Salvar mensagens no localStorage sempre que mudarem
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('tupperware-chatllm-messages', JSON.stringify(messages));
    }
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const chatHistory = await nocodbService.getChatMessages(sessionId);
      setMessages(chatHistory);
    } catch (error) {
      console.error('Erro ao carregar histórico do chat:', error);
    }
  };

  // Função para limpar sessão do chat
  const clearChatSession = () => {
    setMessages([]);
    localStorage.removeItem('tupperware-chatllm-messages');
    toast.success('Sessão do chat limpa');
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    if (!apiKey) {
      toast.error('Chave da API Grok não configurada');
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
      // Salvar mensagem do usuário no NocoDB
      const savedUserMessage = await nocodbService.saveChatMessage(userMessage);
      setMessages(prev => [...prev, savedUserMessage]);

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: userMessage.content
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Omit<ChatMessage, 'id'> = {
        role: 'assistant',
        content: data.choices[0]?.message?.content || 'Sem resposta',
        timestamp: new Date().toISOString(),
        session_id: sessionId
      };

      // Salvar resposta do assistente no NocoDB
      const savedAssistantMessage = await nocodbService.saveChatMessage(assistantMessage);
      setMessages(prev => [...prev, savedAssistantMessage]);
      
      if (onMessageSent) {
        onMessageSent(savedAssistantMessage);
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
    }
  };



  return (
    <Card className={`flex flex-col glass-card ${className}`}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-slate-100">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-gray-400" />
            Chat com Grok
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearChatSession}
            className="h-8 px-2 text-xs"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-3 p-4 min-h-0">
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 pr-4 overflow-y-auto scrollbar-hide"
        >
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 py-8">
                <Bot className="h-12 w-12 mx-auto mb-3 text-slate-500" />
                <p>Inicie uma conversa com o Grok</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
              >
                <div className={`max-w-[80%] ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white rounded-2xl rounded-br-md' 
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-2xl rounded-bl-md'
                } p-4 shadow-sm`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <span className={`text-xs mt-2 block ${
                    message.role === 'user' 
                      ? 'text-blue-100' 
                      : 'text-gray-500 dark:text-slate-400'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            
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
        
        <div className="flex gap-2 flex-shrink-0">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="flex-1 min-h-[60px] max-h-[120px] resize-none bg-slate-800/50 border-slate-600 text-slate-100 placeholder-slate-400 focus:border-gray-500"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="lg"
            className="self-end bg-blue-600 hover:bg-blue-700 text-white border-0 h-[60px] min-w-[60px] flex-shrink-0 rounded-full aspect-square"
            style={{ borderRadius: '50%' }}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}