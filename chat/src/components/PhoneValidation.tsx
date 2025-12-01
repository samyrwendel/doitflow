import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, X, CheckCircle2, Download, Upload } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { Progress } from "@/components/ui/progress";
import * as XLSX from 'xlsx';
import type { WhatsAppValidationResult, ValidationProgress } from '@/lib/whatsappService';
import { toast } from "sonner";

interface PhoneValidationProps {
  value: string;
  onChange: (value: string) => void;
  onValidate: () => Promise<void>;
  onFetchProfiles?: () => void | Promise<void>;
  validationResults: WhatsAppValidationResult[];
  validationProgress: ValidationProgress | null;
  isValidating: boolean;
  isFetchingProfiles?: boolean;
  hasBeenValidated: boolean;
}

export function PhoneValidation({ 
  value, 
  onChange, 
  onValidate,
  onFetchProfiles,
  validationResults,
  validationProgress,
  isValidating,
  isFetchingProfiles = false,
  hasBeenValidated
}: PhoneValidationProps) {
  
  // Função para gerar e baixar arquivo TXT dos números validados
  const downloadValidNumbers = () => {
    const validNumbers = validationResults
      .filter(result => result.exists)
      .map(result => result.number)
      .join('\n');
    
    const blob = new Blob([validNumbers], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'numeros_validados.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Função para gerar e baixar arquivo TXT dos números descartados
  const downloadInvalidNumbers = () => {
    const invalidNumbers = validationResults
      .filter(result => !result.exists)
      .map(result => result.number)
      .join('\n');
    
    const blob = new Blob([invalidNumbers], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'numeros_descartados.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Função para importar Excel e extrair números de celular e nomes
  const handleImportExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Procurar pelas colunas "celular" e "cnome"
            const headers = jsonData[0] as string[];
            console.log('Headers encontrados:', headers);
            
            const celularColumnIndex = headers.findIndex(header => 
              header && (header.toLowerCase().includes('celular') || header.toLowerCase().includes('ccelular'))
            );
            const cnomeColumnIndex = headers.findIndex(header => 
              header && (header.toLowerCase() === 'cnome' || header.toUpperCase() === 'CNOME')
            );
            
            console.log('Índice coluna celular:', celularColumnIndex);
             console.log('Índice coluna cnome:', cnomeColumnIndex);
             console.log('Nome da coluna cnome:', headers[cnomeColumnIndex]);
            
            if (celularColumnIndex === -1) {
              toast.error('Coluna "celular" não encontrada no arquivo Excel');
              return;
            }
            
            // Extrair números da coluna celular
            const phoneNumbers = jsonData
              .slice(1) // Pular cabeçalho
              .map((row: any) => row[celularColumnIndex])
              .filter(phone => phone && phone.toString().trim())
              .map(phone => phone.toString().trim())
              .join('\n');
            
            // Salvar dados de nomes se a coluna cnome existir
             if (cnomeColumnIndex !== -1) {
                const phoneNamesData: { [key: string]: string } = {};
                console.log('Processando dados de nomes...');
               
               jsonData.slice(1).forEach((row: any, index) => {
                 const phone = row[celularColumnIndex];
                 const nome = row[cnomeColumnIndex];
                 console.log(`Linha ${index + 2}: Telefone=${phone}, Nome=${nome}`);
                 
                 if (phone && nome) {
                   const cleanPhone = phone.toString().trim();
                   const cleanNome = nome.toString().trim();
                   phoneNamesData[cleanPhone] = cleanNome;
                   console.log(`Adicionado: ${cleanPhone} -> ${cleanNome}`);
                 }
               });
               
               // Salvar no localStorage para usar na composição de mensagens
               localStorage.setItem('phoneNamesData', JSON.stringify(phoneNamesData));
               console.log('Dados finais salvos no localStorage:', phoneNamesData);
               toast.success(`Importados ${Object.keys(phoneNamesData).length} nomes da coluna CNOME`);
             } else {
               console.log('Coluna CNOME não encontrada');
               toast.error('Coluna CNOME não encontrada no Excel');
             }
            
            onChange(phoneNumbers);
          } catch (error) {
            console.error('Erro ao ler arquivo Excel:', error);
            toast.error('Erro ao ler arquivo Excel. Verifique se o arquivo está correto.');
          }
        };
        reader.readAsArrayBuffer(file);
      }
    };
    input.click();
  };
  const progressPercentage = validationProgress 
    ? Math.round((validationProgress.current / validationProgress.total) * 100)
    : 0;

  const phoneCount = value.split('\n').filter(line => line.trim()).length;

  return (
    <div className="h-full w-full flex flex-col md:flex-row gap-4 min-h-0">
      {/* Coluna 1: Entrada de números */}
      <Card className="p-4 glass-card flex-1 flex flex-col h-full min-h-[500px] w-1/2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <label className="text-sm flex-shrink-0" style={{color: 'var(--text-secondary)'}}>
            Telefones
          </label>
          <div className="flex flex-col sm:flex-row gap-2 min-w-0">
            <Button
              type="button"
              size="sm"
              onClick={handleImportExcel}
              disabled={isValidating}
              className="glass-card bg-gradient-to-r from-gray-600/50 to-gray-500/50 hover:from-gray-500/60 hover:to-gray-400/60 border-gray-300/50 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 flex-shrink-0 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Importar Excel</span>
              <span className="sm:hidden">Excel</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onValidate}
              disabled={isValidating || phoneCount === 0}
              className={`
                glass-card bg-gradient-to-r from-blue-600/60 to-blue-500/60 hover:from-blue-500/70 hover:to-blue-400/70 border-blue-300/60 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed
                ${phoneCount === 0 && 'opacity-50 cursor-not-allowed'}
              `}
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                  <span className="hidden sm:inline">
                    {validationProgress ? `${progressPercentage}%` : 'Validando...'}
                  </span>
                  <span className="sm:hidden">
                    {validationProgress ? `${progressPercentage}%` : '...'}
                  </span>
                </>
              ) : hasBeenValidated ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Validado</span>
                  <span className="sm:hidden">OK</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Validar números</span>
                  <span className="sm:hidden">Validar</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {isValidating && validationProgress && (
          <div className="mb-4">
            <Progress value={progressPercentage} className="h-1" />
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <Textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            className="flex-1 resize-none glass-input font-mono transition-all duration-300 scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent hover:scrollbar-thumb-white/20"
            style={{color: 'var(--text-primary)'}}
            placeholder="Digite os números de telefone..."
          />
        </div>
      </Card>

      {/* Coluna 2: Resultados da validação */}
      <Card className="p-4 glass-card flex-1 flex flex-col h-full min-h-[500px] w-1/2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <label className="text-sm flex-shrink-0" style={{color: 'var(--text-secondary)'}}>
            Números Validados
          </label>
          <div className="flex items-center gap-2">
            {hasBeenValidated && (
              <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white'
              }}>
                {validationResults.filter(r => r.exists).length} válidos
              </span>
            )}
            {hasBeenValidated && onFetchProfiles && validationResults.some(r => r.exists) && (
              <Button
                onClick={onFetchProfiles}
                disabled={isFetchingProfiles}
                className="glass-button flex-shrink-0"
                variant="outline"
                size="sm"
              >
                {isFetchingProfiles ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                    <span className="hidden sm:inline">Buscando fotos...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faWhatsapp} className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Buscar fotos</span>
                    <span className="sm:hidden">Fotos</span>
                  </>
                )}
              </Button>
            )}
            
            {/* Botões de download como ícones */}
            {hasBeenValidated && validationResults.length > 0 && (
              <>
                {/* Botão download validados (verde) */}
                <Button
                  onClick={downloadValidNumbers}
                  disabled={validationResults.filter(r => r.exists).length === 0}
                  className="glass-button flex-shrink-0 w-8 h-8 p-0"
                  variant="outline"
                  size="sm"
                  title={`Baixar números validados (${validationResults.filter(r => r.exists).length})`}
                >
                  <Download className="w-3 h-3 text-green-500" />
                </Button>
                <span className="text-xs text-green-500 font-medium">
                  {validationResults.filter(r => r.exists).length}
                </span>
                
                {/* Botão download descartados (vermelho) */}
                <Button
                  onClick={downloadInvalidNumbers}
                  disabled={validationResults.filter(r => !r.exists).length === 0}
                  className="glass-button flex-shrink-0 w-8 h-8 p-0"
                  variant="outline"
                  size="sm"
                  title={`Baixar números descartados (${validationResults.filter(r => !r.exists).length})`}
                >
                  <Download className="w-3 h-3 text-red-500" />
                </Button>
                <span className="text-xs text-red-500 font-medium">
                  {validationResults.filter(r => !r.exists).length}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {validationResults.length > 0 ? (
            <div className="space-y-1 font-mono glass-surface rounded-lg p-3 flex-1 overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent hover:scrollbar-thumb-white/20">
              {validationResults.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center text-sm p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {result.exists && result.profilePictureUrl && (
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 mr-2">
                      <img 
                        src={result.profilePictureUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {result.exists && !result.profilePictureUrl && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                      <span className="text-xs text-white">?</span>
                    </div>
                  )}
                  
                  {!result.exists && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                      <span className="text-xs text-white">-</span>
                    </div>
                  )}
                  
                  <span style={{color: result.exists ? 'var(--color-primary)' : '#ef4444'}}>
                    {result.number}
                  </span>
                  
                  {result.exists ? (
                    <FontAwesomeIcon icon={faWhatsapp} style={{color: 'var(--color-primary)'}} className="ml-1" />
                  ) : (
                    <X className="w-4 h-4 ml-1" style={{color: '#ef4444'}} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center glass-surface rounded-lg">
              <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                Os números validados aparecerão aqui
              </p>
            </div>
          )}
        </div>

      </Card>
    </div>
  );
}