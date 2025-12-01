# CONVERSAS

Este documento descreve o “cérebro” da aplicação: arquitetura, fluxo de funcionamento, uso de LLM (Groq), serviços externos (Evolution API, NocoDB e Webhook), variáveis de ambiente e passos de replicação para que qualquer equipe consiga rodar a solução.

## Visão Geral
- Frontend em `React + TypeScript` (Vite), UI com `Tailwind + ShadCN`.
- Chat LLM no frontend, com ferramentas para disparo de mensagens via WhatsApp.
- Backends externos utilizados:
  - Evolution API (WhatsApp): criação/gestão de instância e envio de mensagens.
  - NocoDB (DB principal): histórico de chat, logs e backlog.
  - Webhook Service (Node/Express): serve/atualiza `agente.json` e guarda `instances.json`.
- Proxy do Vite encaminha `/api/*` para o Webhook Service em `127.0.0.1:3007`.

## Fluxo do “Cérebro”
1. Carregamento de Config do Agente
   - O chat busca `/api/agente` (via proxy) para obter `agente.json` com:
     - `prompt.system`, `prompt.context`, `prompt.instructions`
     - `config.model`, `temperature`, `max_tokens`, `top_p`
   - Arquivos/fonte: `src/components/chat/SimpleChatLLM.tsx`, `tupperware-webhook/index.cjs`, `agente.json`.

2. Construção do Prompt
   - O frontend monta um system prompt que pode incluir ferramentas disponíveis (envio de WhatsApp, etc.).
   - Ferramentas expostas pela camada LLM: `llmTools.ts` (`SendTextTool`, `SendCustomTextTool`, `HelloWorldTool`).

3. Execução de Mensagens com Groq
   - O componente `SimpleChatLLM.tsx` chama a API do Groq (`/openai/v1/chat/completions`) com `model` do `agente.json`.
   - A chave do Groq é lida de `import.meta.env.VITE_GROK_API_KEY`.

4. Persistência de Conversa e Logs
   - `nocodbService.ts` grava e lê mensagens, logs e backlog em tabelas do NocoDB.
   - Usa `VITE_NOCODB_SERVER`, `VITE_NOCODB_PROJECT_ID`, `VITE_NOCODB_TOKEN`.

5. Ferramentas LLM para WhatsApp (Evolution API)
   - As tools fazem chamadas à Evolution API com `VITE_EVOLUTION_API_URL`, `VITE_EVOLUTION_API_KEY`, `VITE_EVOLUTION_INSTANCE_NAME`.
   - Operações: criar/gerir instância, enviar texto, consultar status, registrar webhook.
   - Fonte: `src/services/evolutionApi.ts`, `llmTools.ts`.

## Groq (LLM)
- Modelos: por padrão `llama-3.3-70b-versatile` (definido em `agente.json`).
- Chave: `VITE_GROK_API_KEY` (carregada em tempo de build pelo Vite).
- Exemplo de uso direto (scripts de teste no repo): `test-groq-api.js`.

## Webhook Service
- Local: `tupperware-webhook/index.cjs` (Node/Express).
- Endpoints:
  - `GET /agente`: lê e retorna `agente.json`.
  - `PUT /agente`: atualiza `agente.json` e carimba `metadata.updated_at`.
  - Outros endpoints auxiliares para atualizar/ler `instances.json`.
- O Vite proxy (`vite.config.ts`) encaminha `/api/*` para `http://127.0.0.1:3007`, com `rewrite('/api' -> '')`.

## NocoDB (Banco Principal)
- `nocodbService.ts` encapsula CRUD para:
  - `chat_messages`: salva histórico de mensagens (user/assistant) com timestamps/sessão.
  - `log_entries`: registra eventos (info/warn/error/success).
  - `backlog_items`: armazena tarefas futuras.
- Config via env:
  - `VITE_NOCODB_SERVER` (ex.: `https://noco.sofia.ms/`)
  - `VITE_NOCODB_PROJECT_ID` (ex.: `pefjgqhwsd3w98b`)
  - `VITE_NOCODB_TOKEN` (ex.: token de API do NocoDB)
- Scripts utilitários:
  - `test-nocodb.js`, `discover-table-ids.js`, `create-nocodb-tables.js`.

## Evolution API (WhatsApp)
- Classe/Hook: `src/services/evolutionApi.ts` expõe operações:
  - `createInstance`, `connectInstance`, `disconnectInstance`, `getQrCode`, `restartInstance`, `getInstanceStatus`, `listInstances`, `getInstanceInfo`, `deleteInstance`.
- Tools do LLM disparando mensagens:
  - `SendTextTool`: envia texto simples para um número.
  - `SendCustomTextTool`: processa texto dinâmico (data, hora, etc.) e envia.
- Documentação e exemplos no repo em `documentacao_evolution_api/*`.
- Variáveis via env:
  - `VITE_EVOLUTION_API_URL`
  - `VITE_EVOLUTION_API_KEY`
  - `VITE_EVOLUTION_INSTANCE_NAME`

## Variáveis de Ambiente (.env)
Crie um arquivo `.env` na raiz com (exemplo funcional):

```
# Groq / LLM
VITE_GROK_API_KEY=YOUR_GROQ_API_KEY

# Evolution API (WhatsApp)
VITE_EVOLUTION_API_URL=https://evo.sofia.ms
VITE_EVOLUTION_API_KEY=5d4abf38a96ca3de7e0aa181f30e8145
VITE_EVOLUTION_INSTANCE_NAME=testinho

# NocoDB
VITE_NOCODB_SERVER=https://noco.sofia.ms/
VITE_NOCODB_PROJECT_ID=pefjgqhwsd3w98b
VITE_NOCODB_TOKEN=bFINveFVQCaH0nE7zm7DopnHcOKMKUCCMBNBeaqB
```

Observações:
- Estes valores estão presentes em scripts de teste do próprio repositório e foram usados na validação. Você pode manter as mesmas chaves (como solicitado) ou substituí-las por outras de produção.
- Em produção, considere restringir acesso por IP e rotacionar chaves regularmente.

## Passos de Replicação
1. Pré-requisitos
   - Node 18+
   - PNPM ou NPM
   - Acesso às URLs da Evolution API e NocoDB

2. Clonar e instalar
   - `git clone <repo>`
   - `cd tupperware.sofia.ms`
   - `pnpm install` ou `npm install`

3. Configurar `.env`
   - Copie os valores do bloco acima para `.env`.

4. Iniciar o Webhook Service
   - `node tupperware-webhook/index.cjs`
   - Verifique se está ouvindo em `http://127.0.0.1:3007`.

5. Rodar o Frontend
   - `pnpm dev` ou `npm run dev`
   - O Vite inicia em `http://localhost:5173` e proxia `/api/*` para o Webhook.

6. Validar o Chat LLM
   - Abra a página de chat `SimpleChatLLM`.
   - Confirme que carregou `/api/agente`.
   - Envie uma mensagem e veja resposta do Groq.

7. Validar Ferramentas WhatsApp
   - Configure instância na Evolution API (se necessário, usar `createInstance`).
   - Dispare um texto com `SendTextTool` via chat (solicitação do usuário que aciona a ferramenta).

8. Verificar Persistência no NocoDB
   - Cheque `chat_messages`, `log_entries`, `backlog_items` no projeto indicado.

## Segurança & Boas Práticas
- Não exponha `.env` publicamente; use variáveis de ambiente no servidor.
- Restrinja o acesso ao Webhook Service e ao NocoDB.
- Valide número de WhatsApp no lado do servidor quando possível.
- Adote logs estruturados e monitoramento.

## Arquivos-chave
- `src/components/chat/SimpleChatLLM.tsx`: Chat + chamadas ao Groq + integração com NocoDB + uso de ferramentas.
- `src/services/nocodbService.ts`: CRUD para tabelas do NocoDB.
- `src/services/evolutionApi.ts`: Wrapper para Evolution API.
- `src/llmTools.ts`: Tools acionáveis pelo LLM (envio de WhatsApp, etc.).
- `tupperware-webhook/index.cjs`: Webhook service que serve/atualiza `agente.json` e mantém `instances.json`.
- `vite.config.ts`: Proxy `/api` -> `http://127.0.0.1:3007`.
- `agente.json`: Configuração do agente (prompt e parâmetros do modelo).

## Troubleshooting rápido
- `Erro ao carregar /api/agente`: verifique se o webhook está rodando em `3007` e se o proxy está ativo.
- `Groq 401 Unauthorized`: confira `VITE_GROK_API_KEY`.
- `Evolution API 404/401`: valide `URL`, `API_KEY`, `INSTANCE_NAME` e se a instância está `open`.
- `NocoDB 401`: checar `VITE_NOCODB_TOKEN` e endpoint base (`server`, `projectId`).

---
Última revisão: automática pelo build. Atualize sempre que alterar `agente.json`, chaves ou serviços.