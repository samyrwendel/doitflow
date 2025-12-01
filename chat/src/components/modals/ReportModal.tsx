import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageLog } from '../tabs/DashboardTab';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: MessageLog[];
}

export function ReportModal({ isOpen, onClose, messages }: ReportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('all');
  const [phone, setPhone] = useState('');

  const getStatusDate = (msg: MessageLog, statusType: 'sent' | 'delivered' | 'read'): string | null => {
    switch (statusType) {
      case 'sent':
        return msg.timestamp || null;
      case 'delivered':
        return msg.deliveredAt || null;
      case 'read':
        return msg.readAt || null;
      default:
        return null;
    }
  };

  const formatDate = (date: string | null) => {
    return date ? format(new Date(date), 'dd/MM/yyyy HH:mm:ss') : '-';
  };

  const getStatusText = (status: MessageLog['status']) => {
    switch (status) {
      case 'sent': return 'Enviado';
      case 'delivered': return 'Entregue';
      case 'read': return 'Lido';
      case 'pending': return 'Pendente';
      case 'error': return 'Erro';
      default: return 'Desconhecido';
    }
  };

  const generateReport = () => {
    const doc = new jsPDF();
    const tableColumn = ["Status", "Destinatário", "Mensagem", "Data de Envio", "Data da Entrega", "Data da Leitura"];
    const tableRows: (string | null)[][] = [];

    const filteredMessages = messages.filter(msg => {
      if (!msg.timestamp) return false;
      const messageDate = new Date(msg.timestamp);
      const startDateFilter = startDate ? new Date(`${startDate}T00:00:00`) : null;
      const endDateFilter = endDate ? new Date(`${endDate}T23:59:59`) : null;

      const statusMatch = () => {
        if (!status || status === 'all') return true;
        if (status === 'sent') return msg.status === 'sent';
        if (status === 'delivered') return msg.status === 'delivered';
        if (status === 'read') return msg.status === 'read';
        return msg.status === status;
      };

      const phoneFilter = phone ? msg.remoteJid.includes(phone) : true;

      const dateFilter =
        (!startDateFilter || messageDate >= startDateFilter) &&
        (!endDateFilter || messageDate <= endDateFilter);

      return dateFilter && statusMatch() && phoneFilter;
    });

    filteredMessages.forEach(msg => {
      const messageData = [
        getStatusText(msg.status),
        msg.remoteJid.split('@')[0],
        msg.body,
        formatDate(getStatusDate(msg, 'sent')),
        formatDate(getStatusDate(msg, 'delivered')),
        formatDate(getStatusDate(msg, 'read')),
      ];
      tableRows.push(messageData);
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(18);
    doc.text("Relatório de Entregas", pageWidth / 2, 22, { align: 'center' });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: {
        fillColor: [38, 38, 38],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      didParseCell: function (data) {
        if (data.section === 'head' && data.cell.text) {
          data.cell.text = data.cell.text.map(item => item.toUpperCase());
        }
      },
      didDrawPage: function (data) {
        const pageCount = (doc.internal as any).getNumberOfPages();
        doc.setFontSize(10);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
        const generationDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');
        doc.text(
          `Gerado em: ${generationDate}`,
          pageWidth - data.settings.margin.right,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        );
      },
    });

    doc.save("relatorio_entregas.pdf");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[var(--glass-secondary)] backdrop-blur-[12px] border-[1px] border-[var(--border-primary)] shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <DialogHeader>
          <DialogTitle>Gerar Relatório de Entregas</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="startDate" className="text-right">
              Data Inicial
            </label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="endDate" className="text-right">
              Data Final
            </label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="status" className="text-right">
              Status
            </label>
            <Select onValueChange={setStatus} value={status}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione um status" />
              </SelectTrigger>
              <SelectContent className="bg-white text-black">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="read">Lido</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="phone" className="text-right">
              Telefone
            </label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="col-span-3"
              placeholder="Filtre por número de telefone"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={generateReport} className="glass-button">Gerar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}