# Migração para Meta API - WhatsApp Business

## Visão Geral

Este documento descreve a migração do painel de Campanhas da Evolution API para a Meta API (WhatsApp Business oficial). A implementação permite que os usuários escolham entre as duas APIs para envio de mensagens em massa.

## O que foi implementado

### 1. Serviço da Meta API (`src/services/metaWhatsAppApi.ts`)

- Implementação completa da API oficial do WhatsApp Business da Meta
- Suporte para envio de mensagens de texto, templates, imagens e documentos
- Upload de mídia para a plataforma da Meta
- Validação de configuração e tratamento de erros
- Hook React para fácil integração com componentes

### 2. Componente de Configuração (`src/components/MetaWhatsAppConfig.tsx`)

- Interface para configuração das credenciais da Meta API
- Validação em tempo real das configurações
- Teste de conexão com a API
- Instruções detalhadas para obtenção das credenciais

### 3. Painel de Campanhas da Meta API (`src/components/tabs/MetaCampanhasTab.tsx`)

- Interface completa para criação e gerenciamento de campanhas
- Gestão de contatos com importação/exportação
- Envio de mensagens em massa com progresso em tempo real
- Relatórios de entrega e estatísticas
- Armazenamento local de campanhas e contatos

### 4. Seletor de API (`src/components/APISelector.tsx`)

- Interface para escolha entre Evolution API e Meta API
- Informações sobre as diferenças entre as APIs
- Design responsivo e intuitivo

### 5. Painel Unificado de Campanhas (`src/components/tabs/UnifiedCampanhasTab.tsx`)

- Integração do seletor de API com os painéis de campanhas
- Placeholder para a Evolution API (em desenvolvimento)
- Transição suave entre as APIs

### 6. Integração com a Interface Principal

- Adição de uma nova aba "Campanhas" no painel "Gestão de Envio"
- Atualização das variáveis de ambiente no arquivo `.env`
- Manutenção da compatibilidade com a funcionalidade existente

## Como usar

### 1. Configurar a Meta API

1. Acesse a aba "Campanhas" no painel "Gestão de Envio"
2. Clique na aba "Configuração"
3. Preencha os campos obrigatórios:
   - **Access Token**: Token de acesso da Meta API
   - **Phone Number ID**: ID do número de telefone do WhatsApp Business
4. Clique em "Testar Conexão" para verificar se as configurações estão corretas
5. Salve as configurações

### 2. Obter Credenciais da Meta API

1. Crie uma conta no [Meta for Developers](https://developers.facebook.com/)
2. Crie um aplicativo do tipo "Business"
3. Adicione o produto "WhatsApp" ao seu aplicativo
4. Configure um número de telefone do WhatsApp Business
5. Obtenha o Access Token e o Phone Number ID

### 3. Criar e Enviar Campanhas

1. Na aba "Campanhas", crie uma nova campanha preenchendo:
   - Nome da campanha
   - Mensagem a ser enviada
   - Data e hora de agendamento (opcional)
2. Na aba "Contatos", adicione ou importe os contatos para os quais deseja enviar
3. Selecione os contatos que receberão a campanha
4. Volte para a aba "Campanhas", selecione a campanha criada e clique em "Enviar Campanha"

### 4. Gerenciar Contatos

1. Na aba "Contatos", você pode:
   - Adicionar contatos manualmente
   - Importar contatos de um arquivo JSON ou CSV
   - Exportar contatos para um arquivo JSON
   - Selecionar todos os contatos ou selecionar individualmente
   - Excluir contatos

## Diferenças entre Evolution API e Meta API

| Característica | Evolution API | Meta API |
|----------------|---------------|----------|
| Tipo | Terceiros | Oficial |
| Estabilidade | Variável | Alta |
| Suporte | Comunidade | Meta |
| Limites | Definidos pelo servidor | Definidos pela Meta |
| Custo | Variável | Gratuito com limites |
| Recursos | Mais flexíveis | Padrão da Meta |
| Configuração | Requer servidor próprio | Configuração via Meta |

## Variáveis de Ambiente

As seguintes variáveis de ambiente foram adicionadas ao arquivo `.env`:

```env
# Meta WhatsApp API Configuration
VITE_META_WHATSAPP_ACCESS_TOKEN=
VITE_META_WHATSAPP_PHONE_NUMBER_ID=
VITE_META_WHATSAPP_API_VERSION=v18.0
VITE_META_WHATSAPP_BASE_URL=https://graph.facebook.com
```

## Próximos Passos

1. Implementar o painel completo para a Evolution API
2. Adicionar suporte para templates de mensagens da Meta API
3. Implementar métricas avançadas de campanhas
4. Adicionar suporte para webhooks da Meta API
5. Criar documentação detalhada para desenvolvedores

## Troubleshooting

### Problemas Comuns

1. **Erro de autenticação**: Verifique se o Access Token está correto e não expirou
2. **Phone Number ID inválido**: Confirme se o ID está correto e corresponde ao número configurado
3. **Mensagens não enviadas**: Verifique se o número de telefone está no formato correto (com código do país e DDD)
4. **Limites excedidos**: A Meta API tem limites diários de envio, aguarde 24 horas

### Logs e Depuração

O serviço da Meta API inclui logs detalhados que podem ser visualizados no console do navegador. Em caso de problemas, verifique o console para mensagens de erro.

## Suporte

Para dúvidas ou problemas relacionados à implementação, consulte:
- [Documentação oficial da Meta API para WhatsApp](https://developers.facebook.com/docs/whatsapp/)
- [Guia de início rápido da Meta API](https://developers.facebook.com/docs/whatsapp/getting-started/)
- [Referência da API do WhatsApp Business](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/)