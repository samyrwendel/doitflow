import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Zap, 
  Database, 
  MessageSquare, 
  Save,
  RotateCcw,
  TestTube,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ToolConfig {
  id: string;
  name: string;
  enabled: boolean;
  settings: Record<string, any>;
}

interface ToolsConfigurationProps {
  className?: string;
  onConfigChange?: (config: ToolConfig[]) => void;
}

export function ToolsConfiguration({ className = '', onConfigChange }: ToolsConfigurationProps) {
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const [activeTab, setActiveTab] = useState('messaging');
  const [isSaving, setIsSaving] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  // Configurações iniciais das ferramentas
  useEffect(() => {
    const initialTools: ToolConfig[] = [
      {
        id: 'messaging',
        name: 'Sistema de Mensagens',
        enabled: true,
        settings: {
          batchSize: 50,
          delayBetweenMessages: 2000,
          retryAttempts: 3,
          enableDeliveryTracking: true,
          maxMessageLength: 4096
        }
      },
      {
        id: 'validation',
        name: 'Validação de Números',
        enabled: true,
        settings: {
          enableWhatsAppValidation: true,
          cacheValidationResults: true,
          validationTimeout: 10000,
          skipInvalidNumbers: true
        }
      },
      {
        id: 'llm',
        name: 'Integração LLM',
        enabled: true,
        settings: {
          model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
          maxTokens: 1000,
          temperature: 0.7,
          enableContextMemory: true,
          autoSaveConversations: true
        }
      },
      {
        id: 'database',
        name: 'Banco de Dados',
        enabled: true,
        settings: {
          autoBackup: true,
          backupInterval: 24,
          enableLogging: true,
          maxLogRetention: 30
        }
      }
    ];
    
    setTools(initialTools);
  }, []);

  const updateToolSetting = (toolId: string, settingKey: string, value: any) => {
    setTools(prev => prev.map(tool => 
      tool.id === toolId 
        ? {
            ...tool,
            settings: {
              ...tool.settings,
              [settingKey]: value
            }
          }
        : tool
    ));
  };

  const toggleTool = (toolId: string) => {
    setTools(prev => prev.map(tool => 
      tool.id === toolId 
        ? { ...tool, enabled: !tool.enabled }
        : tool
    ));
  };

  const saveConfiguration = async () => {
    setIsSaving(true);
    
    try {
      // Simular salvamento (aqui seria integração com NocoDB)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onConfigChange) {
        onConfigChange(tools);
      }
      
      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    // Reset para configurações padrão
    const defaultTools = tools.map(tool => ({
      ...tool,
      enabled: true,
      settings: {
        ...tool.settings,
        // Reset valores específicos
        ...(tool.id === 'messaging' && {
          batchSize: 50,
          delayBetweenMessages: 2000,
          retryAttempts: 3
        }),
        ...(tool.id === 'llm' && {
          maxTokens: 1000,
          temperature: 0.7
        })
      }
    }));
    
    setTools(defaultTools);
    toast.success('Configurações resetadas para padrão');
  };

  const testTool = async (toolId: string) => {
    try {
      // Simular teste da ferramenta
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setTestResults(prev => ({ ...prev, [toolId]: true }));
      toast.success(`Teste da ferramenta ${tools.find(t => t.id === toolId)?.name} passou`);
      
      // Limpar resultado após 3 segundos
      setTimeout(() => {
        setTestResults(prev => ({ ...prev, [toolId]: false }));
      }, 3000);
    } catch (error) {
      setTestResults(prev => ({ ...prev, [toolId]: false }));
      toast.error(`Teste da ferramenta falhou`);
    }
  };

  const renderMessagingSettings = () => {
    const tool = tools.find(t => t.id === 'messaging');
    if (!tool) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-slate-200">Ativar Sistema de Mensagens</Label>
          <Switch 
            checked={tool.enabled} 
            onCheckedChange={() => toggleTool('messaging')}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-300">Tamanho do Lote</Label>
            <Input
              type="number"
              value={tool.settings.batchSize}
              onChange={(e) => updateToolSetting('messaging', 'batchSize', parseInt(e.target.value))}
              className="bg-slate-800/50 border-slate-600 text-slate-100"
            />
          </div>
          
          <div>
            <Label className="text-slate-300">Delay entre Mensagens (ms)</Label>
            <Input
              type="number"
              value={tool.settings.delayBetweenMessages}
              onChange={(e) => updateToolSetting('messaging', 'delayBetweenMessages', parseInt(e.target.value))}
              className="bg-slate-800/50 border-slate-600 text-slate-100"
            />
          </div>
          
          <div>
            <Label className="text-slate-300">Tentativas de Reenvio</Label>
            <Input
              type="number"
              value={tool.settings.retryAttempts}
              onChange={(e) => updateToolSetting('messaging', 'retryAttempts', parseInt(e.target.value))}
              className="bg-slate-800/50 border-slate-600 text-slate-100"
            />
          </div>
          
          <div>
            <Label className="text-slate-300">Tamanho Máximo da Mensagem</Label>
            <Input
              type="number"
              value={tool.settings.maxMessageLength}
              onChange={(e) => updateToolSetting('messaging', 'maxMessageLength', parseInt(e.target.value))}
              className="bg-slate-800/50 border-slate-600 text-slate-100"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Label className="text-slate-300">Rastreamento de Entrega</Label>
          <Switch 
            checked={tool.settings.enableDeliveryTracking} 
            onCheckedChange={(checked) => updateToolSetting('messaging', 'enableDeliveryTracking', checked)}
          />
        </div>
      </div>
    );
  };

  const renderLLMSettings = () => {
    const tool = tools.find(t => t.id === 'llm');
    if (!tool) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-slate-200">Ativar Integração LLM</Label>
          <Switch 
            checked={tool.enabled} 
            onCheckedChange={() => toggleTool('llm')}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-300">Modelo</Label>
            <Input
              value={tool.settings.model}
              onChange={(e) => updateToolSetting('llm', 'model', e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-slate-100"
            />
          </div>
          
          <div>
            <Label className="text-slate-300">Máximo de Tokens</Label>
            <Input
              type="number"
              value={tool.settings.maxTokens}
              onChange={(e) => updateToolSetting('llm', 'maxTokens', parseInt(e.target.value))}
              className="bg-slate-800/50 border-slate-600 text-slate-100"
            />
          </div>
          
          <div>
            <Label className="text-slate-300">Temperatura</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={tool.settings.temperature}
              onChange={(e) => updateToolSetting('llm', 'temperature', parseFloat(e.target.value))}
              className="bg-slate-800/50 border-slate-600 text-slate-100"
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Memória de Contexto</Label>
            <Switch 
              checked={tool.settings.enableContextMemory} 
              onCheckedChange={(checked) => updateToolSetting('llm', 'enableContextMemory', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Salvar Conversas Automaticamente</Label>
            <Switch 
              checked={tool.settings.autoSaveConversations} 
              onCheckedChange={(checked) => updateToolSetting('llm', 'autoSaveConversations', checked)}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderValidationSettings = () => {
    const tool = tools.find(t => t.id === 'validation');
    if (!tool) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-slate-200">Ativar Validação</Label>
          <Switch 
            checked={tool.enabled} 
            onCheckedChange={() => toggleTool('validation')}
          />
        </div>
        
        <div>
          <Label className="text-slate-300">Timeout de Validação (ms)</Label>
          <Input
            type="number"
            value={tool.settings.validationTimeout}
            onChange={(e) => updateToolSetting('validation', 'validationTimeout', parseInt(e.target.value))}
            className="bg-slate-800/50 border-slate-600 text-slate-100"
          />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Validação WhatsApp</Label>
            <Switch 
              checked={tool.settings.enableWhatsAppValidation} 
              onCheckedChange={(checked) => updateToolSetting('validation', 'enableWhatsAppValidation', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Cache de Resultados</Label>
            <Switch 
              checked={tool.settings.cacheValidationResults} 
              onCheckedChange={(checked) => updateToolSetting('validation', 'cacheValidationResults', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Pular Números Inválidos</Label>
            <Switch 
              checked={tool.settings.skipInvalidNumbers} 
              onCheckedChange={(checked) => updateToolSetting('validation', 'skipInvalidNumbers', checked)}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={`h-full glass-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Settings className="h-5 w-5 text-blue-400" />
          Ferramentas
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={saveConfiguration}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
            <TabsTrigger value="messaging" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <MessageSquare className="h-4 w-4 mr-1" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="llm" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Zap className="h-4 w-4 mr-1" />
              LLM
            </TabsTrigger>
            <TabsTrigger value="validation" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <TestTube className="h-4 w-4 mr-1" />
              Validação
            </TabsTrigger>
            <TabsTrigger value="database" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Database className="h-4 w-4 mr-1" />
              Banco
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-4">
            <TabsContent value="messaging" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-200">Configurações de Mensagens</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testTool('messaging')}
                  className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50"
                >
                  {testResults.messaging ? (
                    <CheckCircle className="h-4 w-4 mr-1 text-green-400" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-1" />
                  )}
                  Testar
                </Button>
              </div>
              {renderMessagingSettings()}
            </TabsContent>
            
            <TabsContent value="llm" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-200">Configurações do LLM</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testTool('llm')}
                  className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50"
                >
                  {testResults.llm ? (
                    <CheckCircle className="h-4 w-4 mr-1 text-green-400" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-1" />
                  )}
                  Testar
                </Button>
              </div>
              {renderLLMSettings()}
            </TabsContent>
            
            <TabsContent value="validation" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-200">Configurações de Validação</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testTool('validation')}
                  className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50"
                >
                  {testResults.validation ? (
                    <CheckCircle className="h-4 w-4 mr-1 text-green-400" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-1" />
                  )}
                  Testar
                </Button>
              </div>
              {renderValidationSettings()}
            </TabsContent>
            
            <TabsContent value="database" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-200">Configurações do Banco</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testTool('database')}
                  className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50"
                >
                  {testResults.database ? (
                    <CheckCircle className="h-4 w-4 mr-1 text-green-400" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-1" />
                  )}
                  Testar
                </Button>
              </div>
              <div className="text-center text-slate-400 py-8">
                <Database className="h-12 w-12 mx-auto mb-3 text-slate-500" />
                <p>Configurações de banco em desenvolvimento</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}