import React, { useState, useEffect } from 'react';
import { validateMetaWhatsAppConfig, getMetaWhatsAppConfig } from '../services/metaWhatsAppApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FaCog, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

interface MetaWhatsAppConfigForm {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  baseUrl: string;
}

interface MetaWhatsAppConfigProps {
  onSave?: (config: MetaWhatsAppConfigForm) => void;
  initialConfig?: Partial<MetaWhatsAppConfigForm>;
}

export default function MetaWhatsAppConfig({ onSave, initialConfig }: MetaWhatsAppConfigProps) {
  const [config, setConfig] = useState<MetaWhatsAppConfigForm>({
    accessToken: '',
    phoneNumberId: '',
    apiVersion: 'v18.0',
    baseUrl: 'https://graph.facebook.com',
    ...initialConfig
  });

  const [validation, setValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Carregar configurações do ambiente ao inicializar
    const envConfig = getMetaWhatsAppConfig();
    setConfig(prev => ({
      ...prev,
      accessToken: envConfig.accessToken || '',
      phoneNumberId: envConfig.phoneNumberId || '',
      apiVersion: envConfig.apiVersion || 'v18.0',
      baseUrl: envConfig.baseUrl || 'https://graph.facebook.com'
    }));
  }, []);

  useEffect(() => {
    // Validar configuração quando ela mudar
    const result = validateMetaWhatsAppConfig(config);
    setValidation(result);
  }, [config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validation.isValid && onSave) {
      onSave(config);
    }
  };

  const testConnection = async () => {
    if (!validation.isValid) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Testar a conexão com a API do WhatsApp Business
      const response = await fetch(`${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setTestResult({ success: true, message: 'Conexão com a Meta API estabelecida com sucesso!' });
      } else {
        const errorData = await response.json();
        setTestResult({ 
          success: false, 
          message: `Erro na conexão: ${errorData.error?.message || response.statusText}` 
        });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: `Erro na conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <FaCog className="h-5 w-5 text-blue-400" />
          Configuração da Meta API para WhatsApp Business
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="accessToken" className="block text-sm font-medium text-gray-300 mb-1">
              Access Token *
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                id="accessToken"
                name="accessToken"
                value={config.accessToken}
                onChange={handleChange}
                className={`bg-gray-800/50 border-gray-700 text-white ${
                  validation.error ? 'border-red-500' : ''
                }`}
                placeholder="EAA..."
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-300"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </Button>
            </div>
            {validation.error && (
              <p className="mt-1 text-sm text-red-400">{validation.error}</p>
            )}
          </div>

          <div>
            <label htmlFor="phoneNumberId" className="block text-sm font-medium text-gray-300 mb-1">
              Phone Number ID *
            </label>
            <Input
              type="text"
              id="phoneNumberId"
              name="phoneNumberId"
              value={config.phoneNumberId}
              onChange={handleChange}
              className={`bg-gray-800/50 border-gray-700 text-white ${
                validation.error ? 'border-red-500' : ''
              }`}
              placeholder="123456789012345"
            />
          </div>

          <div>
            <label htmlFor="apiVersion" className="block text-sm font-medium text-gray-300 mb-1">
              Versão da API
            </label>
            <Input
              type="text"
              id="apiVersion"
              name="apiVersion"
              value={config.apiVersion}
              onChange={handleChange}
              className="bg-gray-800/50 border-gray-700 text-white"
              placeholder="v18.0"
            />
            <p className="mt-1 text-sm text-gray-400">
              Versão da API do Graph. A versão mais recente é recomendada.
            </p>
          </div>

          <div>
            <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-300 mb-1">
              URL Base da API
            </label>
            <Input
              type="text"
              id="baseUrl"
              name="baseUrl"
              value={config.baseUrl}
              onChange={handleChange}
              className="bg-gray-800/50 border-gray-700 text-white"
              placeholder="https://graph.facebook.com"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="button"
              onClick={testConnection}
              disabled={!validation.isValid || isTesting}
              variant="outline"
              className="bg-gray-700/50 hover:bg-gray-700 text-gray-300 border-gray-600"
            >
              {isTesting ? 'Testando...' : 'Testar Conexão'}
            </Button>
            
            <Button
              type="submit"
              disabled={!validation.isValid}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Salvar Configuração
            </Button>
          </div>

          {testResult && (
            <Alert className={
              testResult.success
                ? 'bg-green-500/20 border-green-500/50 text-green-200'
                : 'bg-red-500/20 border-red-500/50 text-red-200'
            }>
              <AlertDescription className="flex items-center gap-2">
                {testResult.success ? (
                  <FaCheck className="h-4 w-4" />
                ) : (
                  <FaExclamationTriangle className="h-4 w-4" />
                )}
                {testResult.message}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}