import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { XCircle, MessageSquare, Clock, MessageCircle, Check, CheckCheck, Circle } from 'lucide-react';
// Tipo local para histórico de mensagens
interface MessageHistoryItem {
  id: string;
  status: string;
  ackStatus?: string;
  telefone: string;
  mensagem: string;
  timestamp: string;
}

interface MessageHistoryProps {
  messages: MessageHistoryItem[];
}

function AckStatusIndicator({ ackStatus }: { ackStatus?: string }) {
  if (!ackStatus) {
    return (
      <span className="text-gray-400" title="Status não disponível">
        <Clock className="w-4 h-4" />
      </span>
    );
  }

  // Implementação simples de status
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'sent': return { icon: <Check className="w-4 h-4" />, color: 'text-blue-500', text: 'Enviado' };
      case 'delivered': return { icon: <CheckCheck className="w-4 h-4" />, color: 'text-green-500', text: 'Entregue' };
      case 'read': return { icon: <CheckCheck className="w-4 h-4" />, color: 'text-blue-500', text: 'Lido' };
      default: return { icon: <Circle className="w-4 h-4" />, color: 'text-gray-400', text: 'Desconhecido' };
    }
  };

  const { icon, color, text } = getStatusInfo(ackStatus);

  return (
    <span className={`${color}`} title={text}>
      {icon}
    </span>
  );
}

export function MessageHistory({ messages }: MessageHistoryProps) {
  return (
    <Card className="glass-card h-full">
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5" style={{color: 'var(--text-primary)'}} />
          <h2 className="text-sm" style={{color: 'var(--text-secondary)'}}>Histórico de Mensagens</h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="glass-surface rounded-lg">
            <Table>
              <TableHeader className="border-b-0">
                <TableRow className="glass-surface hover:glass-primary transition-all duration-200 border-b-0">
                  <TableHead style={{color: 'var(--text-secondary)'}}>Status</TableHead>
                  <TableHead style={{color: 'var(--text-secondary)'}}>ACK</TableHead>
                  <TableHead style={{color: 'var(--text-secondary)'}}>Telefone</TableHead>
                  <TableHead style={{color: 'var(--text-secondary)'}}>Mensagem</TableHead>
                  <TableHead style={{color: 'var(--text-secondary)'}} className="text-right">Horário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center glass-surface" style={{color: 'var(--text-secondary)'}}>
                      Nenhuma mensagem enviada
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map((msg) => (
                    <TableRow key={msg.id} className="glass-surface hover:glass-primary transition-all duration-200">
                      <TableCell>
                        {msg.status === 'success' ? (
                          <MessageCircle className="w-5 h-5" style={{color: 'var(--color-primary)'}} />
                        ) : (
                          <XCircle className="w-5 h-5" style={{color: 'var(--color-quaternary)'}} />
                        )}
                      </TableCell>
                      <TableCell>
                        <AckStatusIndicator ackStatus={msg.ackStatus} />
                      </TableCell>
                      <TableCell style={{color: 'var(--text-primary)'}}>{msg.telefone}</TableCell>
                      <TableCell style={{color: 'var(--text-primary)'}} className="max-w-[150px] truncate">
                        {msg.mensagem}
                      </TableCell>
                      <TableCell style={{color: 'var(--text-primary)'}} className="text-right">{msg.timestamp}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}