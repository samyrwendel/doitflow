import { useState, useCallback } from 'react';
import { FaUsers } from 'react-icons/fa';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Download,
  Copy,
  Phone,
  X,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { EvolutionApiService, getEvolutionConfig } from '@/services/evolutionApi';

interface Contact {
  id: string;
  phone: string;
  name?: string;
  isValid: boolean;
  hasWhatsApp?: boolean;
  isCheckingWhatsApp?: boolean;
}

interface ContactListProps {
  onContactsChange?: (contacts: Contact[]) => void;
}

export function ContactList({ onContactsChange }: ContactListProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [phoneInput, setPhoneInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Função para validar número de telefone brasileiro (padrão Evolution API)
  const validatePhoneNumber = (phone: string): boolean => {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Verifica se tem entre 10 e 13 dígitos
    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      return false;
    }
    
    // Se tem 13 dígitos, deve começar com 55 (código do Brasil)
    if (cleanPhone.length === 13) {
      if (!cleanPhone.startsWith('55')) return false;
      const localNumber = cleanPhone.substring(2); // Remove o 55
      return validateLocalNumber(localNumber);
    }
    
    // Se tem 12 dígitos, deve começar com 55 (código do Brasil)
    if (cleanPhone.length === 12) {
      if (!cleanPhone.startsWith('55')) return false;
      const localNumber = cleanPhone.substring(2); // Remove o 55
      return validateLocalNumber(localNumber);
    }
    
    // Se tem 10 ou 11 dígitos, valida como número local
    return validateLocalNumber(cleanPhone);
  };

  // Função para validar número local brasileiro (DDD + número)
  const validateLocalNumber = (localNumber: string): boolean => {
    // Deve ter 10 ou 11 dígitos (DDD + número)
    if (localNumber.length !== 10 && localNumber.length !== 11) {
      return false;
    }
    
    // Verifica se o DDD é válido (11-99)
    const ddd = parseInt(localNumber.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
      return false;
    }
    
    // Se tem 11 dígitos (celular), o terceiro dígito deve ser 9
    if (localNumber.length === 11 && localNumber[2] !== '9') {
      return false;
    }
    
    // Se tem 10 dígitos (fixo), o terceiro dígito não pode ser 9
    if (localNumber.length === 10 && localNumber[2] === '9') {
      return false;
    }
    
    return true;
  };

  // Função para formatar número de telefone (padrão Evolution API: 55DDNNNNNNNNN)
  const formatPhoneNumber = (phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Se já tem 13 dígitos e começa com 55, retorna como está
    if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
      return cleanPhone;
    }
    
    // Se tem 12 dígitos e começa com 55, retorna como está
    if (cleanPhone.length === 12 && cleanPhone.startsWith('55')) {
      return cleanPhone;
    }
    
    // Se tem 10 ou 11 dígitos, adiciona o código do país (55)
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      return `55${cleanPhone}`;
    }
    
    // Para outros casos, retorna o número limpo
    return cleanPhone;
  };

  // Função para processar lista de telefones colados
  const processPhoneList = useCallback((text: string) => {
    setIsProcessing(true);
    
    try {
      // Divide o texto por quebras de linha e remove espaços
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      const newContacts: Contact[] = [];
      let validCount = 0;
      let invalidCount = 0;
      
      lines.forEach((line, index) => {
        // Extrai apenas números da linha
        const phoneMatch = line.match(/[\d\s\-\(\)\+]+/);
        if (phoneMatch) {
          const phone = phoneMatch[0];
          const isValid = validatePhoneNumber(phone);
          const formattedPhone = isValid ? formatPhoneNumber(phone) : phone;
          
          // Verifica se o número já existe
          const exists = contacts.some(contact => contact.phone === formattedPhone) ||
                        newContacts.some(contact => contact.phone === formattedPhone);
          
          if (!exists) {
            newContacts.push({
              id: `contact-${Date.now()}-${index}`,
              phone: formattedPhone,
              name: line.replace(phoneMatch[0], '').trim() || undefined,
              isValid
            });
            
            if (isValid) validCount++;
            else invalidCount++;
          }
        }
      });
      
      if (newContacts.length > 0) {
        const updatedContacts = [...contacts, ...newContacts];
        setContacts(updatedContacts);
        onContactsChange?.(updatedContacts);
        
        toast.success(
          `${newContacts.length} contatos adicionados (${validCount} válidos, ${invalidCount} inválidos)`
        );

        // Verificar WhatsApp automaticamente para números válidos
        checkWhatsAppForContacts(newContacts.filter(contact => contact.isValid));
      } else {
        toast.warning('Nenhum número de telefone válido encontrado');
      }
      
      setPhoneInput('');
    } catch (error) {
      toast.error('Erro ao processar lista de telefones');
    } finally {
      setIsProcessing(false);
    }
  }, [contacts, onContactsChange]);

  // Função para verificar WhatsApp dos contatos
  const checkWhatsAppForContacts = useCallback(async (contactsToCheck: Contact[]) => {
    if (contactsToCheck.length === 0) return;

    try {
      // Marcar contatos como "verificando"
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contactsToCheck.some(c => c.id === contact.id) 
            ? { ...contact, isCheckingWhatsApp: true }
            : contact
        )
      );

      // Obter configuração da Evolution API
      const config = getEvolutionConfig();
      const evolutionService = new EvolutionApiService(config.url, config.apiKey);
      
      // Usar o nome da instância da configuração ou um padrão
      const instanceName = config.instanceName || 'default';
      
      if (!config.url || !config.apiKey) {
        throw new Error('Configuração da Evolution API não encontrada');
      }
      
      const numbersToCheck = contactsToCheck.map(contact => contact.phone);
      const whatsappResults = await evolutionService.checkWhatsApp(instanceName, numbersToCheck);
      
      // Atualizar contatos com resultado da verificação
      setContacts(prevContacts => 
        prevContacts.map(contact => {
          const result = whatsappResults.find(r => r.number === contact.phone);
          if (result) {
            return {
              ...contact,
              hasWhatsApp: result.exists,
              isCheckingWhatsApp: false
            };
          }
          return contact.isCheckingWhatsApp ? { ...contact, isCheckingWhatsApp: false } : contact;
        })
      );

      const whatsappCount = whatsappResults.filter(r => r.exists).length;
      const noWhatsappCount = whatsappResults.length - whatsappCount;
      
      toast.success(
        `Verificação concluída: ${whatsappCount} com WhatsApp, ${noWhatsappCount} sem WhatsApp`
      );
      
    } catch (error) {
      console.error('Erro ao verificar WhatsApp:', error);
      
      // Remover estado de "verificando" em caso de erro
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contactsToCheck.some(c => c.id === contact.id) 
            ? { ...contact, isCheckingWhatsApp: false }
            : contact
        )
      );
      
      toast.error('Erro ao verificar WhatsApp. Verifique a configuração da Evolution API.');
    }
  }, []);

  // Função para remover contato
  const removeContact = (id: string) => {
    const updatedContacts = contacts.filter(contact => contact.id !== id);
    setContacts(updatedContacts);
    onContactsChange?.(updatedContacts);
    toast.success('Contato removido');
  };

  // Função para limpar todos os contatos
  const clearAllContacts = () => {
    setContacts([]);
    onContactsChange?.([]);
    toast.success('Lista de contatos limpa');
  };

  // Função para copiar números válidos
  const copyValidNumbers = () => {
    const validNumbers = contacts
      .filter(contact => contact.isValid)
      .map(contact => contact.phone)
      .join('\n');
    
    if (validNumbers) {
      navigator.clipboard.writeText(validNumbers);
      toast.success('Números válidos copiados para a área de transferência');
    } else {
      toast.warning('Nenhum número válido para copiar');
    }
  };

  // Função para exportar contatos
  const exportContacts = () => {
    const validContacts = contacts.filter(contact => contact.isValid);
    if (validContacts.length === 0) {
      toast.warning('Nenhum contato válido para exportar');
      return;
    }

    const csvContent = validContacts
      .map(contact => `${contact.phone},${contact.name || ''}`)
      .join('\n');
    
    const blob = new Blob([`Telefone,Nome\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contatos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Lista de contatos exportada');
  };

  const validContacts = contacts.filter(contact => contact.isValid);
  const invalidContacts = contacts.filter(contact => !contact.isValid);
  const whatsappContacts = contacts.filter(contact => contact.hasWhatsApp === true);
  const noWhatsappContacts = contacts.filter(contact => contact.hasWhatsApp === false);
  const checkingContacts = contacts.filter(contact => contact.isCheckingWhatsApp);

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* Header com título e estatísticas */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FaUsers className="h-4 w-4 text-blue-500" />
          Contatos
        </h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-normal text-muted-foreground">{validContacts.length} válidos</span>

          {invalidContacts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {invalidContacts.length} inválidos
            </Badge>
          )}
          {whatsappContacts.length > 0 && (
            <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-200">
              {whatsappContacts.length} WhatsApp
            </Badge>
          )}
          {noWhatsappContacts.length > 0 && (
            <Badge className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200">
              {noWhatsappContacts.length} sem WhatsApp
            </Badge>
          )}
          {checkingContacts.length > 0 && (
            <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200">
              {checkingContacts.length} verificando...
            </Badge>
          )}
        </div>
      </div>

      {/* Área de input para colar números */}
      <Card className="shadow-none">
        <CardContent className="p-3 bg-gray-25">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>Cole os números de telefone (um por linha)</span>
            </div>
            <Textarea
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Digite ou cole os números aqui..."
              className="min-h-[60px] text-xs font-mono"
              disabled={isProcessing}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => processPhoneList(phoneInput)}
                disabled={!phoneInput.trim() || isProcessing}
                size="sm"
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </>
                )}
              </Button>
              <Button
                onClick={() => setPhoneInput('')}
                variant="outline"
                size="sm"
                disabled={!phoneInput.trim()}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações rápidas */}
      {contacts.length > 0 && (
        <div className="flex gap-2">
          <Button
            onClick={copyValidNumbers}
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={validContacts.length === 0}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copiar Válidos
          </Button>
          <Button
            onClick={exportContacts}
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={validContacts.length === 0}
          >
            <Download className="h-3 w-3 mr-1" />
            Exportar
          </Button>
          <Button
            onClick={clearAllContacts}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Lista de contatos */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-1.5">
            {contacts.map((contact) => {
                // Determinar cor e ícone baseado no status
                let borderColor = 'border-gray-200';
                let bgColor = 'bg-gray-25';
                let textColor = 'text-gray-600';
                let statusIcon = <Phone className="h-3 w-3" />;

                if (!contact.isValid) {
                  borderColor = 'border-red-200';
                  bgColor = 'bg-red-50';
                  textColor = 'text-red-600';
                  statusIcon = <AlertCircle className="h-3 w-3 text-red-600" />;
                } else if (contact.isCheckingWhatsApp) {
                  borderColor = 'border-blue-200';
                  bgColor = 'bg-blue-50';
                  textColor = 'text-blue-600';
                  statusIcon = <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />;
                } else if (contact.hasWhatsApp === true) {
                  borderColor = 'border-green-200';
                  bgColor = 'bg-green-50';
                  textColor = 'text-green-600';
                  statusIcon = <CheckCircle className="h-3 w-3 text-green-600" />;
                } else if (contact.hasWhatsApp === false) {
                  borderColor = 'border-orange-200';
                  bgColor = 'bg-orange-50';
                  textColor = 'text-orange-600';
                  statusIcon = <AlertCircle className="h-3 w-3 text-orange-600" />;
                } else if (contact.isValid) {
                  // Número válido mas ainda não verificado
                  borderColor = 'border-gray-200';
                  bgColor = 'bg-gray-25';
                  textColor = 'text-gray-600';
                  statusIcon = <Phone className="h-3 w-3 text-gray-600" />;
                }

                return (
                  <div
                    key={contact.id}
                    className={`flex items-center justify-between p-2 rounded-md border ${borderColor} ${bgColor}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {statusIcon}
                        <span className={`text-sm font-mono truncate ${textColor}`}>
                          {contact.phone}
                        </span>
                        {contact.isCheckingWhatsApp && (
                          <span className="text-xs text-blue-500">Verificando...</span>
                        )}
                        {contact.hasWhatsApp === true && (
                          <span className="text-xs text-green-600 font-medium">WhatsApp</span>
                        )}
                        {contact.hasWhatsApp === false && (
                          <span className="text-xs text-orange-600 font-medium">Sem WhatsApp</span>
                        )}
                      </div>
                      {contact.name && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {contact.name}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => removeContact(contact.id)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 ml-1.5 shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
        </ScrollArea>
      </div>
    </div>
  );
}