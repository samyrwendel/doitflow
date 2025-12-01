import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Terminal,
  XCircle,
  Download,
  Trash2,
  Plus,
  CheckCircle,
  Info,
  AlertTriangle,
  Bug
} from 'lucide-react';

// React Icons para categorização
import {
  HiWrench,
  HiCog6Tooth,
  HiGlobeAlt,
  HiLink
} from 'react-icons/hi2';

interface EventLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
  source: string;
  message: string;
  details?: any;
}

interface EventsConsoleProps {
  onClearChat?: () => void;
}

export function EventsConsole({ onClearChat }: EventsConsoleProps) {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Carregar eventos do sessionStorage ao inicializar
  useEffect(() => {
    const savedEvents = sessionStorage.getItem('tupperware-events');
    if (savedEvents) {
      try {
        const parsedEvents = JSON.parse(savedEvents);
        setEvents(parsedEvents);
      } catch (error) {
        console.error('Erro ao carregar eventos salvos:', error);
      }
    }
  }, []);

  // Salvar eventos no sessionStorage sempre que mudarem
  useEffect(() => {
    if (events.length > 0) {
      sessionStorage.setItem('tupperware-events', JSON.stringify(events));
    }
  }, [events]);

  // Interceptar console.log, console.error, etc.
  useEffect(() => {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };

    const createLogInterceptor = (level: 'info' | 'warn' | 'error' | 'success' | 'debug', originalMethod: any) => {
      return (...args: any[]) => {
        // Chamar o método original
        originalMethod.apply(console, args);
        
        // Adicionar ao nosso log
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        addEvent({
          level,
          source: 'Console',
          message,
          details: args.length > 1 ? args : undefined
        });
      };
    };

    // Interceptar métodos do console
    console.log = createLogInterceptor('info', originalConsole.log);
    console.warn = createLogInterceptor('warn', originalConsole.warn);
    console.error = createLogInterceptor('error', originalConsole.error);
    console.info = createLogInterceptor('info', originalConsole.info);
    console.debug = createLogInterceptor('debug', originalConsole.debug);

    // Interceptar erros globais
    const handleError = (event: ErrorEvent) => {
      addEvent({
        level: 'error',
        source: 'Global Error',
        message: `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
        details: event.error
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addEvent({
        level: 'error',
        source: 'Unhandled Promise',
        message: `Unhandled promise rejection: ${event.reason}`,
        details: event.reason
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Adicionar evento
  const addEvent = (eventData: Omit<EventLog, 'id' | 'timestamp'>) => {
    const newEvent: EventLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('pt-BR', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit'
      }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0'),
      ...eventData
    };

    // Usar setTimeout para evitar setState durante render
    setTimeout(() => {
      setEvents(prev => [...prev, newEvent]);
    }, 0);
  };

  // Função para determinar o ícone baseado no nível do log
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return { icon: XCircle, color: 'text-red-400' };
      case 'warn':
        return { icon: AlertTriangle, color: 'text-yellow-400' };
      case 'success':
        return { icon: CheckCircle, color: 'text-green-400' };
      case 'info':
        return { icon: Info, color: 'text-blue-400' };
      case 'debug':
        return { icon: Bug, color: 'text-purple-400' };
      default:
        return { icon: Info, color: 'text-gray-400' };
    }
  };

  // Função para determinar a categoria do evento e retornar ícone e cor
  const getEventCategory = (event: EventLog) => {
    const source = event.source.toLowerCase();
    const message = event.message.toLowerCase();

    // Ferramentas/Tools
    if (source.includes('tool') || source.includes('ferramenta') ||
        message.includes('executando tool call') || message.includes('tool call')) {
      return {
        icon: HiWrench,
        color: 'text-purple-400',
        category: 'Ferramenta'
      };
    }

    // Sistema
    if (source.includes('global error') || source.includes('unhandled promise') ||
        source.includes('system') || message.includes('erro global')) {
      return {
        icon: HiCog6Tooth,
        color: 'text-orange-400',
        category: 'Sistema'
      };
    }

    // API
    if (message.includes('api') || message.includes('request') ||
        message.includes('response') || message.includes('evolution') ||
        message.includes('resposta da api') || message.includes('erro na api')) {
      return {
        icon: HiGlobeAlt,
        color: 'text-cyan-400',
        category: 'API'
      };
    }

    // Webhook
    if (message.includes('webhook') || message.includes('webhook.log')) {
      return {
        icon: HiLink,
        color: 'text-indigo-400',
        category: 'Webhook'
      };
    }

    // Console (padrão)
    return {
      icon: Terminal,
      color: 'text-gray-400',
      category: 'Console'
    };
  };

  // Auto scroll
  useEffect(() => {
    if (scrollAreaRef.current && events.length > 0) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [events]);

  // Limpar eventos
  const clearEvents = () => {
    setEvents([]);
    setExpandedEvents(new Set());
    sessionStorage.removeItem('tupperware-events');
    // Também limpar o chat se a função foi fornecida
    onClearChat?.();
  };

  // Exportar logs
  const exportLogs = () => {
    const logsText = events.map(event => 
      `[${event.timestamp}] [${event.level.toUpperCase()}] [${event.source}] ${event.message}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-log-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Toggle evento expandido
  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Extrair título da mensagem
  const extractTitle = (message: string) => {
    // Se a mensagem for muito longa, extrair apenas a primeira parte
    if (message.length <= 60) {
      return message;
    }
    
    // Tentar encontrar um ponto final ou quebra de linha
    const firstSentence = message.split('.')[0];
    if (firstSentence.length <= 60) {
      return firstSentence + '.';
    }
    
    // Se não encontrar, truncar e adicionar reticências
    return message.substring(0, 57) + '...';
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      <Card className="h-full flex flex-col overflow-hidden border-0">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Console de Eventos
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportLogs}
                className="h-8 px-2 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Exportar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearEvents}
                className="h-8 px-2 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full">
            <div className="space-y-2">
              {events.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum evento registrado</p>
                  </div>
                </div>
              ) : (
                events.map((event) => {
                  const category = getEventCategory(event);
                  const levelIcon = getLevelIcon(event.level);
                  const isExpanded = expandedEvents.has(event.id);
                  
                  return (
                    <div key={event.id} className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex-shrink-0 mt-0.5">
                        <category.icon className={`h-4 w-4 ${category.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <levelIcon.icon className={`h-3 w-3 ${levelIcon.color}`} />
                            <span className="text-xs font-medium text-muted-foreground">
                              {category.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">
                              {event.timestamp}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleEventExpansion(event.id)}
                              className="h-6 w-6 p-0 hover:bg-muted-foreground/20"
                            >
                              <Plus className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-foreground leading-relaxed break-words">
                          {extractTitle(event.message)}
                        </p>
                        
                        {isExpanded && (
                          <div className="mt-2 space-y-2">
                            <div className="text-xs text-muted-foreground">
                              <strong>Mensagem completa:</strong>
                            </div>
                            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 break-words">
                              {event.message}
                            </div>
                            
                            {event.details && (
                              <>
                                <div className="text-xs text-muted-foreground">
                                  <strong>Detalhes:</strong>
                                </div>
                                <pre className="text-xs text-muted-foreground bg-muted/50 rounded p-2 overflow-x-auto font-light leading-tight">
                                  {typeof event.details === 'object'
                                    ? JSON.stringify(event.details, null, 2)
                                    : String(event.details)
                                  }
                                </pre>
                              </>
                            )}
                            
                            <div className="text-xs text-muted-foreground">
                              <strong>Origem:</strong> {event.source} | <strong>Nível:</strong> <span className={`${levelIcon.color}`}>{event.level}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}