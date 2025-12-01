import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SendIcon, MessageSquare, AlertCircle, Sparkles, X, Paperclip, Archive, Download } from 'lucide-react';
import { MessageFormatToolbar } from './MessageFormatToolbar';
import { useState, useCallback, useRef } from 'react';
import { compressPdf } from '@/services/ilovepdf';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

interface MessageFormProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  canSend: boolean;
  useAI: boolean;
  onUseAIChange: (value: boolean) => void;
  buttonText?: string;
  buttonIcon?: React.ComponentType<{ className?: string }>;
  hideButton?: boolean;
  selectedFile?: File | null;
  onFileChange?: (file: File | null) => void;
}

export function MessageForm({
  message,
  onMessageChange,
  onSubmit,
  isSubmitting,
  canSend,
  useAI,
  onUseAIChange,

  buttonIcon: ButtonIcon = SendIcon,
  hideButton = false,
  selectedFile,
  onFileChange
}: MessageFormProps) {
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState("recommended");

  const handleDownload = () => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleFormat = useCallback((format: string, type: 'wrap' | 'prefix' | 'code') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);

    let newText = message;
    let newStart = start;
    let newEnd = end;
    
    if (type === 'prefix') {
      if (selectedText) {
        const lines = selectedText.split('\n');
        let formattedText;
        
        if (format === '1. ') {
          formattedText = lines
            .map((line, index) => `${index + 1}. ${line}`)
            .join('\n');
        } else {
          formattedText = lines
            .map(line => `${format}${line}`)
            .join('\n');
        }
        
        newText = message.substring(0, start) + formattedText + message.substring(end);
        newEnd = start + formattedText.length;
      } else {
        newText = message.substring(0, start) + format + message.substring(end);
        newStart = newEnd = start + format.length;
      }
    } else if (type === 'code') {
      if (selectedText) {
        const formattedText = `\n${format}\n${selectedText}\n${format}\n`;
        newText = message.substring(0, start) + formattedText + message.substring(end);
        newEnd = start + formattedText.length;
      }
    } else {
      if (selectedText) {
        const isFormatted = selectedText.startsWith(format) && selectedText.endsWith(format);
        if (isFormatted) {
          const unformattedText = selectedText.slice(format.length, -format.length);
          newText = message.substring(0, start) + unformattedText + message.substring(end);
          newEnd = start + unformattedText.length;
          setActiveFormats(prev => prev.filter(f => f !== format));
        } else {
          const formattedText = `${format}${selectedText}${format}`;
          newText = message.substring(0, start) + formattedText + message.substring(end);
          newEnd = start + formattedText.length;
          setActiveFormats(prev => [...prev, format]);
        }
      }
    }

    onMessageChange(newText);
    textarea.focus();
    setTimeout(() => {
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  }, [message, onMessageChange]);

  const handleCompressPDF = async () => {
    if (!selectedFile || selectedFile.type !== 'application/pdf') return;
    
    setIsCompressing(true);
    try {
      const originalSize = selectedFile.size;
      const compressedBlob = await compressPdf(selectedFile, compressionLevel);
      const compressedFile = new File([compressedBlob], selectedFile.name.replace(/\.pdf$/i, '_compressed.pdf'), {
        type: 'application/pdf',
        lastModified: Date.now()
      });
      const compressedSize = compressedFile.size;
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
      
      // Usar o arquivo comprimido diretamente
      onFileChange?.(compressedFile);
      
      // Mostrar resultado
      toast.success("PDF comprimido com sucesso!", {
        description: `Tamanho original: ${(originalSize / 1024 / 1024).toFixed(2)}MB | Tamanho comprimido: ${(compressedSize / 1024 / 1024).toFixed(2)}MB | Redução: ${compressionRatio.toFixed(1)}%`,
      });
      
    } catch (error) {
      console.error('Erro na compressão:', error);
      toast.error("Erro ao comprimir PDF", {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <Card className="p-4 glass-card h-full">
      <div className="h-full flex flex-col">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Mensagem
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ai-rewrite"
                  checked={useAI}
                  onCheckedChange={(checked) => onUseAIChange(checked as boolean)}
                />
                <label
                  htmlFor="ai-rewrite"
                  className="text-sm flex items-center gap-2 cursor-pointer transition-colors"
                  style={{color: 'var(--text-secondary)'}}
                >
                  <Sparkles className="w-4 h-4" style={{color: 'var(--color-primary)'}} />
                  Reescrever com IA
                </label>
              </div>
            </div>
          </div>

          <MessageFormatToolbar 
            onFormat={handleFormat}
            activeFormats={activeFormats}
            onMediaClick={() => {
              if (!onFileChange) return;
              
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  onFileChange(file);
                }
              };
              input.click();
            }}
          />

          <Textarea
            ref={textareaRef}
            value={message}
            onChange={e => onMessageChange(e.target.value)}
            className="min-h-[200px] flex-1 glass-input font-mono transition-all duration-300 resize-none"
            style={{color: 'var(--text-primary)'}}
            placeholder="Digite sua mensagem..."
          />
          
          {/* Exibir arquivo selecionado */}
          {selectedFile && (
            <div className="mt-2 space-y-2">
              <div className="p-2 bg-white/10 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-white">
                   <Paperclip className="w-4 h-4" />
                   <span>{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                 </div>
                 <div className="flex items-center">
                  {selectedFile.name.includes('_compressed') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDownload}
                      className="h-6 w-6 p-0 text-white hover:text-white hover:bg-white/10"
                      title="Baixar PDF comprimido"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileChange?.(null)}
                    className="h-6 w-6 p-0 text-white hover:text-white hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Aviso de tamanho */}
               {selectedFile.size > 16 * 1024 * 1024 && (
                 <div className="p-2 bg-red-500/20 border border-red-500/50 rounded-md flex items-center gap-2">
                   <AlertCircle className="w-4 h-4 text-red-400" />
                   <span className="text-sm text-red-300">
                     Arquivo muito grande! Limite: 16MB. Atual: {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
                   </span>
                 </div>
               )}
               
               {/* Botão de compressão para PDFs */}
               {selectedFile.type === 'application/pdf' && (
                 <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={handleCompressPDF}
                         disabled={isCompressing}
                         className="flex items-center gap-2 text-white border-white/20 hover:bg-white/10"
                       >
                         {isCompressing ? (
                            <span className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Comprimindo...
                            </span>
                         ) : (
                            <span className="flex items-center gap-2">
                                <Archive className="w-4 h-4" />
                                Comprimir PDF
                            </span>
                         )}
                       </Button>
                      <span className="text-xs text-white/60">
                        Reduz o tamanho do arquivo para facilitar o envio
                      </span>
                    </div>
                    <RadioGroup
                      defaultValue="recommended"
                      value={compressionLevel}
                      onValueChange={setCompressionLevel}
                      className="flex items-center gap-4"
                    >
                      <Label className="text-xs text-white/60">Nível:</Label>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="low" className="text-white"/>
                        <Label htmlFor="low" className="text-xs text-white/80">Baixo</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="recommended" id="recommended" className="text-white"/>
                        <Label htmlFor="recommended" className="text-xs text-white/80">Recomendado</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="extreme" id="extreme" className="text-white"/>
                        <Label htmlFor="extreme" className="text-xs text-white/80">Extremo</Label>
                      </div>
                    </RadioGroup>
                 </div>
               )}
            </div>
          )}
        </div>

        {!canSend && (
          <div className="flex items-center gap-2 text-sm mt-2 mb-2" style={{color: 'var(--color-quaternary)'}}>
            <AlertCircle className="w-4 h-4" style={{color: 'var(--color-quaternary)'}} />
            Valide os números antes de enviar
          </div>
        )}

        {!hideButton && (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !canSend || !message.trim()}
            size="lg"
            className={`
              w-16 h-16 mt-2 backdrop-blur-xl border-white/30 transition-all duration-300 rounded-full aspect-square flex items-center justify-center
              ${canSend ? 'bg-blue-600 hover:bg-blue-700 border-blue-500/40' : 'bg-white/5 border-white/10'}
              text-white font-medium
            `}
            style={{
              borderRadius: '50%'
            } as React.CSSProperties}
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
            ) : (
              <ButtonIcon className="w-8 h-8" />
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}