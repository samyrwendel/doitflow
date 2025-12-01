import { useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteInstanceModalProps {
  instanceName: string;
  onConfirm: () => Promise<void>;
  trigger: React.ReactNode;
}

export function DeleteInstanceModal({ instanceName, onConfirm, trigger }: DeleteInstanceModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  console.log('DeleteInstanceModal renderizado:', { instanceName, hasOnConfirm: !!onConfirm, hasTrigger: !!trigger });

  const handleConfirm = async () => {
    console.log('handleConfirm chamado para instância:', instanceName);
    setLoading(true);
    try {
      await onConfirm();
      toast.success('Instância removida com sucesso!', {
        description: `A instância "${instanceName}" foi removida do sistema`
      });
      setOpen(false);
      // Aguardar um pouco antes de recarregar para mostrar o toast
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Erro detalhado ao remover instância:', error);
      
      let errorMessage = 'Erro ao remover instância';
      let errorDescription = 'Erro desconhecido';
      
      if (error instanceof Error) {
        if (error.message.includes('não encontrada')) {
          errorMessage = 'Instância não encontrada';
          errorDescription = 'A instância pode já ter sido removida ou não existe no banco de dados';
        } else if (error.message.includes('ativa para deletar')) {
          errorMessage = 'Nenhuma instância ativa';
          errorDescription = 'Não há instância configurada para ser removida';
        } else {
          errorDescription = error.message;
        }
      }
      
      toast.error(errorMessage, {
        description: errorDescription
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => {
        console.log('Trigger clicado, abrindo modal para instância:', instanceName);
        setOpen(true);
      }}>
        {trigger}
      </div>
      
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
              Confirmar Exclusão
            </DialogTitle>
          </div>
          <DialogDescription className="text-left" style={{color: 'var(--text-secondary)'}}>
            Tem certeza que deseja excluir definitivamente a instância <strong>"{instanceName}"</strong>?
            <br /><br />
            Esta ação não pode ser desfeita e todos os dados da instância serão removidos permanentemente.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex gap-3 pt-4">
          <Button
            onClick={() => setOpen(false)}
            variant="outline"
            className="flex-1 border-white/20 text-white hover:bg-white/10 rounded-xl h-12"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl h-12 transition-all shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Excluir Definitivamente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}