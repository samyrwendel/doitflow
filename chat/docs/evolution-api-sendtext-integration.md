# Integração Evolution API - Envio de Texto Automático

## Visão Geral

Esta funcionalidade permite que a LLM utilize o endpoint `/message/sendText/{instance}` da Evolution API para enviar mensagens de texto automaticamente quando receber instruções apropriadas.

## Configuração

### Aba de Configuração

Na aba "Configuração" da aplicação, foi adicionada uma nova seção chamada "Configurações Evolution API" que contém:

- **Toggle "Envio de Texto Automático"**: Permite ativar/desativar a funcionalidade
- **Descrição**: Explica o que a funcionalidade faz
- **Detalhes técnicos**: Mostra o endpoint utilizado

### Interface ConfigData

Foi adicionado o campo `sendTextEnabled: boolean` à interface `ConfigData` para armazenar o estado do toggle.

## Endpoint da Evolution API

### Documentação do Endpoint

**Método:** POST  
**Endpoint:** `/message/sendText/{instance}`

### Parâmetros

```json
{
  "number": "<string>",
  "text": "<string>",
  "delay": 123,
  "linkPreview": true,
  "mentionsEveryOne": true,
  "mentioned": [
    "{{remoteJID}}"
  ],
  "quoted": {
    "key": {
      "id": "<string>"
    },
    "message": {
      "conversation": "<string>"
    }
  }
}
```

### Resposta de Sucesso (201)

```json
{
  "key": {
    "remoteJid": "553198296801@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE594145F4C59B4"
  },
  "message": {
    "extendedTextMessage": {
      "text": "Olá!"
    }
  },
  "messageTimestamp": "1717689097",
  "status": "PENDING"
}
```

## Como a LLM Deve Considerar Esta Funcionalidade

### Quando o Toggle Está Ativado

Quando `sendTextEnabled` estiver `true`, a LLM deve:

1. **Reconhecer instruções de envio**: Identificar quando o usuário solicita o envio de mensagens de texto
2. **Utilizar o endpoint**: Fazer chamadas para `/message/sendText/{instance}` quando apropriado
3. **Validar parâmetros**: Garantir que os parâmetros necessários estejam disponíveis:
   - `number`: Número do destinatário
   - `text`: Conteúdo da mensagem
   - `instance`: Instância configurada

### Quando o Toggle Está Desativado

Quando `sendTextEnabled` estiver `false`, a LLM deve:

1. **Não utilizar o endpoint**: Não fazer chamadas para envio de texto
2. **Informar limitação**: Explicar ao usuário que a funcionalidade está desabilitada
3. **Sugerir ativação**: Orientar o usuário a ativar o toggle na aba de configuração

## Exemplos de Uso

### Instrução do Usuário
```
"Envie uma mensagem para o número 5511999999999 com o texto 'Olá, como você está?'"
```

### Resposta da LLM (quando ativado)
```
Vou enviar a mensagem para o número especificado usando a Evolution API.

[Chamada para /message/sendText/{instance} com os parâmetros apropriados]

Mensagem enviada com sucesso!
```

### Resposta da LLM (quando desativado)
```
A funcionalidade de envio automático de texto está desabilitada. 
Para ativar, vá até a aba "Configuração" > "Configurações Evolution API" 
e ative o toggle "Envio de Texto Automático".
```

## Considerações de Segurança

- A funcionalidade só deve ser utilizada quando explicitamente ativada pelo usuário
- Validar sempre os números de telefone antes do envio
- Respeitar limites de rate limiting da API
- Não enviar mensagens spam ou não solicitadas

## Implementação Técnica

### Arquivos Modificados

- `src/components/tabs/ConfigurationTab.tsx`: Adicionado toggle e interface
- Interface `ConfigData`: Adicionado campo `sendTextEnabled`
- Função `onFieldChange`: Modificada para aceitar valores boolean

### Componentes Utilizados

- `Switch` do `@/components/ui/switch`
- `Card` para layout
- `MessageSquare` icon do `lucide-react`