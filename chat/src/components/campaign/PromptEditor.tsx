import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';


import { FileText, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AgentConfig {
  prompt: {
    system: string;
  };

  metadata: {
    version: string;
    created_at: string;
    updated_at: string;
  };
}

export function PromptEditor() {
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  // Carregar configuração do agente com retry e backoff exponencial
  const loadAgentConfig = async (retryCount = 0, maxRetries = 3, showLoading = true) => {
    const defaultConfig = {
      prompt: {
        system: 'Você é um assistente útil e prestativo.'
      },
      metadata: {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    if (showLoading) {
      setLoading(true);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(`/api/agente?t=${Date.now()}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAgentConfig(data);
      console.log('✅ Configuração do agente carregada com sucesso no PromptEditor');
      
      // Mostrar toast de sucesso apenas quando é um refresh manual (retryCount = 0 e showLoading = true)
      if (retryCount === 0 && showLoading) {
        toast.success('Configuração recarregada do servidor!');
      }
      
    } catch (error) {
      const isAbortError = error instanceof Error && error.name === 'AbortError';
      const isNetworkError = error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'));
      
      if (retryCount < maxRetries && (isAbortError || isNetworkError)) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Backoff exponencial, máximo 10s
        console.warn(`⚠️ PromptEditor - Tentativa ${retryCount + 1}/${maxRetries + 1} falhou, tentando novamente em ${delay}ms:`, error.message);
        
        setTimeout(() => {
          loadAgentConfig(retryCount + 1, maxRetries, false); // Não mostrar loading nas tentativas
        }, delay);
        
        return;
      }
      
      // Após esgotar tentativas ou erro não recuperável, usar configuração padrão
      console.error('❌ PromptEditor - Falha ao carregar configuração do agente após todas as tentativas:', error instanceof Error ? error.message : String(error));
      console.log('🔄 PromptEditor - Usando configuração padrão como fallback');
      
      if (retryCount === 0) {
        // Só mostrar toast na primeira tentativa
        toast.error('Usando configuração padrão - servidor webhook indisponível');
      }
      
      setAgentConfig(defaultConfig);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Salvar configuração do agente
  const saveAgentConfig = async () => {
    if (!agentConfig) return;

    try {
      setSaving(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout para save
      
      const response = await fetch('/api/agente', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentConfig),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Falha ao salvar configuração: HTTP ${response.status}`);
      }
      
      // Atualizar apenas o timestamp localmente, evitando requisição adicional
      const updatedConfig = {
        ...agentConfig,
        metadata: {
          ...agentConfig.metadata,
          updated_at: new Date().toISOString()
        }
      };
      setAgentConfig(updatedConfig);
      
      toast.success('Configuração salva com sucesso!');
      console.log('✅ PromptEditor - Configuração salva com sucesso');
      
      // Disparar evento para notificar SimpleChatLLM sobre a atualização
      window.dispatchEvent(new CustomEvent('agentConfigUpdated'));
      
    } catch (error) {
      const isAbortError = error instanceof Error && error.name === 'AbortError';
      
      if (isAbortError) {
        console.error('❌ PromptEditor - Timeout ao salvar configuração');
        toast.error('Timeout ao salvar - tente novamente');
      } else if (error instanceof Error) {
        console.error('❌ PromptEditor - Erro ao salvar configuração:', error.message);
        toast.error(error.message);
      } else {
        console.error('❌ PromptEditor - Erro desconhecido ao salvar configuração:', error);
        toast.error('Ocorreu um erro desconhecido ao salvar a configuração.');
      }
    } finally {
      setSaving(false);
    }
  };



  // Atualizar prompt do sistema
  const updateSystemPrompt = (value: string) => {
    if (!agentConfig) return;
    
    setAgentConfig({
      ...agentConfig,
      prompt: {
        system: value
      }
    });
  };



  useEffect(() => {
    loadAgentConfig();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Carregando configuração...</span>
        </div>
      </div>
    );
  }

  if (!agentConfig) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p>Erro ao carregar configuração do agente</p>
          <Button onClick={() => loadAgentConfig()} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Conteúdo com scroll */}
      <div className="flex-1 p-4">
        {/* Configurar campanha */}
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Configurar campanha</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('🔄 Refresh button clicked - reloading agent config from server');
                    loadAgentConfig(0, 3, true);
                    // Disparar evento para notificar SimpleChatLLM
                    window.dispatchEvent(new CustomEvent('agentConfigUpdated'));
                  }}
                  disabled={loading || saving}
                  className="p-2"
                  title="Recarregar configuração do servidor"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  size="sm"
                  onClick={saveAgentConfig}
                  disabled={saving}
                  className="p-2"
                >
                  <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <Textarea
              value={agentConfig.prompt.system}
              onChange={(e) => updateSystemPrompt(e.target.value)}
              placeholder="Defina o comportamento base do agente..."
              className="flex-1 resize-none overflow-auto"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}