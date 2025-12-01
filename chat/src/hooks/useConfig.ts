import { useState, useEffect } from 'react';

// Interface para configuração
export interface ConfigData {
  instancia: string;
  chave: string;
  evolutionUrl: string;
  telefones: string;
  mensagem: string;
  openaiKey: string;
  openaiModel: string;
  sendTextEnabled: boolean;
}

// Hook para acessar e gerenciar configurações
export function useConfig() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const savedConfig = localStorage.getItem('tupperware-config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
      } else {
        // Configuração padrão
        const defaultConfig: ConfigData = {
          instancia: '',
          chave: '',
          evolutionUrl: '',
          telefones: '',
          mensagem: '',
          openaiKey: '',
          openaiModel: 'gpt-4o-mini',
          sendTextEnabled: false
        };
        setConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      setConfig(null);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (newConfig: ConfigData) => {
    try {
      localStorage.setItem('tupperware-config', JSON.stringify(newConfig));
      setConfig(newConfig);
      
      // Disparar evento para notificar outros componentes
      window.dispatchEvent(new CustomEvent('configUpdated', { detail: newConfig }));
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      throw error;
    }
  };

  const updateConfig = (updates: Partial<ConfigData>) => {
    if (config) {
      const newConfig = { ...config, ...updates };
      saveConfig(newConfig);
    }
  };

  // Carregar configuração ao inicializar
  useEffect(() => {
    loadConfig();

    // Escutar mudanças de configuração
    const handleConfigUpdate = (event: CustomEvent) => {
      setConfig(event.detail);
    };

    window.addEventListener('configUpdated', handleConfigUpdate as EventListener);

    return () => {
      window.removeEventListener('configUpdated', handleConfigUpdate as EventListener);
    };
  }, []);

  return {
    config,
    isLoading,
    loadConfig,
    saveConfig,
    updateConfig,
    isSendTextEnabled: config?.sendTextEnabled || false
  };
}