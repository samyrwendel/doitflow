import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Terminal, Send, MailOpen, Mailbox } from 'lucide-react';
import { SimpleChatLLM } from '@/components/chat/SimpleChatLLM';
import { EventsConsole } from '@/components/EventsConsole';
import { AquecimentoTab } from '@/components/tabs/AquecimentoTab';
import UnifiedCampanhasTab from '@/components/tabs/UnifiedCampanhasTab';
import { useRef, useState, useEffect } from 'react';
import { FaWhatsapp, FaRocket } from 'react-icons/fa';
import { format } from 'date-fns';

export interface MessageLog {
  id: string;
  remoteJid: string;
  body: string;
  status: 'sent' | 'delivered' | 'read' | 'pending' | 'error';
  timestamp: string;
  updatedAt?: string;
  deliveredAt?: string;
  readAt?: string;
}

// Função para obter a data baseada no status
const getStatusDate = (msg: MessageLog, statusType: 'sent' | 'delivered' | 'read'): string | null => {
  switch (statusType) {
    case 'sent':
      return msg.timestamp;
    case 'delivered':
      return msg.deliveredAt || null;
    case 'read':
      return msg.readAt || null;
    default:
      return null;
  }
};

// Função para retornar ícone com cor baseado no status e dados disponíveis
const getStatusIcon = (msg: MessageLog) => {
  // Prioriza o status baseado nos campos de data disponíveis
  if (msg.readAt) {
    return (
      <div className="flex items-center justify-center" title="Lido">
        <MailOpen className="w-4 h-4 text-green-500" />
      </div>
    );
  }
  
  if (msg.deliveredAt) {
    return (
      <div className="flex items-center justify-center" title="Entregue">
        <Mailbox className="w-4 h-4 text-yellow-500" />
      </div>
    );
  }
  
  // Fallback para status original
  switch (msg.status) {
    case 'read':
      return (
        <div className="flex items-center justify-center" title="Lido">
          <MailOpen className="w-4 h-4 text-green-500" />
        </div>
      );
    case 'delivered':
      return (
        <div className="flex items-center justify-center" title="Entregue">
          <Mailbox className="w-4 h-4 text-yellow-500" />
        </div>
      );
    case 'pending':
      return (
        <div className="flex items-center justify-center" title="Pendente">
          <Send className="w-4 h-4 text-gray-400" />
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center justify-center" title="Erro">
          <Send className="w-4 h-4 text-red-500" />
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center" title="Enviado">
          <Send className="w-4 h-4 text-blue-500" />
        </div>
      );
  }
};

export function GestaoEnvioTab() {
  const chatRef = useRef<{ clearChat: () => void }>(null);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/messages');
        if (!response.ok) {
          throw new Error(`Falha ao buscar dados do servidor webhook: ${response.status} ${response.statusText}`);
        }
        
        // Verifica se a resposta é JSON válido
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Resposta do servidor não é JSON válido');
        }
        
        const data = await response.json();
        setMessages(data);
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'TypeError' && err.message.includes('fetch')) {
            setError('Servidor webhook não está disponível. Verifique se está rodando na porta 3007.');
          } else {
            setError(err.message);
          }
        } else {
          setError('Ocorreu um erro desconhecido.');
        }
        console.error('Erro ao buscar mensagens:', err);
      }
    };

    fetchMessages();

    // Atualiza os dados a cada 5 segundos
    const intervalId = setInterval(fetchMessages, 5000);

    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="h-[calc(100vh-120px)] pb-2.5 px-6 pt-6">
      <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda */}
        <Card className="h-full flex flex-col glass-card">
          <CardContent className="flex-1 flex flex-col p-6 min-h-0">
            <SimpleChatLLM ref={chatRef} className="h-full" noWrapper />
          </CardContent>
        </Card>

        {/* Coluna Direita */}
        <Card className="h-full flex flex-col glass-card">
          <CardContent className="flex-1 flex flex-col p-6 min-h-0">
            <Tabs defaultValue="eventos" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="eventos" className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  <span className="hidden sm:inline">Eventos</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="campanhas" className="flex items-center gap-2">
                  <FaRocket className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline">Campanhas</span>
                </TabsTrigger>
                <TabsTrigger value="aquecimento" className="flex items-center gap-2">
                  <FaWhatsapp className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline">Dispositivos</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="eventos" className="flex-1 mt-0 relative">
                <EventsConsole onClearChat={() => chatRef.current?.clearChat()} />
              </TabsContent>
              
              <TabsContent value="analytics" className="flex-1 mt-0 overflow-hidden">
                <Card className="border-0 shadow-none h-full">
                  <CardContent className="p-0 h-full flex flex-col">
                    {error ? (
                      <div className="text-center text-red-500 py-8">
                        <p>Erro: {error}</p>
                      </div>
                    ) : (
                      <div
                        className="analytics-scroll-container flex-1"
                        style={{
                          overflow: 'auto',
                          scrollbarWidth: 'none', /* Firefox */
                          msOverflowStyle: 'none', /* IE and Edge */
                          WebkitScrollbar: {
                            display: 'none' /* Chrome, Safari and Opera */
                          }
                        } as any}
                      >
                        <style>{`
                          .analytics-scroll-container::-webkit-scrollbar {
                            display: none !important;
                            width: 0 !important;
                            height: 0 !important;
                          }
                        `}</style>
                        <div className="min-w-full">
                          <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                              <TableRow>
                                <TableHead className="w-[40px] px-2">Status</TableHead>
                                <TableHead className="w-[80px] px-2">Destinatário</TableHead>
                                <TableHead className="px-2">Mensagem</TableHead>
                                <TableHead className="w-[80px] px-2">Enviado</TableHead>
                                <TableHead className="w-[80px] px-2">Entregue</TableHead>
                                <TableHead className="w-[80px] px-2">Lido</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {messages.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                    Nenhuma mensagem encontrada
                                  </TableCell>
                                </TableRow>
                              ) : (
                                messages.map((msg, index) => (
                                  <TableRow
                                    key={msg.id}
                                    className={index % 2 === 0 ? "bg-gray-800/30" : "bg-gray-700/20"}
                                  >
                                    <TableCell className="p-2">
                                      {getStatusIcon(msg)}
                                    </TableCell>
                                    <TableCell className="font-medium text-xs p-2">
                                      <span className="truncate block" title={msg.remoteJid}>
                                        {msg.remoteJid}
                                      </span>
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <div className="max-w-[200px]" title={msg.body}>
                                        <span className="truncate block text-xs">
                                          {msg.body}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="p-2">
                                      {getStatusDate(msg, 'sent') ? (
                                        <div className="text-xs text-gray-300 font-mono whitespace-nowrap">
                                          {format(new Date(getStatusDate(msg, 'sent')!), 'dd/MM HH:mm')}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="p-2">
                                      {getStatusDate(msg, 'delivered') ? (
                                        <div className="text-xs text-gray-300 font-mono whitespace-nowrap">
                                          {format(new Date(getStatusDate(msg, 'delivered')!), 'dd/MM HH:mm')}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="p-2">
                                      {getStatusDate(msg, 'read') ? (
                                        <div className="text-xs text-gray-300 font-mono whitespace-nowrap">
                                          {format(new Date(getStatusDate(msg, 'read')!), 'dd/MM HH:mm')}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="campanhas" className="flex-1 mt-0">
                <UnifiedCampanhasTab />
              </TabsContent>

              <TabsContent value="aquecimento" className="flex-1 mt-0">
                <AquecimentoTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}