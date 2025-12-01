import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
// Tipos locais para o modal
interface CreateInstancePayload {
  instanceName: string;
  token: string;
  qrcode: boolean;
  number: string;
  integration: string;
  rejectCall: boolean;
  msgCall: string;
  groupsIgnore: boolean;
  alwaysOnline: boolean;
  readMessages: boolean;
  readStatus: boolean;
  syncFullHistory: boolean;
}

interface InstanceResponse {
  instance: {
    instanceName: string;
    [key: string]: any;
  };
}

interface CreateInstanceModalProps {
  evolutionUrl: string;
  apiKey: string;
  onInstanceCreated?: (instance: InstanceResponse) => void;
}

export function CreateInstanceModal({ evolutionUrl, apiKey, onInstanceCreated }: CreateInstanceModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateInstancePayload>({
    instanceName: '',
    token: '',
    qrcode: true,
    number: '',
    integration: 'WHATSAPP-BAILEYS',
    rejectCall: false,
    msgCall: '',
    groupsIgnore: true,
    alwaysOnline: false,
    readMessages: false,
    readStatus: false,
    syncFullHistory: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.instanceName.trim()) {
      toast.error('Nome da instância é obrigatório');
      return;
    }

    if (!evolutionUrl || !apiKey) {
      toast.error('Configure a URL da Evolution API e a chave API primeiro');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${evolutionUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      const result: InstanceResponse = await response.json();
      
      toast.success('Instância criada com sucesso!', {
        description: `Instância: ${result.instance.instanceName}`
      });

      onInstanceCreated?.(result);
      setOpen(false);
      
      // Reset form
      setFormData({
        instanceName: '',
        token: '',
        qrcode: true,
        number: '',
        integration: 'WHATSAPP-BAILEYS',
        rejectCall: false,
        msgCall: '',
        groupsIgnore: true,
        alwaysOnline: false,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false
      });
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      toast.error('Erro ao criar instância', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof CreateInstancePayload, value: string | boolean) => {
    setFormData((prev: CreateInstancePayload) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="glass-card px-6 py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
          style={{color: 'var(--text-primary)'}}
        >
          <Plus className="w-5 h-5 mr-2" style={{color: 'var(--color-primary)'}} />
          Cadastrar Nova Instância
        </Button>
      </DialogTrigger>
      
      <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
            Cadastrar Nova Instância - Evolution API
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instanceName" className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                Nome da Instância *
              </Label>
              <Input
                id="instanceName"
                value={formData.instanceName}
                onChange={(e) => handleFieldChange('instanceName', e.target.value)}
                className="glass-input rounded-xl h-12"
                style={{color: 'var(--text-primary)'}}
                placeholder="minha-instancia"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="token" className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                Token (Opcional)
              </Label>
              <Input
                id="token"
                value={formData.token}
                onChange={(e) => handleFieldChange('token', e.target.value)}
                className="glass-input rounded-xl h-12"
                style={{color: 'var(--text-primary)'}}
                placeholder="Token personalizado"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="number" className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                Número (Opcional)
              </Label>
              <Input
                id="number"
                value={formData.number}
                onChange={(e) => handleFieldChange('number', e.target.value)}
                className="glass-input rounded-xl h-12"
                style={{color: 'var(--text-primary)'}}
                placeholder="5511999999999"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="integration" className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                Integração
              </Label>
              <Select
                value={formData.integration}
                onValueChange={(value) => handleFieldChange('integration', value)}
              >
                <SelectTrigger className="glass-input rounded-xl h-12" style={{color: 'var(--text-primary)'}}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border rounded-xl">
                  <SelectItem value="WHATSAPP-BAILEYS" style={{color: 'var(--text-primary)'}}>WhatsApp Baileys</SelectItem>
                  <SelectItem value="WHATSAPP-BUSINESS" style={{color: 'var(--text-primary)'}}>WhatsApp Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="msgCall" className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                Mensagem de Chamada
              </Label>
              <Input
                id="msgCall"
                value={formData.msgCall}
                onChange={(e) => handleFieldChange('msgCall', e.target.value)}
                className="glass-input rounded-xl h-12"
                style={{color: 'var(--text-primary)'}}
                placeholder="Mensagem automática para chamadas"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium" style={{color: 'var(--text-primary)'}}>
              Configurações
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 glass-surface rounded-xl">
                <Label htmlFor="qrcode" className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Gerar QR Code
                </Label>
                <Switch
                  id="qrcode"
                  checked={formData.qrcode}
                  onCheckedChange={(checked) => handleFieldChange('qrcode', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 glass-surface rounded-xl">
                <Label htmlFor="rejectCall" className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Rejeitar Chamadas
                </Label>
                <Switch
                  id="rejectCall"
                  checked={formData.rejectCall}
                  onCheckedChange={(checked) => handleFieldChange('rejectCall', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 glass-surface rounded-xl">
                <Label htmlFor="groupsIgnore" className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Ignorar Grupos
                </Label>
                <Switch
                  id="groupsIgnore"
                  checked={formData.groupsIgnore}
                  onCheckedChange={(checked) => handleFieldChange('groupsIgnore', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 glass-surface rounded-xl">
                <Label htmlFor="alwaysOnline" className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Sempre Online
                </Label>
                <Switch
                  id="alwaysOnline"
                  checked={formData.alwaysOnline}
                  onCheckedChange={(checked) => handleFieldChange('alwaysOnline', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 glass-surface rounded-xl">
                <Label htmlFor="readMessages" className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Ler Mensagens
                </Label>
                <Switch
                  id="readMessages"
                  checked={formData.readMessages}
                  onCheckedChange={(checked) => handleFieldChange('readMessages', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 glass-surface rounded-xl">
                <Label htmlFor="readStatus" className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Ler Status
                </Label>
                <Switch
                  id="readStatus"
                  checked={formData.readStatus}
                  onCheckedChange={(checked) => handleFieldChange('readStatus', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between p-3 glass-surface rounded-xl">
                <Label htmlFor="syncFullHistory" className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Sincronizar Histórico
                </Label>
                <Switch
                  id="syncFullHistory"
                  checked={formData.syncFullHistory}
                  onCheckedChange={(checked) => handleFieldChange('syncFullHistory', checked)}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="glass-surface px-6 py-3 rounded-xl"
              style={{color: 'var(--text-secondary)'}}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="glass-card px-6 py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
              style={{color: 'var(--text-primary)'}}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" style={{color: 'var(--color-primary)'}} />
                  Criar Instância
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}