# 🧪 Teste: Seleção de Agentes no Modal de Prompt

## ✅ Funcionalidades Implementadas

### 1️⃣ **Header do Modal com Dropdown de Agentes**
- ❌ **ANTES**: Título fixo "Editor de Prompt" + "Salvamento automático ativo"
- ✅ **AGORA**: Dropdown interativo com emoji + nome do agente selecionado

### 2️⃣ **Dropdown de Seleção**
```
┌─────────────────────────────────────┐
│ 🤖 Assistente Geral         [Padrão]│
│ 🛠️ Suporte Técnico                  │
│ 💼 Consultor de Vendas              │
│ ✍️ Criador de Conteúdo               │
├─────────────────────────────────────┤
│ + Criar Novo Agente                 │
└─────────────────────────────────────┘
```

### 3️⃣ **Criação de Novo Agente**
- Campo inline no dropdown
- Botões "Criar" / "Cancelar"
- Persistência automática no banco
- Seleção automática após criação

### 4️⃣ **Edição do Nome do Agente**
- Botão de lápis ao lado do nome
- Input inline com foco automático
- Salvar com Enter ou botão ✓
- Cancelar com Escape

### 5️⃣ **Persistência e Sincronização**
- ✅ Estado salvo em `localStorage.selectedAgentId`
- ✅ Carregamento automático do agente ao abrir modal
- ✅ Sincronização de `systemPrompt` e `model` do agente
- ✅ Lista de agentes carregada do backend na inicialização

---

## 🧪 Como Testar

### **Passo 1: Acessar o Modal**
1. Abra a aplicação em: http://demo.idx.ia.br
2. Faça login
3. Clique no ícone de **lápis** (Editor de Prompt) no header

### **Passo 2: Verificar Dropdown**
✅ Deve mostrar emoji + nome do agente atual
✅ Clicar abre lista de agentes disponíveis
✅ Cada agente mostra: emoji, nome, descrição
✅ Agente padrão tem badge "Padrão"

### **Passo 3: Criar Novo Agente**
1. Clique em "+ Criar Novo Agente"
2. Digite um nome (ex: "Revisor de Código")
3. Pressione Enter ou clique "Criar"
✅ Agente deve aparecer na lista imediatamente
✅ Deve ser selecionado automaticamente

### **Passo 4: Editar Nome do Agente**
1. Com um agente selecionado, clique no ícone de lápis
2. Altere o nome
3. Pressione Enter ou clique no ✓
✅ Nome deve ser atualizado no dropdown e no banco

### **Passo 5: Trocar Entre Agentes**
1. Abra o dropdown
2. Selecione outro agente
✅ Emoji e nome devem mudar no header
✅ Prompt deve carregar o `systemPrompt` do agente
✅ Modelo LLM deve carregar do agente

### **Passo 6: Verificar Persistência**
1. Selecione um agente qualquer
2. Feche o modal
3. Recarregue a página (F5)
4. Abra o modal novamente
✅ Deve manter o mesmo agente selecionado

---

## 📊 Dados de Teste no Banco

### **Agentes Pré-criados (via migration)**
```sql
INSERT INTO ai_agents (id, name, emoji, description, system_prompt, temperature, model, color, is_default)
VALUES 
  ('agent_general', '🤖', 'Assistente Geral', 'Assistente versátil...', 0.7, 'llama-3.1-8b-instant', '#3b82f6', 1),
  ('agent_support', '🛠️', 'Suporte Técnico', 'Especialista em...', 0.5, 'llama-3.1-8b-instant', '#10b981', 0),
  ('agent_sales', '💼', 'Consultor de Vendas', 'Focado em...', 0.6, 'llama-3.1-8b-instant', '#f59e0b', 0),
  ('agent_writer', '✍️', 'Criador de Conteúdo', 'Especialista em...', 0.8, 'llama-3.1-8b-instant', '#8b5cf6', 0);
```

### **Verificar via SQL**
```bash
sqlite3 database/data.db "SELECT id, name, emoji, is_default FROM ai_agents;"
```

---

## 🔍 Debug via Console

### **Carregar Agentes**
```javascript
// Deve aparecer no console ao carregar a página:
✅ 4 agentes carregados
```

### **Criar Agente**
```javascript
// Ao criar novo agente:
✅ Agente criado: Revisor de Código
```

### **Atualizar Agente**
```javascript
// Ao editar nome:
✅ Agente atualizado: Revisor de Código Sênior
```

---

## 🎯 Casos de Borda

### **Sem Agentes no Banco**
✅ Dropdown mostra: "Nenhum agente criado ainda"
✅ Botão "+ Criar Novo Agente" sempre visível

### **Primeiro Acesso (sem localStorage)**
✅ Seleciona automaticamente o agente padrão
✅ Se não houver padrão, seleciona o primeiro da lista

### **Agente Deletado (ID inválido no localStorage)**
✅ Limpa seleção inválida
✅ Mostra "Selecione um agente"

---

## 📦 Arquivos Modificados

1. ✅ `src/components/PromptEditorModal.tsx` - UI do dropdown
2. ✅ `src/App.tsx` - Estados e handlers de agentes
3. ✅ `src/types/index.ts` - Interface `Agent`
4. ✅ `database/migrations/001_multi_agents.sql` - Schema do banco

---

## 🚀 Próximos Passos (Melhorias Futuras)

- [ ] Adicionar seletor de cor do agente no dropdown
- [ ] Permitir editar emoji do agente
- [ ] Mostrar estatísticas de uso do agente (total de mensagens)
- [ ] Filtrar RAGs por agente (permissões granulares)
- [ ] Importar/exportar configurações de agentes
