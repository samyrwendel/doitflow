import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Switch } from '@/components/ui/switch';
import { Sparkles, Trash2, Save, Globe } from 'lucide-react';
import { useEvolutionApi } from "@/services/evolutionApi";
import { DeleteInstanceModal } from '@/components/modals/DeleteInstanceModal';
import { toast } from 'sonner';

// Tipo local para configuração
interface ConfigData {
  instancia: string;
  chave: string;
  evolutionUrl: string;
  telefones: string;
  mensagem: string;
  openaiKey: string;
  openaiModel: string;
  sendTextEnabled: boolean;
}

export function ConfigurationTab() {
  const [config, setConfig] = useState<ConfigData>({
    instancia: '',
    chave: '',
    evolutionUrl: '',
    telefones: '',
    mensagem: '',
    openaiKey: '',
    openaiModel: 'gpt-4o-mini',
    sendTextEnabled: false
  });
  const evolutionApi = useEvolutionApi();
  const [instanceStatus, setInstanceStatus] = useState<Record<string, string>>({});
  const [loadingStatus, setLoadingStatus] = useState(false);

  const deleteCurrentInstance = async () => {
    try {
      // Limpar dados locais
      setConfig(prev => ({
        ...prev,
        instancia: '',
        chave: '',
        evolutionUrl: ''
      }));
      
      // Limpar status
      setInstanceStatus({});
      
      toast.success('Instância removida com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar instância:', error);
      toast.error('Erro ao deletar instância');
    }
  };

  // Função para verificar o status real das instâncias
  const checkInstanceStatusFunc = async () => {
    // Verificações mais robustas
    if (!config.evolutionUrl || !config.chave || !config.instancia) {
      console.log('Dados incompletos para verificar status');
      return;
    }

    setLoadingStatus(true);
    try {
      const response = await evolutionApi.getInstanceStatus(config.instancia, config.evolutionUrl, config.chave);
      const status = response?.instance?.state || 'unknown';
      setInstanceStatus(prev => ({
        ...prev,
        [config.instancia]: status
      }));
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setInstanceStatus(prev => ({
        ...prev,
        [config.instancia]: 'error'
      }));
    } finally {
      setLoadingStatus(false);
    }
  };

  // Verificar status quando os dados necessários estiverem disponíveis
  useEffect(() => {
    if (config.evolutionUrl && config.chave && config.instancia && config.instancia.length > 1) {
      checkInstanceStatusFunc();
    } else {
      // Limpar status se não há instância configurada
      setInstanceStatus({});
    }
  }, [config.evolutionUrl, config.chave, config.instancia]);

  const handleSave = async () => {
    try {
      toast.success('Configurações salvas com sucesso!');
      
      // Verificar status da instância após salvar
      if (config.instancia && config.chave && config.evolutionUrl) {
        await checkInstanceStatusFunc();
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  const onFieldChange = (field: keyof ConfigData, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const clearAllData = () => {
    setConfig({
      instancia: '',
      chave: '',
      evolutionUrl: '',
      telefones: '',
      mensagem: '',
      openaiKey: '',
      openaiModel: 'gpt-4o-mini',
      sendTextEnabled: false
    });
    setInstanceStatus({});
  };





  return (
    <div className="container max-w-6xl mx-auto p-4">
      <div className="grid md:grid-cols-2 gap-6">
        {/* WhatsApp Connection Settings */}
        <Card className="p-8 glass-card shadow-2xl rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl glass-surface">
              <Globe className="w-5 h-5" style={{color: 'var(--color-primary)'}} />
            </div>
            <h2 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
              Conexão WhatsApp
            </h2>
          </div>

          <div className="space-y-6">
            <div className="pt-6 border-t border-white/10">
              <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
                Instâncias Criadas
              </h3>
              <div className="space-y-2">
                {config.instancia ? (
                  <div className="p-4 glass-surface rounded-lg border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium" style={{color: 'var(--text-primary)'}}>
                          {config.instancia}
                        </p>
                        <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                          {loadingStatus ? 'Verificando...' : 
                           instanceStatus[config.instancia] === 'open' ? 'Conectada' :
                           instanceStatus[config.instancia] === 'close' ? 'Desconectada' :
                           'Status desconhecido'}
                        </p>
                        {config.evolutionUrl && (
                          <p className="text-xs mt-1" style={{color: 'var(--text-secondary)'}}>
                            Servidor: {new URL(config.evolutionUrl).hostname}
                          </p>
                        )}
                        {config.chave && (
                          <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                            API Key: {config.chave.substring(0, 8)}...
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <DeleteInstanceModal
                          instanceName={config.instancia}
                          onConfirm={deleteCurrentInstance}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <div className={`w-3 h-3 rounded-full ${
                          loadingStatus ? 'bg-yellow-500' :
                          instanceStatus[config.instancia] === 'open' ? 'bg-green-500' :
                          instanceStatus[config.instancia] === 'close' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-4" style={{color: 'var(--text-secondary)'}}>
                    Nenhuma instância configurada
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* OpenAI Settings */}
        <Card className="p-8 glass-card shadow-2xl rounded-2xl">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-3" style={{color: 'var(--text-primary)'}}>
            <div className="p-2 rounded-xl glass-surface">
              <Sparkles className="w-5 h-5" style={{color: 'var(--color-primary)'}} />
            </div>
            OpenAI Integration
          </h2>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                Chave API
              </label>
              <Input
                type="password"
                value={config.openaiKey}
                onChange={e => onFieldChange('openaiKey', e.target.value)}
                className="glass-input rounded-xl h-12 transition-all"
                style={{color: 'var(--text-primary)'}}
                placeholder="sk-..."
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                Modelo
              </label>
              <Select
                value={config.openaiModel}
                onValueChange={(value) => onFieldChange('openaiModel', value)}
              >
                <SelectTrigger className="w-full h-12 glass-input rounded-xl transition-all" style={{color: 'var(--text-primary)'}}>
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent className="glass-card border rounded-xl">
                  <SelectItem value="gpt-4o" className="hover:glass-surface focus:glass-surface" style={{color: 'var(--text-primary)'}}>GPT-4o (Alta inteligência)</SelectItem>
                  <SelectItem value="gpt-4o-mini" className="hover:glass-surface focus:glass-surface" style={{color: 'var(--text-primary)'}}>GPT-4o Mini (Rápido e econômico)</SelectItem>
                  <SelectItem value="o1" className="hover:glass-surface focus:glass-surface" style={{color: 'var(--text-primary)'}}>O1 (Raciocínio complexo)</SelectItem>
                  <SelectItem value="o1-mini" className="hover:glass-surface focus:glass-surface" style={{color: 'var(--text-primary)'}}>O1 Mini (Raciocínio básico)</SelectItem>
                  <SelectItem value="gpt-4o-realtime" className="hover:glass-surface focus:glass-surface" style={{color: 'var(--text-primary)'}}>GPT-4o Tempo Real</SelectItem>
                  <SelectItem value="gpt-4o-audio" className="hover:glass-surface focus:glass-surface" style={{color: 'var(--text-primary)'}}>GPT-4o Audio (Áudio)</SelectItem>
                  <SelectItem value="gpt-4" className="hover:glass-surface focus:glass-surface" style={{color: 'var(--text-primary)'}}>GPT-4 (Legado)</SelectItem>
                  <SelectItem value="gpt-3.5-turbo" className="hover:glass-surface focus:glass-surface" style={{color: 'var(--text-primary)'}}>GPT-3.5 Turbo (Legado)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>



      <div className="mt-8 flex justify-end">
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            className="glass-card px-8 rounded-xl h-12 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 flex-1"
            style={{color: 'var(--text-primary)'}}
          >
            <Save className="w-5 h-5 mr-3" style={{color: 'var(--color-primary)'}} />
            Salvar Configurações
          </Button>
          

          
          <Button 
            onClick={async () => {
              await clearAllData();
              toast.success('Dados limpos com sucesso');
              window.location.reload();
            }}
            variant="outline"
            className="h-12 px-4 rounded-xl transition-all duration-300 hover:scale-105"
            title="Limpar todos os dados salvos"
          >
            🗑️
          </Button>
        </div>
      </div>


    </div>
  );
}