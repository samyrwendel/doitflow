# Painel de Dispositivos WhatsApp (WAHA)

## 📱 Visão Geral

O painel de **Dispositivos** permite conectar e gerenciar múltiplas instâncias do WhatsApp através da API WAHA (WhatsApp HTTP API).

## 🔧 Configuração

### Credenciais WAHA
- **URL Base**: `https://waha.cpnl.sofia.ms`
- **API Key**: `261d1d2b6b104e458002957a6495ddc3`
- **Dashboard/Swagger**: 
  - Usuário: `admin`
  - Senha: `5ccebb03cf1545af839ede492598335c`

## 🚀 Funcionalidades Implementadas

### ✅ Criar Nova Instância
1. Digite o nome da instância (ex: `meu-whatsapp`)
2. Clique em **Criar**
3. Aguarde o QR Code ser gerado

**Regras para nomes:**
- Apenas letras minúsculas
- Números permitidos
- Use hífens para separar palavras
- Exemplo: `whatsapp-vendas`, `atendimento-1`

### ✅ Escanear QR Code
1. Após criar a instância, clique em **Ver QR Code**
2. Escaneie o código com o WhatsApp do seu celular
3. Vá em: **Configurações > Aparelhos conectados > Conectar um aparelho**
4. Aponte a câmera para o QR Code na tela

### ✅ Status das Instâncias

| Status | Significado | Cor |
|--------|-------------|-----|
| **WORKING** | Conectado e funcionando | 🟢 Verde |
| **SCAN_QR_CODE** | Aguardando leitura do QR | 🟡 Amarelo |
| **FAILED** | Falhou na conexão | 🔴 Vermelho |
| **STOPPED** | Instância parada | ⚫ Cinza |

### ✅ Listar Instâncias
- Visualize todas as instâncias criadas
- Veja o status em tempo real
- Nome do dispositivo conectado (se disponível)

### ✅ Excluir Instância
1. Clique no ícone 🗑️ ao lado da instância
2. Confirme a exclusão
3. A instância será removida permanentemente

### ✅ Atualizar Lista
- Clique no ícone 🔄 no canto superior direito
- Atualiza o status de todas as instâncias

## 📚 Documentação da API WAHA

### Endpoints Utilizados

#### 1. Listar Sessões
```http
GET /api/sessions
Headers:
  X-Api-Key: 261d1d2b6b104e458002957a6495ddc3
```

#### 2. Criar Sessão
```http
POST /api/sessions
Headers:
  X-Api-Key: 261d1d2b6b104e458002957a6495ddc3
  Content-Type: application/json
Body:
{
  "name": "meu-whatsapp",
  "config": {
    "webhooks": []
  }
}
```

#### 3. Obter QR Code
```http
GET /api/sessions/{sessionName}/auth/qr
Headers:
  X-Api-Key: 261d1d2b6b104e458002957a6495ddc3
```

#### 4. Excluir Sessão
```http
DELETE /api/sessions/{sessionName}
Headers:
  X-Api-Key: 261d1d2b6b104e458002957a6495ddc3
```

## 🎯 Próximas Funcionalidades (Sugeridas)

- [ ] **Webhooks**: Configurar webhooks para eventos do WhatsApp
- [ ] **Envio de Mensagens**: Interface para enviar mensagens
- [ ] **Histórico**: Visualizar mensagens recebidas
- [ ] **Grupos**: Gerenciar grupos do WhatsApp
- [ ] **Mídia**: Enviar/receber arquivos, imagens, vídeos
- [ ] **Status**: Publicar status/stories
- [ ] **Auto-resposta**: Configurar respostas automáticas

## 🔗 Links Úteis

- [Documentação Oficial WAHA](https://waha.devlike.pro/docs/)
- [API Reference](https://waha.devlike.pro/docs/how-to/send-messages)
- [Webhooks Guide](https://waha.devlike.pro/docs/how-to/webhooks)

## ⚠️ Observações Importantes

1. **Persistência**: As instâncias são salvas no servidor WAHA e persistem entre reinicializações
2. **Múltiplas Instâncias**: Você pode ter várias instâncias simultâneas
3. **Segurança**: A API Key está configurada diretamente no código (considere usar variáveis de ambiente em produção)
4. **Rate Limiting**: WhatsApp pode bloquear números que enviam muitas mensagens em curto período
5. **Sessões**: Mantenha a sessão ativa no celular para evitar desconexões

## 🛠️ Troubleshooting

### QR Code não aparece
- Clique em **Atualizar** e tente novamente
- Verifique se a instância está no status `SCAN_QR_CODE`

### Instância fica em FAILED
- Exclua a instância e crie novamente
- Verifique se o WhatsApp do celular está atualizado

### Desconexão frequente
- Mantenha o WhatsApp do celular com bateria
- Não desconecte manualmente do celular
- Evite usar o mesmo número em múltiplas instâncias

## 📝 Exemplo de Uso

```typescript
// Criar instância
const session = {
  name: "vendas-whatsapp",
  config: {
    webhooks: [
      {
        url: "https://seu-servidor.com/webhook",
        events: ["message"]
      }
    ]
  }
}

// Enviar mensagem (futuro)
await fetch('https://waha.cpnl.sofia.ms/api/sendText', {
  method: 'POST',
  headers: {
    'X-Api-Key': '261d1d2b6b104e458002957a6495ddc3',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    session: "vendas-whatsapp",
    chatId: "5511999999999@c.us",
    text: "Olá! Como posso ajudar?"
  })
})
```

## ✅ Status da Implementação

- ✅ Listagem de instâncias
- ✅ Criação de instâncias
- ✅ Exibição de QR Code
- ✅ Exclusão de instâncias
- ✅ Status em tempo real
- ✅ Interface responsiva
- ✅ Tratamento de erros
- ⏳ Envio de mensagens (próxima fase)
- ⏳ Webhooks (próxima fase)
- ⏳ Histórico de mensagens (próxima fase)
