import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../lib/api';

interface EvolutionConfig {
  baseUrl: string;
  hasApiKey: boolean;
  apiKeyPreview?: string;
  isLocal: boolean;
  lastUpdated?: string;
  source?: string;
}

interface TestResult {
  success: boolean;
  data?: {
    version: string;
    status: number;
    message: string;
    manager: string;
    clientName: string;
    instanceCount: number;
    instances: Array<{ name: string; status: string }>;
  };
  error?: string;
  details?: string;
}

interface DetectResult {
  found: boolean;
  data?: {
    url: string;
    version: string;
    clientName: string;
    manager: string;
  };
  message?: string;
}

export const EvolutionConfigPanel: React.FC = () => {
  const { authenticatedFetch } = useAuth();
  const [config, setConfig] = useState<EvolutionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar configuração atual
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(API_ENDPOINTS.EVOLUTION_CONFIG);
      const data = await response.json();

      if (data.success) {
        setConfig(data.data);
        setBaseUrl(data.data.baseUrl || '');
      }
    } catch (error) {
      console.error('Erro ao carregar config:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar configuração' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!baseUrl) {
      setMessage({ type: 'error', text: 'URL base é obrigatória' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const response = await authenticatedFetch(API_ENDPOINTS.EVOLUTION_CONFIG, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey: apiKey || undefined })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Configuração salva com sucesso!' });
        setApiKey(''); // Limpa o campo após salvar
        loadConfig(); // Recarrega para mostrar preview
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar' });
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configuração' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setMessage(null);

      const response = await authenticatedFetch(API_ENDPOINTS.EVOLUTION_CONFIG_TEST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl || undefined,
          apiKey: apiKey || undefined
        })
      });

      const data = await response.json();
      setTestResult(data);

      if (data.success) {
        setMessage({ type: 'success', text: 'Conexão bem sucedida!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Falha na conexão' });
      }
    } catch (error) {
      console.error('Erro ao testar:', error);
      setMessage({ type: 'error', text: 'Erro ao testar conexão' });
    } finally {
      setTesting(false);
    }
  };

  const handleDetectLocal = async () => {
    try {
      setDetecting(true);
      setDetectResult(null);
      setMessage(null);

      const response = await authenticatedFetch(API_ENDPOINTS.EVOLUTION_CONFIG_DETECT);
      const data = await response.json();

      if (data.success && data.found) {
        setDetectResult(data);
        setBaseUrl(data.data.url);
        setMessage({ type: 'success', text: `Evolution API encontrada em ${data.data.url}` });
      } else {
        setMessage({ type: 'error', text: 'Nenhuma Evolution API local encontrada' });
      }
    } catch (error) {
      console.error('Erro ao detectar:', error);
      setMessage({ type: 'error', text: 'Erro ao detectar Evolution local' });
    } finally {
      setDetecting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          <span className="ml-3 text-muted-foreground">Carregando configuração...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Evolution API</h2>
            <p className="text-sm text-muted-foreground">Configure a integração com WhatsApp</p>
          </div>
        </div>

        {config?.isLocal && (
          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
            Local (Umbrel)
          </span>
        )}
      </div>

      {/* Status atual */}
      {config && (
        <div className="p-4 bg-accent/50 rounded-lg">
          <h3 className="text-sm font-medium text-card-foreground mb-3">Status Atual</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">URL:</span>
              <span className="ml-2 text-card-foreground">{config.baseUrl || 'Não configurada'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">API Key:</span>
              <span className="ml-2 text-card-foreground">
                {config.hasApiKey ? config.apiKeyPreview : 'Não configurada'}
              </span>
            </div>
            {config.lastUpdated && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Última atualização:</span>
                <span className="ml-2 text-card-foreground">
                  {new Date(config.lastUpdated).toLocaleString('pt-BR')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mensagem de feedback */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {message.text}
        </div>
      )}

      {/* Formulário */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-2">
            URL da Evolution API
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:8085"
              className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-card-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500"
            />
            <button
              onClick={handleDetectLocal}
              disabled={detecting}
              className="px-4 py-2 bg-accent hover:bg-accent/80 text-card-foreground rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {detecting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              Detectar Local
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Para Umbrel local, geralmente é http://localhost:8085
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-card-foreground mb-2">
            API Key
          </label>

          {/* Mostrar chave atual se existir e não estiver editando */}
          {config?.hasApiKey && !apiKey ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-400 text-sm font-mono">{config.apiKeyPreview}</span>
                <span className="text-green-500/70 text-xs">(configurada)</span>
              </div>
              <button
                type="button"
                onClick={() => setApiKey(' ')} // Trigger edit mode
                className="text-xs text-muted-foreground hover:text-card-foreground underline"
              >
                Alterar API Key
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey.trim()}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole a API Key aqui (do Umbrel ou Evolution)"
                className="w-full px-4 py-2 pr-20 bg-background border border-border rounded-lg text-card-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-muted-foreground hover:text-card-foreground"
              >
                {showApiKey ? 'Ocultar' : 'Mostrar'}
              </button>
              {config?.hasApiKey && (
                <button
                  type="button"
                  onClick={() => setApiKey('')}
                  className="mt-2 text-xs text-muted-foreground hover:text-card-foreground underline"
                >
                  Cancelar alteração
                </button>
              )}
            </div>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            {config?.hasApiKey
              ? 'A chave está salva de forma segura. Clique em "Alterar" para substituir.'
              : 'No Umbrel, clique no app Evolution para ver a API Key gerada'
            }
          </p>
        </div>
      </div>

      {/* Resultado do teste */}
      {testResult && testResult.success && testResult.data && (
        <div className="p-4 bg-accent/50 rounded-lg">
          <h3 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Conexão Estabelecida
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Versão:</span>
              <span className="ml-2 text-card-foreground">{testResult.data.version}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cliente:</span>
              <span className="ml-2 text-card-foreground">{testResult.data.clientName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Instâncias:</span>
              <span className="ml-2 text-card-foreground">{testResult.data.instanceCount}</span>
            </div>
            {testResult.data.instances.length > 0 && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Dispositivos:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {testResult.data.instances.map((inst, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-1 rounded text-xs ${
                        inst.status === 'open'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {inst.name} ({inst.status})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resultado da detecção */}
      {detectResult && detectResult.found && detectResult.data && (
        <div className="p-4 bg-accent/50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Evolution Local Detectada
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">URL:</span>
              <span className="ml-2 text-card-foreground">{detectResult.data.url}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Versão:</span>
              <span className="ml-2 text-card-foreground">{detectResult.data.version}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Manager:</span>
              <a
                href={detectResult.data.manager}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-400 hover:underline"
              >
                {detectResult.data.manager}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex gap-3 pt-4 border-t border-border">
        <button
          onClick={handleTest}
          disabled={testing || !baseUrl}
          className="px-4 py-2 bg-accent hover:bg-accent/80 text-card-foreground rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {testing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
          Testar Conexão
        </button>

        <button
          onClick={handleSave}
          disabled={saving || !baseUrl}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          Salvar Configuração
        </button>
      </div>

      {/* Instruções */}
      <div className="p-4 bg-accent/30 rounded-lg border border-border">
        <h3 className="text-sm font-medium text-card-foreground mb-2">Como configurar:</h3>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Clique em "Detectar Local" para encontrar a Evolution no Umbrel</li>
          <li>No Umbrel, clique no app Evolution API para ver a API Key</li>
          <li>Cole a API Key no campo acima</li>
          <li>Clique em "Testar Conexão" para verificar</li>
          <li>Se funcionar, clique em "Salvar Configuração"</li>
        </ol>
      </div>
    </div>
  );
};

export default EvolutionConfigPanel;
