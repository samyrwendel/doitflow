import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FaRocket, FaWhatsapp } from 'react-icons/fa';

interface APISelectorProps {
  selectedAPI: 'evolution' | 'meta';
  onAPIChange: (api: 'evolution' | 'meta') => void;
}

export default function APISelector({ selectedAPI, onAPIChange }: APISelectorProps) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Selecionar API</h3>
          <div className="flex space-x-2">
            <Button
              onClick={() => onAPIChange('evolution')}
              variant={selectedAPI === 'evolution' ? 'default' : 'outline'}
              className={
                selectedAPI === 'evolution'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300 border-gray-600'
              }
            >
              <FaWhatsapp className="w-4 h-4 mr-2" />
              Evolution API
            </Button>
            <Button
              onClick={() => onAPIChange('meta')}
              variant={selectedAPI === 'meta' ? 'default' : 'outline'}
              className={
                selectedAPI === 'meta'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300 border-gray-600'
              }
            >
              <FaRocket className="w-4 h-4 mr-2" />
              Meta API
            </Button>
          </div>
        </div>
        
        <Alert className={`mt-4 ${
          selectedAPI === 'evolution'
            ? 'bg-green-500/20 border-green-500/50 text-green-200'
            : 'bg-blue-500/20 border-blue-500/50 text-blue-200'
        }`}>
          <AlertDescription>
            {selectedAPI === 'evolution' 
              ? 'Usando a Evolution API para envio de mensagens via WhatsApp.'
              : 'Usando a API oficial do Meta para envio de mensagens via WhatsApp Business.'
            }
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}