# Funcionalidade de Envio de Textos Personalizados

## 📋 Visão Geral

Esta funcionalidade permite que o sistema envie textos personalizados via WhatsApp com informações dinâmicas como data e hora atual, baseado em comandos de linguagem natural.

## 🎯 Objetivo

Permitir que usuários solicitem o envio de informações específicas (como data atual) para números de telefone através de comandos naturais como:
- "Envie a data de hoje para o numero 67991257171"
- "Manda a hora atual para 5567991257171"

## 🔧 Implementação Técnica

### 1. Nova Ferramenta: `SendCustomTextTool`

**Arquivo:** `src/services/llmTools.ts`

```typescript
class SendCustomTextTool implements LLMTool {
  name = 'send_custom_text';
  description = 'Envia texto personalizado via WhatsApp com informações dinâmicas';
  
  parameters = {
    type: 'object',
    properties: {
      phoneNumber: {
        type: 'string',
        description: 'Número de telefone no formato internacional (ex: 5567991257171)'
      },
      message: {
        type: 'string', 
        description: 'Mensagem a ser enviada. Use {data_atual} para data e {hora_atual} para hora'
      }
    },
    required: ['phoneNumber', 'message']
  };
}
```

#### Funcionalidades da Ferramenta:

- **Processamento de Texto Dinâmico:** Substitui placeholders por informações reais
  - `{data_atual}` → Data atual no formato brasileiro (DD/MM/AAAA)
  - `{hora_atual}` → Hora atual no formato 24h (HH:MM)

- **Formatação Automática de Números:** Adiciona código do país (55) se necessário

- **Integração com WhatsApp:** Utiliza o `EvolutionApiService` existente

### 2. Configuração do Agente

**Arquivo:** `agente.json`

Adicionadas instruções específicas para reconhecimento de intenção:

```json
{
  "instructions": [
    "Use a ferramenta send_custom_text quando detectar solicitações para enviar informações específicas:",
    "1. Pedidos para enviar data atual (ex: 'envia a data de hoje para 67991257171')",
    "2. Pedidos para enviar hora atual (ex: 'envia a hora atual para', 'manda que horas são')",
    "3. Pedidos para enviar informações dinâmicas (ex: 'envia o status para')",
    "4. Sempre extraia o número de telefone da mensagem e formate corretamente",
    "5. Para data, use formato brasileiro (DD/MM/AAAA). Para hora, use formato 24h (HH:MM)"
  ]
}
```

### 3. Registro da Ferramenta

A ferramenta foi registrada no `LLMToolManager`:

```typescript
constructor() {
  this.registerTool(new SendTextTool());
  this.registerTool(new SendCustomTextTool()); // ← Nova ferramenta
  this.registerTool(new HelloWorldTool());
}
```

## 🚀 Como Usar

### Exemplos de Comandos Suportados:

1. **Envio de Data:**
   - "Envie a data de hoje para o numero 67991257171"
   - "Manda a data atual para 5567991257171"
   - "Dispara a data de hoje para o cliente"

2. **Envio de Hora:**
   - "Envia a hora atual para 67991257171"
   - "Manda que horas são para o número"
   - "Dispara a hora para 5567991257171"

3. **Informações Dinâmicas:**
   - "Envia uma atualização para o cliente"
   - "Manda o status atual para 67991257171"

### Processamento Automático:

1. **Extração do Número:** O sistema identifica automaticamente o número de telefone na mensagem
2. **Formatação:** Adiciona o código do país (55) se necessário
3. **Substituição de Placeholders:** Converte `{data_atual}` e `{hora_atual}` para valores reais
4. **Envio via WhatsApp:** Utiliza a API Evolution para enviar a mensagem

## 📱 Formato de Saída

- **Data:** DD/MM/AAAA (ex: 30/09/2025)
- **Hora:** HH:MM (ex: 23:45)
- **Número:** Formato internacional com código do país (ex: 5567991257171)

## 🔒 Segurança

- Validação automática de números de telefone
- Formatação segura de dados dinâmicos
- Integração com sistema de autenticação existente
- Logs de todas as operações de envio

## 🧪 Testes

A funcionalidade foi testada com:
- ✅ Reconhecimento de intenção para diferentes variações de comando
- ✅ Formatação correta de números de telefone
- ✅ Substituição adequada de placeholders
- ✅ Integração com Evolution API
- ✅ Interface sem erros após implementação

## 📝 Notas Técnicas

- A ferramenta reutiliza a infraestrutura existente do `EvolutionApiService`
- Mantém compatibilidade com todas as funcionalidades anteriores
- Não requer alterações na interface do usuário
- Funciona através do chat LLM existente

## 🔄 Histórico de Versões

**v1.0.0** - 30/09/2025
- Implementação inicial da funcionalidade
- Suporte para data e hora atual
- Integração com Evolution API
- Documentação completa

---

*Esta funcionalidade foi implementada seguindo as melhores práticas de segurança e mantendo a compatibilidade com o sistema existente.*