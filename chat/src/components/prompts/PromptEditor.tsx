import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Save, 
 
  Copy, 
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  category: 'system' | 'user' | 'rewrite' | 'validation';
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PromptEditorProps {
  className?: string;
  onPromptChange?: (prompts: Prompt[]) => void;
}

export function PromptEditor({ className = '', onPromptChange }: PromptEditorProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [isSaving, setIsSaving] = useState(false);

  // Prompts iniciais do sistema
  useEffect(() => {
    const initialPrompts: Prompt[] = [
      {
        id: '1',
        name: 'Prompt de Reescrita',
        description: 'Prompt padrão para reescrever mensagens',
        content: import.meta.env.VITE_REWRITE_PROMPT || 'Reescreva a seguinte mensagem de forma mais profissional e clara: {message}',
        category: 'rewrite',
        variables: ['message'],
        isActive: true,
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000)
      },
      {
        id: '2',
        name: 'Prompt de Sistema',
        description: 'Prompt base para interações do sistema',
        content: 'Você é um assistente especializado em marketing digital e WhatsApp. Ajude o usuário com suas dúvidas sobre {topic}.',
        category: 'system',
        variables: ['topic'],
        isActive: true,
        createdAt: new Date(Date.now() - 172800000),
        updatedAt: new Date(Date.now() - 172800000)
      },
      {
        id: '3',
        name: 'Validação de Conteúdo',
        description: 'Prompt para validar conteúdo antes do envio',
        content: 'Analise o seguinte conteúdo e verifique se está adequado para envio em massa: {content}. Considere: 1) Linguagem apropriada 2) Compliance 3) Clareza da mensagem',
        category: 'validation',
        variables: ['content'],
        isActive: false,
        createdAt: new Date(Date.now() - 259200000),
        updatedAt: new Date(Date.now() - 259200000)
      }
    ];
    
    setPrompts(initialPrompts);
  }, []);

  const createNewPrompt = () => {
    const newPrompt: Prompt = {
      id: Date.now().toString(),
      name: 'Novo Prompt',
      description: '',
      content: '',
      category: 'user',
      variables: [],
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setEditingPrompt(newPrompt);
    setActiveTab('editor');
  };

  const editPrompt = (prompt: Prompt) => {
    setEditingPrompt({ ...prompt });
    setActiveTab('editor');
  };

  const savePrompt = async () => {
    if (!editingPrompt) return;
    
    setIsSaving(true);
    
    try {
      // Extrair variáveis do conteúdo
      const variables = extractVariables(editingPrompt.content);
      
      const updatedPrompt = {
        ...editingPrompt,
        variables,
        updatedAt: new Date()
      };
      
      setPrompts(prev => {
        const existing = prev.find(p => p.id === updatedPrompt.id);
        if (existing) {
          return prev.map(p => p.id === updatedPrompt.id ? updatedPrompt : p);
        } else {
          return [...prev, updatedPrompt];
        }
      });
      
      setEditingPrompt(null);
      setActiveTab('list');
      
      if (onPromptChange) {
        onPromptChange(prompts);
      }
      
      toast.success('Prompt salvo com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const deletePrompt = (id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
    toast.success('Prompt excluído');
  };

  const duplicatePrompt = (prompt: Prompt) => {
    const duplicated: Prompt = {
      ...prompt,
      id: Date.now().toString(),
      name: `${prompt.name} (Cópia)`,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setPrompts(prev => [...prev, duplicated]);
    toast.success('Prompt duplicado');
  };

  const togglePromptActive = (id: string) => {
    setPrompts(prev => prev.map(p => 
      p.id === id ? { ...p, isActive: !p.isActive, updatedAt: new Date() } : p
    ));
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{([^}]+)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  const getCategoryBadge = (category: Prompt['category']) => {
    const variants = {
      system: 'bg-blue-600 text-white',
      user: 'bg-green-600 text-white',
      rewrite: 'bg-purple-600 text-white',
      validation: 'bg-orange-600 text-white'
    };
    
    return (
      <Badge className={variants[category]}>
        {category}
      </Badge>
    );
  };

  const renderPromptList = () => (
    <div className="h-full flex flex-col space-y-3">
      <div className="flex justify-between items-center flex-shrink-0">
        <h3 className="text-lg font-medium text-slate-200">Prompts Disponíveis</h3>
        <Button
          onClick={createNewPrompt}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo Prompt
        </Button>
      </div>
      
      <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className={`p-4 rounded-lg border transition-colors ${
              selectedPrompt === prompt.id
                ? 'bg-slate-700/50 border-blue-500/50'
                : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
            }`}
            onClick={() => setSelectedPrompt(selectedPrompt === prompt.id ? null : prompt.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-medium text-slate-200 truncate">{prompt.name}</h4>
                  {getCategoryBadge(prompt.category)}
                  {prompt.isActive && (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  )}
                </div>
                
                <p className="text-xs text-slate-400 mb-2">{prompt.description}</p>
                
                {prompt.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {prompt.variables.map((variable) => (
                      <Badge key={variable} variant="outline" className="text-xs border-slate-600 text-slate-300">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="text-xs text-slate-500">
                  Atualizado: {prompt.updatedAt.toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    editPrompt(prompt);
                  }}
                  className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicatePrompt(prompt);
                  }}
                  className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePromptActive(prompt.id);
                  }}
                  className={`border-slate-600 hover:bg-slate-700/50 ${
                    prompt.isActive 
                      ? 'bg-green-600/20 text-green-300' 
                      : 'bg-slate-800/50 text-slate-300'
                  }`}
                >
                  {prompt.isActive ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                </Button>
                
                {prompt.category === 'user' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePrompt(prompt.id);
                    }}
                    className="bg-red-600/20 border-red-600/50 text-red-300 hover:bg-red-600/30"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            {selectedPrompt === prompt.id && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <Label className="text-xs text-slate-400">Conteúdo:</Label>
                <div className="mt-1 p-2 bg-slate-900/50 rounded text-xs text-slate-300 font-mono whitespace-pre-wrap">
                  {prompt.content}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPromptEditor = () => (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center flex-shrink-0">
        <h3 className="text-lg font-medium text-slate-200">
          {editingPrompt?.id && prompts.find(p => p.id === editingPrompt.id) ? 'Editar Prompt' : 'Novo Prompt'}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingPrompt(null);
              setActiveTab('list');
            }}
            className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50"
          >
            Cancelar
          </Button>
          <Button
            onClick={savePrompt}
            disabled={!editingPrompt?.name || !editingPrompt?.content || isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
      
      {editingPrompt && (
        <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Nome do Prompt</Label>
              <Input
                value={editingPrompt.name}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                className="bg-slate-800/50 border-slate-600 text-slate-100"
                placeholder="Nome do prompt"
              />
            </div>
            
            <div>
              <Label className="text-slate-300">Categoria</Label>
              <select
                value={editingPrompt.category}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, category: e.target.value as Prompt['category'] })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded text-slate-100"
              >
                <option value="user">Usuário</option>
                <option value="system">Sistema</option>
                <option value="rewrite">Reescrita</option>
                <option value="validation">Validação</option>
              </select>
            </div>
          </div>
          
          <div>
            <Label className="text-slate-300">Descrição</Label>
            <Input
              value={editingPrompt.description}
              onChange={(e) => setEditingPrompt({ ...editingPrompt, description: e.target.value })}
              className="bg-slate-800/50 border-slate-600 text-slate-100"
              placeholder="Descrição do prompt"
            />
          </div>
          
          <div className="flex-1 flex flex-col min-h-0">
            <Label className="text-slate-300 mb-2">Conteúdo do Prompt</Label>
            <Textarea
              value={editingPrompt.content}
              onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
              className="flex-1 min-h-[150px] max-h-none bg-slate-800/50 border-slate-600 text-slate-100 font-mono resize-none"
              placeholder="Digite o conteúdo do prompt aqui...\n\nUse {variavel} para definir variáveis que serão substituídas."
            />
          </div>
          
          {editingPrompt.content && (
            <div className="flex-shrink-0">
              <Label className="text-slate-300 text-sm">Variáveis Detectadas</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {extractVariables(editingPrompt.content).map((variable) => (
                  <Badge key={variable} className="bg-blue-600/20 border-blue-600/50 text-blue-300 text-xs">
                    {variable}
                  </Badge>
                ))}
                {extractVariables(editingPrompt.content).length === 0 && (
                  <span className="text-xs text-slate-400">Nenhuma variável detectada</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card className={`h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] flex flex-col backdrop-blur-md bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 ${className}`}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <FileText className="h-5 w-5 text-blue-400" />
          Prompt Raiz
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 flex-1 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 flex-shrink-0">
            <TabsTrigger value="list" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              Lista de Prompts
            </TabsTrigger>
            <TabsTrigger value="editor" className="text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              Editor
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-4 flex-1 min-h-0">
            <TabsContent value="list" className="h-full">
              {renderPromptList()}
            </TabsContent>
            
            <TabsContent value="editor" className="h-full">
              {renderPromptEditor()}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}