# Lista de Tarefas: Migração Gestão de Entregas → Analytics

## Objetivo
Migrar completamente o conteúdo do painel "Gestão de entregas" (DashboardTab) para o subpainel "Analytics" dentro do GestaoEnvioTab, mantendo todas as funcionalidades e melhorando a organização da interface.

## Análise da Situação Atual

### DashboardTab.tsx (Origem)
- **Localização**: `src/components/tabs/DashboardTab.tsx`
- **Funcionalidades principais**:
  - Tabela completa de logs de mensagens
  - 6 colunas: Status, Destinatário, Mensagem, Data do Envio, Data da Entrega, Data da Leitura
  - Ícones de status com cores específicas
  - Atualização automática a cada 5 segundos
  - Tratamento de erros
  - Interface responsiva com scroll

### GestaoEnvioTab.tsx (Destino)
- **Localização**: `src/components/tabs/GestaoEnvioTab.tsx`
- **Subpainel Analytics atual**: Apenas placeholder "Em desenvolvimento"
- **Estrutura**: TabsContent com BarChart3 icon

## Lista de Tarefas Detalhada

### 📋 Fase 1: Preparação e Análise
- [ ] **1.1** Criar backup do DashboardTab.tsx atual
- [ ] **1.2** Documentar todas as interfaces TypeScript utilizadas
- [ ] **1.3** Mapear todas as dependências e imports necessários
- [ ] **1.4** Analisar a API `/api/messages` utilizada pelo DashboardTab

### 🔧 Fase 2: Estrutura Base do Analytics
- [ ] **2.1** Remover o placeholder atual do subpainel Analytics
- [ ] **2.2** Criar estrutura base com Card container
- [ ] **2.3** Implementar layout responsivo similar ao DashboardTab
- [ ] **2.4** Configurar altura e overflow adequados

### 📊 Fase 3: Implementação da Tabela
- [ ] **3.1** Importar componentes de Table necessários:
  - `Table, TableBody, TableCell, TableHead, TableHeader, TableRow`
- [ ] **3.2** Implementar interface `MessageLog`:
  ```typescript
  interface MessageLog {
    id: string;
    remoteJid: string;
    body: string;
    status: 'sent' | 'delivered' | 'read' | 'pending' | 'error';
    timestamp: string;
    updatedAt?: string;
    deliveredAt?: string;
    readAt?: string;
  }
  ```
- [ ] **3.3** Criar cabeçalho da tabela com 6 colunas
- [ ] **3.4** Implementar corpo da tabela com renderização de dados

### 🎨 Fase 4: Ícones e Estilização
- [ ] **4.1** Importar ícones necessários do Lucide React:
  - `Clock, Eye, Send, MailOpen, Mailbox, User, Calendar, MessageSquare`
- [ ] **4.2** Implementar função `getStatusIcon()` com cores específicas:
  - Lido: `MailOpen` verde (`text-green-500`)
  - Entregue: `Mailbox` amarelo (`text-yellow-500`)
  - Pendente: `Send` cinza (`text-gray-400`)
  - Erro: `Send` vermelho (`text-red-500`)
  - Enviado: `Send` azul (`text-blue-500`)
- [ ] **4.3** Implementar função `getStatusDate()` para formatação de datas
- [ ] **4.4** Aplicar classes CSS do glass-card para consistência visual

### 🔄 Fase 5: Funcionalidades Dinâmicas
- [ ] **5.1** Implementar estado para mensagens:
  ```typescript
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  ```
- [ ] **5.2** Criar função `fetchMessages()` para buscar dados da API
- [ ] **5.3** Implementar useEffect para carregamento inicial
- [ ] **5.4** Configurar intervalo de atualização automática (5 segundos)
- [ ] **5.5** Implementar tratamento de erros com exibição de mensagens

### 📅 Fase 6: Formatação de Datas
- [ ] **6.1** Importar `format` do date-fns
- [ ] **6.2** Implementar formatação `dd/MM/yyyy HH:mm:ss`
- [ ] **6.3** Tratar casos onde datas são nulas (exibir "-")

### 🎯 Fase 7: Responsividade e UX
- [ ] **7.1** Implementar scroll responsivo com `scrollbar-hide`
- [ ] **7.2** Configurar truncamento de texto para mensagens longas
- [ ] **7.3** Adicionar tooltips para mensagens truncadas
- [ ] **7.4** Implementar sticky header para a tabela
- [ ] **7.5** Adicionar mensagem para estado vazio: "Nenhum disparo registrado ainda."

### 🧪 Fase 8: Testes e Validação
- [ ] **8.1** Testar carregamento inicial de dados
- [ ] **8.2** Validar atualização automática a cada 5 segundos
- [ ] **8.3** Testar tratamento de erros de API
- [ ] **8.4** Verificar responsividade em diferentes tamanhos de tela
- [ ] **8.5** Validar formatação de datas e ícones de status
- [ ] **8.6** Testar performance com grande volume de dados

### 🔧 Fase 9: Otimizações
- [ ] **9.1** Implementar cleanup do intervalo no useEffect
- [ ] **9.2** Otimizar re-renderizações desnecessárias
- [ ] **9.3** Adicionar loading state durante fetch inicial
- [ ] **9.4** Implementar debounce se necessário

### 📋 Fase 10: Funcionalidades Extras (Se Existirem)
- [ ] **10.1** Verificar se DashboardTab possui funcionalidade de relatórios
- [ ] **10.2** Migrar modal de relatórios se existir
- [ ] **10.3** Implementar filtros de data se necessário
- [ ] **10.4** Adicionar exportação de dados se aplicável

### 🗑️ Fase 11: Limpeza Final
- [ ] **11.1** Remover imports desnecessários do GestaoEnvioTab
- [ ] **11.2** Verificar se todas as funcionalidades foram migradas
- [ ] **11.3** Documentar mudanças realizadas
- [ ] **11.4** Preparar para remoção do DashboardTab (após validação completa)

## Arquivos Afetados

### Principais
- `src/components/tabs/GestaoEnvioTab.tsx` (modificação principal)
- `src/components/tabs/DashboardTab.tsx` (referência/backup)

### Dependências
- `@/components/ui/card`
- `@/components/ui/table`
- `lucide-react` (ícones)
- `date-fns` (formatação de datas)
- `react` (hooks useState, useEffect)

## Critérios de Sucesso

✅ **Migração completa quando**:
1. Subpainel Analytics exibe tabela idêntica ao DashboardTab
2. Todos os ícones e cores funcionam corretamente
3. Atualização automática funciona a cada 5 segundos
4. Tratamento de erros está implementado
5. Interface é responsiva e consistente
6. Performance é adequada
7. Não há regressões em outras funcionalidades

## Notas Importantes

⚠️ **Atenções especiais**:
- Manter a mesma estrutura de dados da API `/api/messages`
- Preservar todas as classes CSS para consistência visual
- Não quebrar funcionalidades existentes do GestaoEnvioTab
- Testar em diferentes resoluções de tela
- Validar que o cleanup dos intervalos funciona corretamente

## Estimativa de Tempo
- **Desenvolvimento**: 4-6 horas
- **Testes**: 2-3 horas
- **Refinamentos**: 1-2 horas
- **Total**: 7-11 horas

Esta migração permitirá centralizar todas as funcionalidades de análise em um local único, melhorando a experiência do usuário e a organização da interface.