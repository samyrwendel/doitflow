import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Clock, Eye, Send, MailOpen, Mailbox, User, Calendar, MessageSquare } from 'lucide-react'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

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
      <div className="flex items-center gap-2">
        <MailOpen className="w-4 h-4 text-green-500" />
        <span className="text-green-500">Lido</span>
      </div>
    );
  }
  
  if (msg.deliveredAt) {
    return (
      <div className="flex items-center gap-2">
        <Mailbox className="w-4 h-4 text-yellow-500" />
        <span className="text-yellow-500">Entregue</span>
      </div>
    );
  }
  
  // Fallback para status original
  switch (msg.status) {
    case 'read':
      return (
        <div className="flex items-center gap-2">
          <MailOpen className="w-4 h-4 text-green-500" />
          <span className="text-green-500">Lido</span>
        </div>
      );
    case 'delivered':
      return (
        <div className="flex items-center gap-2">
          <Mailbox className="w-4 h-4 text-yellow-500" />
          <span className="text-yellow-500">Entregue</span>
        </div>
      );
    case 'pending':
      return (
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400">Pendente</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-red-500" />
          <span className="text-red-500">Erro</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-blue-500" />
          <span className="text-blue-500">Enviado</span>
        </div>
      );
  }
};

export function DashboardTab() {
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/messages');
        if (!response.ok) {
          throw new Error('Falha ao buscar dados do servidor webhook.');
        }
        const data = await response.json();
        setMessages(data);
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ocorreu um erro desconhecido.');
        }
        console.error(err);
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
      <Card className="h-full flex flex-col glass-card">
        <CardContent className="flex-1 flex flex-col p-6 min-h-0">
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="flex-1 overflow-auto scrollbar-hide">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 border-b border-border">
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-500" />
                      <span className="uppercase font-bold">Status</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="uppercase font-bold">Destinatário</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      <span className="uppercase font-bold">Mensagem</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Calendar className="w-4 h-4 text-green-500" />
                      <span className="uppercase font-bold">Data do Envio</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span className="uppercase font-bold">Data da Entrega</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Eye className="w-4 h-4 text-purple-500" />
                      <span className="uppercase font-bold">Data da Leitura</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell>
                      {getStatusIcon(msg)}
                    </TableCell>
                    <TableCell>{msg.remoteJid.split('@')[0]}</TableCell>
                    <TableCell className="max-w-xs truncate" title={msg.body}>
                      {msg.body}
                    </TableCell>
                    <TableCell className="text-right">
                      {getStatusDate(msg, 'sent') ? format(new Date(getStatusDate(msg, 'sent')!), 'dd/MM/yyyy HH:mm:ss') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {getStatusDate(msg, 'delivered') ? format(new Date(getStatusDate(msg, 'delivered')!), 'dd/MM/yyyy HH:mm:ss') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {getStatusDate(msg, 'read') ? format(new Date(getStatusDate(msg, 'read')!), 'dd/MM/yyyy HH:mm:ss') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {messages.length === 0 && !error && (
              <p className="text-center text-gray-500 mt-4">Nenhum disparo registrado ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
