import { useState } from 'react';
import APISelector from '../APISelector';
import MetaCampanhasTab from './MetaCampanhasTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FaRocket, FaEdit, FaCog } from 'react-icons/fa';

// Componente para campanhas da Evolution API (placeholder)
function EvolutionCampanhasTab() {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <FaRocket className="h-5 w-5 text-blue-400" />
          Campanhas - Evolution API
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-yellow-500/20 border-yellow-500/50 text-yellow-200">
          <AlertDescription>
            O painel de campanhas para a Evolution API está em desenvolvimento.
            Enquanto isso, você pode usar a aba "Campanha" na seção "Gestão de Envio"
            para criar e gerenciar suas campanhas com a Evolution API.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-green-400">
                <FaEdit className="h-4 w-4" />
                Recursos Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Envio de mensagens em massa
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Personalização de mensagens
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Agendamento de envio
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Relatórios de entrega
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-purple-400">
                <FaCog className="h-4 w-4" />
                Próximos Recursos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                Gestão de contatos
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                Templates de mensagens
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                Segmentação de público
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                Análise de métricas
              </div>
            </CardContent>
          </Card>
        </div>

        <Alert className="bg-blue-500/20 border-blue-500/50 text-blue-200">
          <AlertDescription>
            <strong>Dica:</strong> Enquanto essa funcionalidade está em desenvolvimento,
            você pode usar a aba "Campanha" na seção "Gestão de Envio" para criar e gerenciar
            suas campanhas com a Evolution API.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

interface UnifiedCampanhasTabProps {
  instanceId?: string;
}

export default function UnifiedCampanhasTab({ instanceId }: UnifiedCampanhasTabProps) {
  const [selectedAPI, setSelectedAPI] = useState<'evolution' | 'meta'>('meta');

  return (
    <div className="h-full flex flex-col space-y-4">
      <APISelector
        selectedAPI={selectedAPI}
        onAPIChange={setSelectedAPI}
      />
      
      <div className="flex-1 min-h-0">
        {selectedAPI === 'meta' ? (
          <MetaCampanhasTab instanceId={instanceId} />
        ) : (
          <EvolutionCampanhasTab />
        )}
      </div>
    </div>
  );
}