import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  QrCode, 
  Trash2, 
  RefreshCw,
  Server,
  LogOut
} from 'lucide-react';
import { useEvolutionApi, getEvolutionConfig } from '@/services/evolutionApi';
import { useToast } from '@/hooks/use-toast';

interface Instance {
  instanceName: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  qrCode?: string;
  number?: string;
  createdAt: Date;
  lastActivity?: Date;
}

// Funções para persistência no backend
const saveInstancesToBackend = async (instances: Instance[]) => {
  try {
    const payload = {
      instances: instances.map(inst => ({
        instanceName: inst.instanceName,
        status: inst.status,
        number: inst.number || undefined,
        createdAt: inst.createdAt && !isNaN(inst.createdAt.getTime()) ? inst.createdAt.toISOString() : new Date().toISOString(),
        lastActivity: inst.lastActivity && !isNaN(inst.lastActivity.getTime()) ? inst.lastActivity.toISOString() : undefined
      })).filter(inst => inst.instanceName) // Filtrar instâncias sem nome
    };
    
    console.log('Enviando payload para backend:', JSON.stringify(payload, null, 2));
    
    const response = await fetch('/api/instances', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro do servidor:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    
    console.log('Instâncias salvas no backend com sucesso');
  } catch (error) {
    console.error('Erro ao salvar instâncias no backend:', error);
  }
};

const loadInstancesFromBackend = async (): Promise<Instance[]> => {
  try {
    console.log('Carregando instâncias do backend...');
    const response = await fetch('/api/instances');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Dados recebidos do backend:', data);
    
    if (data.instances && Array.isArray(data.instances)) {
      return data.instances.map((inst: any) => {
        // Validar e criar datas de forma segura
        const createdAt = inst.createdAt ? new Date(inst.createdAt) : new Date();
        let lastActivity = inst.lastActivity ? new Date(inst.lastActivity) : undefined;
        
        // Verificar se as datas são válidas
        if (isNaN(createdAt.getTime())) {
          console.warn(`Data de criação inválida para instância ${inst.instanceName}, usando data atual`);
          createdAt.setTime(Date.now());
        }
        
        if (lastActivity && isNaN(lastActivity.getTime())) {
          console.warn(`Data de última atividade inválida para instância ${inst.instanceName}, removendo`);
          lastActivity = undefined;
        }
        
        return {
          instanceName: inst.instanceName,
          status: inst.status,
          number: inst.number,
          qrCode: inst.qrCode,
          createdAt,
          lastActivity
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao carregar instâncias do backend:', error);
    return [];
  }
};

export function AquecimentoTab() {
  const { toast } = useToast();
  const evolutionApi = useEvolutionApi();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showQrCode, setShowQrCode] = useState<string | null>(null);

  // Form state simplificado
  const [formData, setFormData] = useState({
    instanceName: '',
    webhookUrl: '',
    groupsIgnore: true
  });

  // Carregar instâncias ao montar o componente
  useEffect(() => {
    loadInstances();
  }, []);

  // Salvar instâncias sempre que a lista mudar
  useEffect(() => {
    if (instances.length > 0) {
      saveInstancesToBackend(instances);
    }
  }, [instances]);

  // Função para verificar status de uma instância
  const checkInstanceStatus = async (instanceName: string) => {
    try {
      const response = await evolutionApi.getInstanceStatus(instanceName);
      
      if (response?.instance?.state) {
        const newStatus = response.instance.state === 'open' ? 'connected' : 
                         response.instance.state === 'close' ? 'disconnected' : 'connecting';
        
        setInstances(prev => prev.map(inst => 
          inst.instanceName === instanceName 
            ? { ...inst, status: newStatus, lastActivity: new Date() }
            : inst
        ));
      }
    } catch (error) {
      console.error(`Erro ao verificar status da instância ${instanceName}:`, error);
      
      // Para qualquer erro (incluindo 404), apenas marcar como disconnected
      // A exclusão só deve acontecer quando o usuário clicar no botão de excluir
      setInstances(prev => prev.map(inst => 
        inst.instanceName === instanceName 
          ? { ...inst, status: 'disconnected', lastActivity: new Date() }
          : inst
      ));
    }
  };

  // Verificar status das instâncias periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      instances.forEach(instance => {
        if (instance.status === 'connecting') {
          checkInstanceStatus(instance.instanceName);
        }
      });
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(interval);
  }, [instances]);

  // Monitorar status das instâncias em connecting
  useEffect(() => {
    const connectingInstances = instances.filter(inst => inst.status === 'connecting');
    
    if (connectingInstances.length > 0) {
      const interval = setInterval(async () => {
        for (const instance of connectingInstances) {
          try {
            const status = await evolutionApi.getInstanceStatus(instance.instanceName);
            if (status && status.instance && status.instance.state === 'open') {
              setInstances(prev => prev.map(inst => 
                inst.instanceName === instance.instanceName 
                  ? { ...inst, status: 'connected', qrCode: undefined, lastActivity: new Date() }
                  : inst
              ));
              setShowQrCode(null);
              toast({
                title: "Conectado!",
                description: `Instância ${instance.instanceName} conectada com sucesso`,
              });
            }
          } catch (error) {
            console.error('Erro ao verificar status:', error);
          }
        }
      }, 3000); // Verificar a cada 3 segundos

      return () => clearInterval(interval);
    }
  }, [instances, evolutionApi, toast]);

  // Esconder QR Code quando instância conectar
  useEffect(() => {
    if (showQrCode) {
      const instance = instances.find(inst => inst.instanceName === showQrCode);
      if (instance && instance.status === 'connected') {
        // Instância conectou, esconder QR Code após um breve delay
        setTimeout(() => {
          setShowQrCode(null);
          toast({
            title: "Conectado!",
            description: `Instância ${showQrCode} conectada com sucesso!`,
          });
        }, 1500);
      }
    }
  }, [instances, showQrCode, toast]);

  // Função para sincronizar instâncias locais com a API
  const syncInstancesWithAPI = async (localInstances: Instance[]) => {
    try {
      const response = await evolutionApi.listInstances();
      const apiInstances = response?.instance ? 
        (Array.isArray(response.instance) ? response.instance : [response.instance]) : [];

      // Criar mapa das instâncias da API
      const apiInstancesMap = new Map(
        apiInstances.map((inst: any) => [inst.instanceName, inst])
      );

      // Atualizar instâncias locais com dados da API
       const syncedInstances = localInstances.map(localInst => {
         const apiInst = apiInstancesMap.get(localInst.instanceName);
         if (apiInst && typeof apiInst === 'object') {
           return {
             ...localInst,
             status: (apiInst as any).state === 'open' ? 'connected' : 
                    (apiInst as any).state === 'close' ? 'disconnected' : 'connecting',
             number: (apiInst as any).number || localInst.number,
             lastActivity: new Date()
           };
         }
         return localInst;
       });

      // Adicionar novas instâncias da API que não estão localmente
      const localInstanceNames = new Set(localInstances.map(inst => inst.instanceName));
      const newApiInstances = apiInstances
        .filter((apiInst: any) => !localInstanceNames.has(apiInst.instanceName))
        .map((apiInst: any) => ({
          instanceName: apiInst.instanceName,
          status: apiInst.state === 'open' ? 'connected' : 
                 apiInst.state === 'close' ? 'disconnected' : 'connecting',
          number: apiInst.number,
          createdAt: new Date(),
          lastActivity: new Date()
        }));

      return [...syncedInstances, ...newApiInstances];
    } catch (error) {
      console.error('Erro ao sincronizar com API:', error);
      return localInstances;
    }
  };

  // Função para garantir que a instância padrão do .env esteja sempre presente
  const ensureDefaultInstance = (instances: Instance[]): Instance[] => {
    const config = getEvolutionConfig();
    const defaultInstanceName = config.instanceName;
    
    // Se não há instância padrão configurada no .env, retornar as instâncias como estão
    if (!defaultInstanceName || defaultInstanceName.trim() === '') {
      return instances;
    }
    
    // Verificar se a instância padrão já existe na lista
    const hasDefaultInstance = instances.some(inst => inst.instanceName === defaultInstanceName);
    
    // Se não existe, adicionar a instância padrão do .env
    if (!hasDefaultInstance) {
      const defaultInstance: Instance = {
        instanceName: defaultInstanceName,
        status: 'disconnected',
        createdAt: new Date(),
        lastActivity: new Date()
      };
      
      console.log(`Adicionando instância padrão do .env: ${defaultInstanceName}`);
      return [defaultInstance, ...instances];
    }
    
    return instances;
  };

  const loadInstances = async () => {
    try {
      setIsLoading(true);
      
      // Carregar instâncias do backend primeiro
      const backendInstances = await loadInstancesFromBackend();
      
      if (backendInstances.length > 0) {
        // Garantir que a instância padrão do .env esteja presente
        const instancesWithDefault = ensureDefaultInstance(backendInstances);
        setInstances(instancesWithDefault);
        
        // Sincronizar com a API em background
        const syncedInstances = await syncInstancesWithAPI(instancesWithDefault);
        const finalInstances = ensureDefaultInstance(syncedInstances);
        setInstances(finalInstances);
      } else {
        // Se não há instâncias no backend, carregar da API
        const response = await evolutionApi.listInstances();
        if (response && response.instance) {
          const instancesData = Array.isArray(response.instance) ? response.instance : [response.instance];
          const formattedInstances: Instance[] = instancesData.map((inst: any) => ({
            instanceName: inst.instanceName || 'Unknown',
            status: inst.state || 'disconnected',
            number: inst.number,
            createdAt: new Date(),
            lastActivity: new Date()
          }));
          
          // Garantir que a instância padrão do .env esteja presente
          const instancesWithDefault = ensureDefaultInstance(formattedInstances);
          setInstances(instancesWithDefault);
        } else {
          // Se não há resposta da API, pelo menos garantir a instância padrão
          const instancesWithDefault = ensureDefaultInstance([]);
          setInstances(instancesWithDefault);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
      // Em caso de erro da API, tentar usar dados do backend
      const backendInstances = await loadInstancesFromBackend();
      if (backendInstances.length > 0) {
        const instancesWithDefault = ensureDefaultInstance(backendInstances);
        setInstances(instancesWithDefault);
      } else {
        // Se não há dados do backend, pelo menos garantir a instância padrão
        const instancesWithDefault = ensureDefaultInstance([]);
        setInstances(instancesWithDefault);
      }
      
      toast({
        title: "Aviso",
        description: "Usando dados locais. Verifique a conexão com a API.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInstance = async () => {
    if (!formData.instanceName.trim()) {
      toast({
        title: "Erro",
        description: "Nome da instância é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const payload: any = {
        instanceName: formData.instanceName,
        token: '',
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        rejectCall: false,
        msgCall: '',
        groupsIgnore: formData.groupsIgnore,
        alwaysOnline: false,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false
      };
      
      // Não incluir o campo number se estiver vazio para evitar erro de validação
      // O campo number só deve ser incluído se tiver um valor válido

      const response = await evolutionApi.createInstance(undefined, undefined, payload);
      console.log('Resposta da criação:', JSON.stringify(response, null, 2));
      
      if (response && response.instance) {
        const newInstance: Instance = {
          instanceName: formData.instanceName,
          status: 'connecting',
          createdAt: new Date(),
          lastActivity: new Date()
        };
        
        setInstances(prev => [...prev, newInstance]);
        setFormData({ instanceName: '', webhookUrl: '', groupsIgnore: true });
        
        toast({
          title: "Sucesso",
          description: "Instância criada com sucesso",
        });

        // Aguardar um pouco e então buscar o QR Code
        setTimeout(() => {
          handleGetQrCode(formData.instanceName);
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      toast({
        title: "Erro",
        description: `Falha ao criar instância: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectInstance = async (instanceName: string) => {
    try {
      setIsLoading(true);
      
      // Verificar se a instância existe antes de tentar desconectar
      const exists = await evolutionApi.instanceExists(instanceName);
      if (!exists) {
        toast({
          title: "Instância não encontrada",
          description: `A instância "${instanceName}" não existe na Evolution API`,
          variant: "destructive"
        });
        // Atualizar status local para erro
        setInstances(prev => prev.map(inst => 
          inst.instanceName === instanceName 
            ? { ...inst, status: 'error', lastActivity: new Date() }
            : inst
        ));
        return;
      }
      
      await evolutionApi.disconnectInstance(undefined, undefined, instanceName);
      
      // Atualizar o status da instância para disconnected
      setInstances(prev => prev.map(inst => 
        inst.instanceName === instanceName 
          ? { ...inst, status: 'disconnected', lastActivity: new Date() }
          : inst
      ));
      
      toast({
        title: "Sucesso",
        description: "Instância desconectada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao desconectar instância:', error);
      
      // Atualizar status para erro em caso de falha
      setInstances(prev => prev.map(inst => 
        inst.instanceName === instanceName 
          ? { ...inst, status: 'error', lastActivity: new Date() }
          : inst
      ));
      
      toast({
        title: "Erro",
        description: `Falha ao desconectar instância: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInstance = async (instanceName: string) => {
    try {
      // Verificar se é a instância padrão do .env
      const config = getEvolutionConfig();
      const defaultInstanceName = config.instanceName;
      
      if (defaultInstanceName && instanceName === defaultInstanceName) {
        toast({
          title: "Ação não permitida",
          description: "Não é possível excluir a instância padrão configurada no .env",
          variant: "destructive"
        });
        return;
      }
      
      setIsLoading(true);
      
      // Verificar se a instância existe na Evolution API
      const exists = await evolutionApi.instanceExists(instanceName);
      if (!exists) {
        toast({
          title: "Instância não encontrada",
          description: `A instância "${instanceName}" não existe na Evolution API`,
          variant: "destructive"
        });
        // Remover da lista local mesmo que não exista no servidor
        setInstances(prev => prev.filter(inst => inst.instanceName !== instanceName));
        return;
      }
      
      // Verificar se a instância está conectada e desconectar primeiro
      const instance = instances.find(inst => inst.instanceName === instanceName);
      if (instance && instance.status === 'connected') {
        try {
          await evolutionApi.disconnectInstance(undefined, undefined, instanceName);
          toast({
            title: "Desconectando",
            description: "Instância desconectada antes da exclusão",
          });
        } catch (disconnectError) {
          console.warn('Erro ao desconectar antes de excluir:', disconnectError);
          // Continuar com a exclusão mesmo se a desconexão falhar
        }
      }
      
      await evolutionApi.deleteInstance(undefined, undefined, instanceName);
      setInstances(prev => prev.filter(inst => inst.instanceName !== instanceName));
      
      if (showQrCode === instanceName) {
        setShowQrCode(null);
      }
      
      toast({
        title: "Sucesso",
        description: "Instância excluída com sucesso",
      });
    } catch (error) {
      console.error('Erro ao excluir instância:', error);
      toast({
        title: "Erro",
        description: `Falha ao excluir instância: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetQrCode = async (instanceName: string) => {
    try {
      setIsLoading(true);
      
      // Verificar se a API está configurada
      const config = await getEvolutionConfig();
      if (!config || !config.url || !config.apiKey) {
        toast({
          title: "Erro de Configuração",
          description: "API Evolution não configurada. Verifique as configurações.",
          variant: "destructive"
        });
        return;
      }

      // Verificar se a instância existe antes de tentar obter QR Code
      const exists = await evolutionApi.instanceExists(instanceName);
      if (!exists) {
        toast({
          title: "Instância não encontrada",
          description: `A instância "${instanceName}" não existe na Evolution API`,
          variant: "destructive"
        });
        // Atualizar status local para erro
        setInstances(prev => prev.map(inst => 
          inst.instanceName === instanceName 
            ? { ...inst, status: 'error', lastActivity: new Date() }
            : inst
        ));
        return;
      }

      // Primeiro, tentar obter informações da instância
      try {
        const instanceInfo = await evolutionApi.getInstanceInfo(undefined, undefined, instanceName);
        console.log('Info da instância:', instanceInfo);
      } catch (infoError) {
        console.log('Erro ao obter info da instância (pode ser normal):', infoError);
      }

      // Solicitar QR Code
      const qrResponse = await evolutionApi.getQrCode(undefined, undefined, instanceName);
      console.log('Resposta do QR Code:', qrResponse);
      
      if (qrResponse) {
        let qrCodeData = null;
        
        // Verificar diferentes formatos de resposta
        if (qrResponse.base64) {
          qrCodeData = qrResponse.base64.startsWith('data:') ? qrResponse.base64 : `data:image/png;base64,${qrResponse.base64}`;
        } else if (qrResponse.qrcode) {
          if (qrResponse.qrcode.startsWith('data:')) {
            qrCodeData = qrResponse.qrcode;
          } else if (qrResponse.qrcode.startsWith('http')) {
            qrCodeData = qrResponse.qrcode;
          } else {
            qrCodeData = `data:image/png;base64,${qrResponse.qrcode}`;
          }
        } else if (qrResponse.code) {
          qrCodeData = qrResponse.code.startsWith('data:') ? qrResponse.code : `data:image/png;base64,${qrResponse.code}`;
        } else if (typeof qrResponse === 'string') {
          qrCodeData = qrResponse.startsWith('data:') ? qrResponse : `data:image/png;base64,${qrResponse}`;
        }

        if (qrCodeData) {
          setInstances(prev => prev.map(inst => 
            inst.instanceName === instanceName 
              ? { ...inst, qrCode: qrCodeData, status: 'connecting', lastActivity: new Date() }
              : inst
          ));
          setShowQrCode(instanceName);
          
          toast({
            title: "QR Code Gerado",
            description: "Escaneie o QR Code com seu WhatsApp",
          });
        } else {
          throw new Error('QR Code não encontrado na resposta');
        }
      } else {
        throw new Error('Resposta vazia da API');
      }
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      
      let errorMessage = "Falha ao obter QR Code";
      if (error instanceof Error) {
        if (error.message.includes('HTML')) {
          errorMessage = "Erro de configuração da API. Verifique a URL e chave da API.";
        } else if (error.message.includes('404')) {
          errorMessage = "Instância não encontrada. Tente criar uma nova instância.";
        } else if (error.message.includes('401')) {
          errorMessage = "Chave da API inválida. Verifique as configurações.";
        } else {
          errorMessage = `Falha ao obter QR Code: ${error.message}`;
        }
      }
      
      // Atualizar status local para erro
      setInstances(prev => prev.map(inst => 
        inst.instanceName === instanceName 
          ? { ...inst, status: 'error', lastActivity: new Date() }
          : inst
      ));
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Container único para todos os elementos */}
        <Card className="h-full flex flex-col overflow-hidden border-0">
          <CardContent className="flex-1 overflow-hidden p-6 flex flex-col gap-6">
            {/* Elemento 1 - QR Code */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-4 h-4" />
                <h3 className="font-semibold text-base">QR Code - {showQrCode || 'Novo'}</h3>
              </div>
              <div className="p-4">
                  {showQrCode ? (
                    // Exibir QR Code
                    <div className="flex flex-col">
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-full max-w-[200px] aspect-square bg-white rounded-lg p-2 flex items-center justify-center">
                          <img 
                            src={instances.find(inst => inst.instanceName === showQrCode)?.qrCode || ''} 
                            alt="QR Code" 
                            className="w-full h-full object-contain rounded"
                            onError={(e) => {
                              console.error('Erro ao carregar imagem do QR Code');
                              const target = e.target as HTMLImageElement;
                              const src = target.src;
                              
                              if (src.startsWith('data:')) {
                                console.error('Erro com data URL base64:', src.substring(0, 50) + '...');
                              } else {
                                console.error('Erro com URL externa:', src);
                              }
                              
                              // Mostrar toast de erro
                              toast({
                                title: "Erro no QR Code",
                                description: "Falha ao carregar imagem do QR Code. Tentando recarregar...",
                                variant: "destructive"
                              });
                              
                              // Tentar recarregar o QR Code em caso de erro
                              setTimeout(() => {
                                console.log('🔄 Tentando recarregar QR Code após erro de imagem...');
                                if (showQrCode) {
                                  handleGetQrCode(showQrCode);
                                }
                              }, 2000);
                            }}
                          />
                        </div>
                      </div>
                        
                      {/* Status de conexão abaixo do QR Code */}
                      {instances.find(inst => inst.instanceName === showQrCode)?.status === 'connecting' && (
                        <div className="flex items-center justify-center mb-4">
                          <div className="text-center">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                            <p className="text-xs text-muted-foreground">Aguardando conexão...</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Botões compactos na parte inferior */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGetQrCode(showQrCode)}
                          className="flex-1 h-8 text-xs"
                          disabled={isLoading}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Atualizar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowQrCode(null)}
                          className="flex-1 h-8 text-xs"
                        >
                          Voltar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Exibir formulário de cadastro
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div>
                          <Input
                            id="instanceName"
                            value={formData.instanceName}
                            onChange={(e) => setFormData(prev => ({ ...prev, instanceName: e.target.value }))}
                            placeholder="Nome da instância"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      <Separator className="my-2" />

                      <Button 
                        onClick={handleCreateInstance} 
                        disabled={isLoading || !formData.instanceName.trim()}
                        className="w-full h-8 text-sm"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                            Conectando...
                          </>
                        ) : (
                          <>
                            <QrCode className="w-3 h-3 mr-2" />
                            Conectar
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

            {/* Elemento 2 - Instâncias */}
            <div className="flex-1 min-h-0">
              <div className="flex items-center gap-2 mb-4">
                <Server className="w-4 h-4" />
                <h3 className="font-semibold text-base">Instâncias</h3>
                <Badge variant="outline" className="text-xs">{(() => {
                  const config = getEvolutionConfig();
                  const visibleInstances = instances.filter(instance => instance.instanceName !== config.instanceName);
                  return visibleInstances.length;
                })()}</Badge>
              </div>
              <div className="h-full overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {(() => {
                      const config = getEvolutionConfig();
                      const visibleInstances = instances.filter(instance => instance.instanceName !== config.instanceName);
                      
                      return visibleInstances.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
                          <Server className="w-6 h-6 mb-1" />
                          <p className="text-xs">Nenhuma instância</p>
                        </div>
                      ) : (
                        visibleInstances.map((instance) => (
                        <Card key={instance.instanceName} className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                instance.status === 'connected' ? 'bg-green-500' : 
                                instance.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm truncate">{instance.instanceName}</h4>
                                  {(() => {
                                    const config = getEvolutionConfig();
                                    return config.instanceName === instance.instanceName && (
                                      <Badge variant="secondary" className="text-xs">
                                        .env
                                      </Badge>
                                    );
                                  })()}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {instance.status === 'connected' ? 'Conectado' : 
                                   instance.status === 'connecting' ? 'Conectando...' : 'Desconectado'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {instance.status === 'disconnected' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleGetQrCode(instance.instanceName)}
                                      className="h-8 w-8 p-0 flex-shrink-0"
                                    >
                                      <QrCode className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Conectar via QR Code</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {instance.status === 'connected' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDisconnectInstance(instance.instanceName)}
                                      disabled={isLoading}
                                      className="h-8 w-8 p-0 flex-shrink-0"
                                    >
                                      <LogOut className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Desconectar instância</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteInstance(instance.instanceName)}
                                    disabled={(() => {
                                      const config = getEvolutionConfig();
                                      return config.instanceName === instance.instanceName || isLoading;
                                    })()}
                                    className="h-8 w-8 p-0 flex-shrink-0"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{(() => {
                                    const config = getEvolutionConfig();
                                    return config.instanceName === instance.instanceName 
                                      ? "Instância padrão do .env (não pode ser excluída)"
                                      : instance.status === 'connected' 
                                        ? "Excluir instância (será desconectada automaticamente)"
                                        : "Excluir instância";
                                  })()}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </Card>
                        ))
                      );
                    })()}
                  </div>
                </ScrollArea>
              </div>
            </div>


          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};