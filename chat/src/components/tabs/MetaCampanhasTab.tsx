import { useState, useEffect } from 'react';
import { useMetaWhatsAppApi } from '../../services/metaWhatsAppApi';
import MetaWhatsAppConfig from '../MetaWhatsAppConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FaRocket, FaUsers, FaCog, FaEdit, FaTrash, FaUpload, FaDownload, FaPlus, FaPlay, FaRedo, FaList } from 'react-icons/fa';

interface Contact {
  id: string;
  name: string;
  phone: string;
  selected: boolean;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  recipients: number;
  delivered: number;
  read: number;
  failed: number;
}

interface MetaCampanhasTabProps {
  instanceId?: string;
}

export default function MetaCampanhasTab({ instanceId: _instanceId }: MetaCampanhasTabProps) {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'contacts' | 'config'>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    message: '',
    scheduledAt: ''
  });
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  const [sendResults, setSendResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  }>({ success: 0, failed: 0, errors: [] });
  const [showResults, setShowResults] = useState(false);
  const [metaConfig, setMetaConfig] = useState({
    accessToken: '',
    phoneNumberId: '',
    apiVersion: 'v18.0',
    baseUrl: 'https://graph.facebook.com'
  });
  
  const { sendTextMessage, isLoading: apiLoading } = useMetaWhatsAppApi();

  // Carregar configurações do localStorage ao inicializar
  useEffect(() => {
    const savedCampaigns = localStorage.getItem('metaCampaigns');
    if (savedCampaigns) {
      setCampaigns(JSON.parse(savedCampaigns));
    }

    const savedContacts = localStorage.getItem('metaContacts');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }

    const savedConfig = localStorage.getItem('metaWhatsAppConfig');
    if (savedConfig) {
      setMetaConfig(JSON.parse(savedConfig));
    }
  }, []);

  // Salvar campanhas no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('metaCampaigns', JSON.stringify(campaigns));
  }, [campaigns]);

  // Salvar contatos no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('metaContacts', JSON.stringify(contacts));
  }, [contacts]);

  // Salvar configurações no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('metaWhatsAppConfig', JSON.stringify(metaConfig));
  }, [metaConfig]);

  // Função para salvar configurações da Meta API
  const handleSaveMetaConfig = (config: any) => {
    setMetaConfig(config);
    alert('Configurações salvas com sucesso!');
  };

  const handleCreateCampaign = () => {
    if (!newCampaign.name.trim() || !newCampaign.message.trim()) {
      alert('Nome e mensagem são obrigatórios');
      return;
    }

    const campaign: Campaign = {
      id: Date.now().toString(),
      name: newCampaign.name,
      message: newCampaign.message,
      status: 'draft',
      createdAt: new Date().toISOString(),
      recipients: 0,
      delivered: 0,
      read: 0,
      failed: 0
    };

    if (newCampaign.scheduledAt) {
      campaign.status = 'scheduled';
      campaign.scheduledAt = newCampaign.scheduledAt;
    }

    setCampaigns([campaign, ...campaigns]);
    setNewCampaign({ name: '', message: '', scheduledAt: '' });
    setSelectedCampaign(campaign);
  };

  const handleDeleteCampaign = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta campanha?')) {
      setCampaigns(campaigns.filter(c => c.id !== id));
      if (selectedCampaign?.id === id) {
        setSelectedCampaign(null);
      }
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedCampaign) {
      alert('Selecione uma campanha para enviar');
      return;
    }

    const selectedContacts = contacts.filter(c => c.selected);
    if (selectedContacts.length === 0) {
      alert('Selecione pelo menos um contato para enviar');
      return;
    }

    setIsSending(true);
    setSendProgress({ current: 0, total: selectedContacts.length });
    setSendResults({ success: 0, failed: 0, errors: [] });
    setShowResults(false);

    // Atualizar status da campanha
    setCampaigns(campaigns.map(c => 
      c.id === selectedCampaign.id 
        ? { ...c, status: 'sent', sentAt: new Date().toISOString(), recipients: selectedContacts.length }
        : c
    ));

    // Enviar mensagens
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < selectedContacts.length; i++) {
      const contact = selectedContacts[i];
      try {
        await sendTextMessage(contact.phone, selectedCampaign.message, false, metaConfig);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Falha ao enviar para ${contact.name} (${contact.phone}): ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
      
      setSendProgress({ current: i + 1, total: selectedContacts.length });
    }

    // Atualizar resultados
    setSendResults(results);
    setShowResults(true);
    setIsSending(false);

    // Atualizar estatísticas da campanha
    setCampaigns(campaigns.map(c => 
      c.id === selectedCampaign.id 
        ? { ...c, delivered: results.success, failed: results.failed }
        : c
    ));
  };

  const handleContactSelection = (id: string, selected: boolean) => {
    setContacts(contacts.map(c => 
      c.id === id ? { ...c, selected } : c
    ));
  };

  const handleSelectAllContacts = (selected: boolean) => {
    setContacts(contacts.map(c => ({ ...c, selected })));
  };

  const handleAddContact = () => {
    const name = prompt('Nome do contato:');
    if (!name) return;

    const phone = prompt('Telefone do contato (com código do país e DDD, ex: 5511999998888):');
    if (!phone) return;

    const newContact: Contact = {
      id: Date.now().toString(),
      name,
      phone,
      selected: false
    };

    setContacts([...contacts, newContact]);
  };

  const handleDeleteContact = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este contato?')) {
      setContacts(contacts.filter(c => c.id !== id));
    }
  };

  const handleImportContacts = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          
          if (file.name.endsWith('.json')) {
            const importedContacts = JSON.parse(content);
            if (Array.isArray(importedContacts)) {
              const newContacts = importedContacts.map((c, index) => ({
                id: Date.now().toString() + index,
                name: c.name || `Contato ${index + 1}`,
                phone: c.phone || '',
                selected: false
              }));
              setContacts([...contacts, ...newContacts]);
              alert(`${newContacts.length} contatos importados com sucesso!`);
            }
          } else if (file.name.endsWith('.csv')) {
            // Lógica simples para importar CSV (esperando formato: nome,telefone)
            const lines = content.split('\n');
            const newContacts: Contact[] = [];
            
            for (let i = 1; i < lines.length; i++) { // Pular cabeçalho
              const [name, phone] = lines[i].split(',');
              if (name && phone) {
                newContacts.push({
                  id: Date.now().toString() + i,
                  name: name.trim(),
                  phone: phone.trim(),
                  selected: false
                });
              }
            }
            
            if (newContacts.length > 0) {
              setContacts([...contacts, ...newContacts]);
              alert(`${newContacts.length} contatos importados com sucesso!`);
            } else {
              alert('Nenhum contato válido encontrado no arquivo CSV.');
            }
          }
        } catch (error) {
          alert('Erro ao importar contatos: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  const handleExportContacts = () => {
    const dataStr = JSON.stringify(contacts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'contatos.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <FaRocket className="h-5 w-5 text-blue-400" />
          Campanhas - Meta API
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <FaRocket className="w-4 h-4" />
              <span className="hidden sm:inline">Campanhas</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <FaUsers className="w-4 h-4" />
              <span className="hidden sm:inline">Contatos</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <FaCog className="w-4 h-4" />
              <span className="hidden sm:inline">Configuração</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-6 pr-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="glass-card border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-green-400">
                        <FaEdit className="h-4 w-4" />
                        Nova Campanha
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Nome da Campanha
                        </label>
                        <Input
                          value={newCampaign.name}
                          onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                          placeholder="Nome da campanha"
                          className="bg-gray-800/50 border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Mensagem
                        </label>
                        <Textarea
                          value={newCampaign.message}
                          onChange={(e) => setNewCampaign({...newCampaign, message: e.target.value})}
                          rows={4}
                          placeholder="Digite sua mensagem aqui..."
                          className="bg-gray-800/50 border-gray-700 text-white resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Agendar para (opcional)
                        </label>
                        <Input
                          type="datetime-local"
                          value={newCampaign.scheduledAt}
                          onChange={(e) => setNewCampaign({...newCampaign, scheduledAt: e.target.value})}
                          className="bg-gray-800/50 border-gray-700 text-white"
                        />
                      </div>
                      <Button
                        onClick={handleCreateCampaign}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <FaPlus className="w-4 h-4 mr-2" />
                        Criar Campanha
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-purple-400">
                        <FaList className="h-4 w-4" />
                        Campanhas Existentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-80">
                        <div className="space-y-3">
                          {campaigns.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">Nenhuma campanha encontrada</p>
                          ) : (
                            campaigns.map((campaign) => (
                              <Card
                                key={campaign.id}
                                className={`glass-card border cursor-pointer transition-all ${
                                  selectedCampaign?.id === campaign.id
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : 'border-gray-700 hover:bg-gray-800/50'
                                }`}
                                onClick={() => setSelectedCampaign(campaign)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-medium text-white truncate">{campaign.name}</h3>
                                      <p className="text-sm text-gray-400 truncate mt-1">
                                        {campaign.message.substring(0, 60)}...
                                      </p>
                                      <div className="flex items-center mt-2 gap-2">
                                        <Badge variant={
                                          campaign.status === 'draft' ? 'secondary' :
                                          campaign.status === 'scheduled' ? 'default' :
                                          campaign.status === 'sent' ? 'default' : 'destructive'
                                        } className={
                                          campaign.status === 'draft' ? 'bg-gray-600 text-gray-200' :
                                          campaign.status === 'scheduled' ? 'bg-yellow-600 text-yellow-100' :
                                          campaign.status === 'sent' ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                                        }>
                                          {campaign.status === 'draft' ? 'Rascunho' :
                                           campaign.status === 'scheduled' ? 'Agendada' :
                                           campaign.status === 'sent' ? 'Enviada' : 'Falha'}
                                        </Badge>
                                        {campaign.recipients > 0 && (
                                          <span className="text-xs text-gray-400">
                                            {campaign.delivered}/{campaign.recipients} entregues
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCampaign(campaign.id);
                                      }}
                                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20 ml-2"
                                    >
                                      <FaTrash className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {selectedCampaign && (
                  <Card className="glass-card border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">Detalhes da Campanha</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h3 className="font-medium text-white mb-2">{selectedCampaign.name}</h3>
                          <p className="text-gray-300 whitespace-pre-line text-sm">{selectedCampaign.message}</p>
                          <div className="mt-4 space-y-2 text-sm">
                            <div><span className="font-medium text-gray-400">Status:</span> {
                              selectedCampaign.status === 'draft' ? 'Rascunho' :
                              selectedCampaign.status === 'scheduled' ? 'Agendada' :
                              selectedCampaign.status === 'sent' ? 'Enviada' : 'Falha'
                            }</div>
                            <div><span className="font-medium text-gray-400">Criada em:</span> {new Date(selectedCampaign.createdAt).toLocaleString()}</div>
                            {selectedCampaign.scheduledAt && (
                              <div><span className="font-medium text-gray-400">Agendada para:</span> {new Date(selectedCampaign.scheduledAt).toLocaleString()}</div>
                            )}
                            {selectedCampaign.sentAt && (
                              <div><span className="font-medium text-gray-400">Enviada em:</span> {new Date(selectedCampaign.sentAt).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="mb-4">
                            <h4 className="font-medium text-white mb-3">Estatísticas</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <Card className="glass-card border-0">
                                <CardContent className="p-3 text-center">
                                  <p className="text-xs text-gray-400">Destinatários</p>
                                  <p className="text-lg font-semibold text-white">{selectedCampaign.recipients}</p>
                                </CardContent>
                              </Card>
                              <Card className="glass-card border-0">
                                <CardContent className="p-3 text-center">
                                  <p className="text-xs text-gray-400">Entregues</p>
                                  <p className="text-lg font-semibold text-green-400">{selectedCampaign.delivered}</p>
                                </CardContent>
                              </Card>
                              <Card className="glass-card border-0">
                                <CardContent className="p-3 text-center">
                                  <p className="text-xs text-gray-400">Lidos</p>
                                  <p className="text-lg font-semibold text-blue-400">{selectedCampaign.read}</p>
                                </CardContent>
                              </Card>
                              <Card className="glass-card border-0">
                                <CardContent className="p-3 text-center">
                                  <p className="text-xs text-gray-400">Falhas</p>
                                  <p className="text-lg font-semibold text-red-400">{selectedCampaign.failed}</p>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                          
                          <Button
                            onClick={handleSendCampaign}
                            disabled={isSending || apiLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            {selectedCampaign.status === 'draft' || selectedCampaign.status === 'scheduled' ? (
                              <>
                                <FaPlay className="w-4 h-4 mr-2" />
                                {isSending ? 'Enviando...' : 'Enviar Campanha'}
                              </>
                            ) : (
                              <>
                                <FaRedo className="w-4 h-4 mr-2" />
                                {isSending ? 'Reenviando...' : 'Reenviar Campanha'}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {isSending && (
                        <div className="mt-4">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-300">Progresso do envio</span>
                            <span className="text-sm font-medium text-gray-300">
                              {sendProgress.current} / {sendProgress.total}
                            </span>
                          </div>
                          <Progress value={(sendProgress.current / sendProgress.total) * 100} className="h-2" />
                        </div>
                      )}
                      
                      {showResults && (
                        <Alert className={`mt-4 ${
                          sendResults.failed === 0
                            ? 'bg-green-500/20 border-green-500/50 text-green-200'
                            : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200'
                        }`}>
                          <AlertDescription>
                            <div className="space-y-2">
                              <div>✅ Sucesso: {sendResults.success}</div>
                              <div>❌ Falhas: {sendResults.failed}</div>
                              
                              {sendResults.errors.length > 0 && (
                                <div className="mt-3">
                                  <div className="font-medium mb-1">Erros:</div>
                                  <ScrollArea className="h-20">
                                    <div className="space-y-1">
                                      {sendResults.errors.map((error, index) => (
                                        <div key={index} className="text-sm text-red-300">• {error}</div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="contacts" className="flex-1 mt-0 overflow-hidden">
            <div className="h-full flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Gerenciamento de Contatos</h2>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleAddContact}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <FaPlus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                  <Button
                    onClick={handleImportContacts}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <FaUpload className="w-4 h-4 mr-2" />
                    Importar
                  </Button>
                  <Button
                    onClick={handleExportContacts}
                    className="bg-gray-600 hover:bg-gray-700"
                  >
                    <FaDownload className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>

              <Card className="glass-card border-0 flex-1 min-h-0">
                <CardContent className="p-0 h-full">
                  <ScrollArea className="h-full">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-800/50 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              <input
                                type="checkbox"
                                onChange={(e) => handleSelectAllContacts(e.target.checked)}
                                checked={contacts.length > 0 && contacts.every(c => c.selected)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                              />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Nome
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Telefone
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {contacts.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                                Nenhum contato encontrado
                              </td>
                            </tr>
                          ) : (
                            contacts.map((contact) => (
                              <tr key={contact.id} className="hover:bg-gray-800/30">
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={contact.selected}
                                    onChange={(e) => handleContactSelection(contact.id, e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-white">{contact.name}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm text-gray-300">{contact.phone}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteContact(contact.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                  >
                                    <FaTrash className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              
              <div className="text-sm text-gray-400 px-4">
                Total de contatos: {contacts.length} |
                Selecionados: {contacts.filter(c => c.selected).length}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="config" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="pr-4">
                <MetaWhatsAppConfig 
                  onSave={handleSaveMetaConfig}
                  initialConfig={metaConfig}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}