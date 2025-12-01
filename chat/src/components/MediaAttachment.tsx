import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Image, 
  Video, 
  Music, 
  FileText, 
  MapPin, 
  User, 
  Sticker,
  X,
  Plus
} from 'lucide-react';

export interface MediaAttachment {
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact';
  file?: File;
  url?: string;
  caption?: string;
  // Para localização
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  // Para contato
  contact?: {
    fullName: string;
    phoneNumber: string;
    organization?: string;
    email?: string;
    url?: string;
  };
}

interface MediaAttachmentProps {
  attachments: MediaAttachment[];
  onAttachmentsChange: (attachments: MediaAttachment[]) => void;
}

const mediaTypes = [
  { type: 'image' as const, label: 'Imagem', icon: Image, accept: 'image/*' },
  { type: 'video' as const, label: 'Vídeo', icon: Video, accept: 'video/*' },
  { type: 'audio' as const, label: 'Áudio', icon: Music, accept: 'audio/*' },
  { type: 'document' as const, label: 'Documento', icon: FileText, accept: '.pdf,.doc,.docx,.txt' },
  { type: 'sticker' as const, label: 'Sticker', icon: Sticker, accept: 'image/*' },
  { type: 'location' as const, label: 'Localização', icon: MapPin, accept: '' },
  { type: 'contact' as const, label: 'Contato', icon: User, accept: '' },
];

export function MediaAttachment({ attachments, onAttachmentsChange }: MediaAttachmentProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const addAttachment = (type: MediaAttachment['type']) => {
    const newAttachment: MediaAttachment = { type };
    
    if (type === 'location') {
      newAttachment.name = '';
      newAttachment.address = '';
      newAttachment.latitude = 0;
      newAttachment.longitude = 0;
    } else if (type === 'contact') {
      newAttachment.contact = {
        fullName: '',
        phoneNumber: '',
        organization: '',
        email: '',
        url: ''
      };
    }
    
    const newAttachments = [...attachments, newAttachment];
    onAttachmentsChange(newAttachments);
    setShowTypeSelector(false);
  };

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newAttachments);
  };

  const updateAttachment = (index: number, updates: Partial<MediaAttachment>) => {
    const newAttachments = [...attachments];
    newAttachments[index] = { ...newAttachments[index], ...updates };
    onAttachmentsChange(newAttachments);
  };

  const handleFileChange = (index: number, file: File | null) => {
    if (file) {
      updateAttachment(index, { file });
    }
  };

  const renderAttachmentEditor = (attachment: MediaAttachment, index: number) => {
    const mediaType = mediaTypes.find(mt => mt.type === attachment.type);
    
    return (
      <Card key={index} className="p-4 glass-card border-white/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {mediaType && <mediaType.icon className="w-4 h-4 text-white/70" />}
            <span className="text-sm font-medium text-white">{mediaType?.label}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeAttachment(index)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Upload de arquivo para tipos que precisam */}
        {['image', 'video', 'audio', 'document', 'sticker'].includes(attachment.type) && (
          <div className="space-y-3">
            <div>
              <Label className="text-white/80 text-sm">Arquivo</Label>
              <Input
                type="file"
                accept={mediaType?.accept}
                onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                className="mt-1 bg-white/10 border-white/20 text-white"
              />
              {attachment.file && (
                <p className="text-xs text-white/60 mt-1">{attachment.file.name}</p>
              )}
            </div>
            
            {/* Caption para mídia */}
            {['image', 'video', 'document'].includes(attachment.type) && (
              <div>
                <Label className="text-white/80 text-sm">Legenda (opcional)</Label>
                <Textarea
                  value={attachment.caption || ''}
                  onChange={(e) => updateAttachment(index, { caption: e.target.value })}
                  placeholder="Digite uma legenda..."
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  rows={2}
                />
              </div>
            )}
          </div>
        )}

        {/* Campos para localização */}
        {attachment.type === 'location' && (
          <div className="space-y-3">
            <div>
              <Label className="text-white/80 text-sm">Nome do Local</Label>
              <Input
                value={attachment.name || ''}
                onChange={(e) => updateAttachment(index, { name: e.target.value })}
                placeholder="Ex: Minha Casa"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <div>
              <Label className="text-white/80 text-sm">Endereço</Label>
              <Input
                value={attachment.address || ''}
                onChange={(e) => updateAttachment(index, { address: e.target.value })}
                placeholder="Ex: Rua das Flores, 123"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/80 text-sm">Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={attachment.latitude || ''}
                  onChange={(e) => updateAttachment(index, { latitude: parseFloat(e.target.value) || 0 })}
                  placeholder="-23.5505"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>
              <div>
                <Label className="text-white/80 text-sm">Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={attachment.longitude || ''}
                  onChange={(e) => updateAttachment(index, { longitude: parseFloat(e.target.value) || 0 })}
                  placeholder="-46.6333"
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>
            </div>
          </div>
        )}

        {/* Campos para contato */}
        {attachment.type === 'contact' && attachment.contact && (
          <div className="space-y-3">
            <div>
              <Label className="text-white/80 text-sm">Nome Completo *</Label>
              <Input
                value={attachment.contact.fullName}
                onChange={(e) => updateAttachment(index, { 
                  contact: { ...attachment.contact!, fullName: e.target.value }
                })}
                placeholder="João Silva"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <div>
              <Label className="text-white/80 text-sm">Telefone *</Label>
              <Input
                value={attachment.contact.phoneNumber}
                onChange={(e) => updateAttachment(index, { 
                  contact: { ...attachment.contact!, phoneNumber: e.target.value }
                })}
                placeholder="5511999999999"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <div>
              <Label className="text-white/80 text-sm">Organização</Label>
              <Input
                value={attachment.contact.organization || ''}
                onChange={(e) => updateAttachment(index, { 
                  contact: { ...attachment.contact!, organization: e.target.value }
                })}
                placeholder="Empresa ABC"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <div>
              <Label className="text-white/80 text-sm">Email</Label>
              <Input
                type="email"
                value={attachment.contact.email || ''}
                onChange={(e) => updateAttachment(index, { 
                  contact: { ...attachment.contact!, email: e.target.value }
                })}
                placeholder="joao@email.com"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <div>
              <Label className="text-white/80 text-sm">Website</Label>
              <Input
                type="url"
                value={attachment.contact.url || ''}
                onChange={(e) => updateAttachment(index, { 
                  contact: { ...attachment.contact!, url: e.target.value }
                })}
                placeholder="https://website.com"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Lista de anexos */}
      {attachments.map((attachment, index) => renderAttachmentEditor(attachment, index))}

      {/* Botão para adicionar anexo */}
      {!showTypeSelector ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowTypeSelector(true)}
          className="w-full backdrop-blur-xl bg-white/10 border-white/30 text-white hover:bg-white/20 h-12"
        >
          <Plus className="w-5 h-5 mr-2" />
          Adicionar Anexo
        </Button>
      ) : (
        <Card className="p-6 glass-card border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-medium text-white">Escolha o tipo de anexo</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTypeSelector(false)}
              className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {mediaTypes.map((mediaType) => (
              <Button
                key={mediaType.type}
                variant="outline"
                onClick={() => addAttachment(mediaType.type)}
                className="flex flex-col items-center gap-3 h-20 backdrop-blur-xl bg-white/5 border-white/20 text-white hover:bg-white/15 hover:border-white/40 transition-all duration-200"
              >
                <mediaType.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{mediaType.label}</span>
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}