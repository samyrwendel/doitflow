import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  Strikethrough,
  List,
  Quote,
  Code,
  ListOrdered,
  Terminal,
  Paperclip,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageFormatToolbarProps {
  onFormat: (format: string, type: 'wrap' | 'prefix' | 'code') => void;
  activeFormats: string[];
  onMediaClick?: () => void;
}

export function MessageFormatToolbar({ 
  onFormat, 
  activeFormats,
  onMediaClick
}: MessageFormatToolbarProps) {
  const tools = [
    { id: 'bold', icon: Bold, format: '*', type: 'wrap', tooltip: 'Negrito (*texto*)' },
    { id: 'italic', icon: Italic, format: '_', type: 'wrap', tooltip: 'Itálico (_texto_)' },
    { id: 'strikethrough', icon: Strikethrough, format: '~', type: 'wrap', tooltip: 'Tachado (~texto~)' },
    { id: 'code', icon: Code, format: '`', type: 'wrap', tooltip: 'Código (`texto`)' },
    { id: 'codeblock', icon: Terminal, format: '```', type: 'code', tooltip: 'Bloco de código (```texto```)' },
    { id: 'bulletList', icon: List, format: '* ', type: 'prefix', tooltip: 'Lista com marcadores (* texto)' },
    { id: 'numberedList', icon: ListOrdered, format: '1. ', type: 'prefix', tooltip: 'Lista numerada (1. texto)' },
    { id: 'quote', icon: Quote, format: '> ', type: 'prefix', tooltip: 'Citação (> texto)' },
    { id: 'nome', icon: User, format: '{nome}', type: 'prefix', tooltip: 'Inserir variável nome ({nome})' }
  ];

  const handleFormatClick = (e: React.MouseEvent, format: string, type: 'wrap' | 'prefix' | 'code') => {
    e.preventDefault(); // Prevent form submission
    onFormat(format, type);
  };

  return (
    <div className="flex items-center justify-between mb-2 p-1 rounded-md glass-surface backdrop-blur-xl">
      <div className="flex items-center gap-1">
        {tools.map(tool => (
          <Button
            key={tool.id}
            type="button" // Explicitly set type to button
            variant="ghost"
            size="sm"
            title={tool.tooltip}
            onClick={(e) => handleFormatClick(e, tool.format, tool.type as 'wrap' | 'prefix' | 'code')}
            className={cn(
              "h-8 w-8 p-0 transition-all duration-200",
            activeFormats.includes(tool.format) ? "glass-primary" : "hover:glass-surface"
          )}
          style={{
            color: activeFormats.includes(tool.format) ? 'var(--color-primary)' : 'var(--text-secondary)'
          }}
        >
          <tool.icon className="h-4 w-4" />
        </Button>
      ))}
      </div>
      
      {onMediaClick && (
        <div className="flex items-center gap-2">
           <div className="h-4 w-px bg-white/20"></div>
           <Button
             type="button"
             variant="ghost"
             title="Anexar arquivo"
             onClick={onMediaClick}
             className="px-3 py-2 h-auto bg-white/10 border border-white/30 rounded-lg transition-all duration-300 hover:bg-white/20 hover:border-white/40 hover:scale-105 text-white"
           >
             <div className="flex items-center gap-2">
               <Paperclip className="h-4 w-4 text-white/80" />
               <span className="text-xs font-medium text-white/90">Anexar</span>
             </div>
           </Button>
         </div>
      )}
    </div>
  );
}