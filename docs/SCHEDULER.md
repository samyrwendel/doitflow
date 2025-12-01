# Sistema de Agendamento de Agentes (Agent Scheduler)

## Visao Geral

O sistema de agendamento permite automatizar o envio de mensagens WhatsApp para membros da equipe em horarios especificos, coletando respostas e extraindo atividades utilizando IA.

### Caso de Uso Principal

- **Inicio do Dia**: Enviar mensagem perguntando quais atividades o funcionario planeja realizar
- **Fim do Dia**: Enviar mensagem perguntando o que foi concluido e o que ficou pendente
- **Follow-up Automatico**: Se o funcionario nao responder, enviar lembretes automaticos
- **Analise com IA**: Extrair atividades planejadas/concluidas das respostas usando Gemini AI

---

## Arquitetura

### Componentes Principais

```
scheduler.cjs
├── AgentScheduler (Classe principal)
│   ├── Gerenciamento de Membros da Equipe
│   ├── Gerenciamento de Agendamentos
│   ├── Disparo Automatico de Mensagens
│   ├── Follow-ups e Retry
│   ├── Analise de Respostas com IA
│   └── Estatisticas e Relatorios
│
└── createSchedulerRoutes (Express Router)
    └── REST API para todas as operacoes
```

### Tabelas do Banco de Dados

| Tabela | Descricao |
|--------|-----------|
| `team_members` | Membros da equipe (nome, telefone, cargo) |
| `agent_schedules` | Configuracoes de agendamentos |
| `schedule_executions` | Historico de execucoes |
| `team_activities` | Atividades extraidas das respostas |
| `schedule_message_templates` | Templates de mensagens |

---

## Constantes

### Tipos de Agendamento (SCHEDULE_TYPES)

```javascript
const SCHEDULE_TYPES = {
  DAILY_START: 'daily_start',   // Inicio do dia
  DAILY_END: 'daily_end',       // Fim do dia
  WEEKLY: 'weekly',             // Semanal
  CUSTOM: 'custom'              // Personalizado
};
```

### Status de Execucao (EXECUTION_STATUS)

```javascript
const EXECUTION_STATUS = {
  PENDING: 'pending',                   // Aguardando disparo
  SENT: 'sent',                         // Mensagem enviada
  AWAITING_RESPONSE: 'awaiting_response', // Aguardando resposta
  RESPONDED: 'responded',               // Resposta recebida
  NO_RESPONSE: 'no_response',           // Sem resposta (timeout)
  POSTPONED: 'postponed',               // Adiado
  COMPLETED: 'completed',               // Concluido
  FAILED: 'failed'                      // Falha
};
```

---

## Classe AgentScheduler

### Construtor

```javascript
class AgentScheduler {
  constructor(db, getEvolutionConfig, sendWhatsAppMessage) {
    this.db = db;                               // Banco de dados SQLite
    this.getEvolutionConfig = getEvolutionConfig; // Funcao para obter config da Evolution API
    this.sendWhatsAppMessage = sendWhatsAppMessage; // Funcao para enviar WhatsApp
    this.checkInterval = null;                  // Intervalo de verificacao
    this.isRunning = false;                     // Status do scheduler

    // Configuracao da IA para analise de respostas
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    this.genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    this.aiModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
}
```

---

## Gerenciamento de Membros da Equipe

### Criar Membro

```javascript
async createTeamMember(userId, data) {
  // data = { name, phone_number, role, department, timezone, metadata }
  const id = `tm_${uuidv4()}`;

  await this.db.run(`
    INSERT INTO team_members (id, user_id, name, phone_number, role, department, timezone, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, userId, data.name, data.phone_number, data.role, data.department,
      data.timezone || 'America/Sao_Paulo', JSON.stringify(data.metadata || {})]);

  return this.getTeamMember(id);
}
```

### Listar Membros

```javascript
async listTeamMembers(userId) {
  return this.db.all(
    'SELECT * FROM team_members WHERE user_id = ? AND is_active = 1 ORDER BY name',
    [userId]
  );
}
```

### Atualizar Membro

```javascript
async updateTeamMember(id, data) {
  // Campos atualizaveis: name, phone_number, role, department, timezone, is_active, metadata
  // Constroi query dinamicamente baseado nos campos fornecidos
}
```

### Deletar Membro (Soft Delete)

```javascript
async deleteTeamMember(id) {
  await this.db.run('UPDATE team_members SET is_active = 0 WHERE id = ?', [id]);
}
```

---

## Gerenciamento de Agendamentos

### Criar Agendamento

```javascript
async createSchedule(userId, data) {
  // data = {
  //   device_id,           // ID do dispositivo WhatsApp
  //   team_member_id,      // ID do membro da equipe
  //   name,                // Nome do agendamento
  //   schedule_type,       // Tipo: daily_start, daily_end, weekly, custom
  //   time_of_day,         // Horario: "08:00"
  //   days_of_week,        // Dias: [1,2,3,4,5] (seg-sex)
  //   timezone,            // Timezone: "America/Sao_Paulo"
  //   initial_message,     // Mensagem inicial
  //   followup_message,    // Mensagem de follow-up
  //   reminder_message,    // Mensagem de lembrete
  //   wait_for_response,   // Aguardar resposta: true/false
  //   response_timeout_minutes,   // Timeout em minutos
  //   max_followups,       // Maximo de follow-ups
  //   followup_interval_minutes,  // Intervalo entre follow-ups
  //   use_ai_response,     // Usar IA para analisar: true/false
  //   rag_document_id,     // ID do documento RAG (opcional)
  //   custom_prompt        // Prompt customizado para IA
  // }

  const id = `sched_${uuidv4()}`;
  const nextTrigger = this.calculateNextTrigger(data.time_of_day, data.days_of_week, data.timezone);

  // Insere no banco com todas as configuracoes
  console.log(`[SCHEDULER] Agendamento criado: ${id} - Proximo disparo: ${nextTrigger}`);
  return this.getSchedule(id);
}
```

### Calcular Proximo Disparo

```javascript
calculateNextTrigger(timeOfDay, daysOfWeek, timezone = 'America/Sao_Paulo') {
  const now = new Date();
  const [hours, minutes] = timeOfDay.split(':').map(Number);

  // Criar data de hoje com o horario especificado
  let next = new Date();
  next.setHours(hours, minutes, 0, 0);

  // Se o horario ja passou hoje, comecar de amanha
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  // Encontrar proximo dia valido da semana
  const days = Array.isArray(daysOfWeek) ? daysOfWeek : JSON.parse(daysOfWeek || '[1,2,3,4,5]');

  if (days.length > 0) {
    let attempts = 0;
    while (!days.includes(next.getDay()) && attempts < 7) {
      next.setDate(next.getDate() + 1);
      attempts++;
    }
  }

  return next.toISOString();
}
```

---

## Execucao de Agendamentos

### Verificacao Periodica

```javascript
async checkAndTriggerSchedules() {
  if (!this.isRunning) return;

  try {
    const now = new Date().toISOString();

    // Buscar agendamentos que precisam ser disparados
    const dueSchedules = await this.db.all(`
      SELECT s.*, t.name as team_member_name, t.phone_number, d.name as device_name
      FROM agent_schedules s
      JOIN team_members t ON s.team_member_id = t.id
      JOIN whatsapp_devices d ON s.device_id = d.id
      WHERE s.is_active = 1
      AND s.next_trigger_at <= ?
      AND t.is_active = 1
    `, [now]);

    for (const schedule of dueSchedules) {
      await this.triggerSchedule(schedule);
    }

    // Verificar follow-ups pendentes
    await this.checkPendingFollowups();

  } catch (error) {
    console.error('[SCHEDULER] Erro no check:', error);
  }
}
```

### Disparar Agendamento

```javascript
async triggerSchedule(schedule) {
  const executionId = `exec_${uuidv4()}`;

  try {
    console.log(`[SCHEDULER] Disparando: ${schedule.name} para ${schedule.team_member_name}`);

    // Preparar mensagem (substituir variaveis)
    const message = this.prepareMessage(schedule.initial_message, {
      nome: schedule.team_member_name,
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });

    // Criar registro de execucao
    await this.db.run(`
      INSERT INTO schedule_executions (id, schedule_id, team_member_id, status, message_sent, sent_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [executionId, schedule.id, schedule.team_member_id, EXECUTION_STATUS.SENT, message, new Date().toISOString()]);

    // Enviar mensagem via WhatsApp
    const evolutionConfig = await this.getEvolutionConfig();
    await this.sendWhatsAppMessage(schedule.device_name, schedule.phone_number, message, evolutionConfig.apiKey);

    // Atualizar status para aguardando resposta
    if (schedule.wait_for_response) {
      await this.db.run(`
        UPDATE schedule_executions SET status = ? WHERE id = ?
      `, [EXECUTION_STATUS.AWAITING_RESPONSE, executionId]);
    }

    // Atualizar proximo disparo
    const nextTrigger = this.calculateNextTrigger(
      schedule.time_of_day,
      schedule.days_of_week,
      schedule.timezone
    );
    await this.db.run(`
      UPDATE agent_schedules SET last_triggered_at = ?, next_trigger_at = ? WHERE id = ?
    `, [new Date().toISOString(), nextTrigger, schedule.id]);

    console.log(`[SCHEDULER] Mensagem enviada para ${schedule.team_member_name}`);

  } catch (error) {
    console.error(`[SCHEDULER] Erro ao disparar ${schedule.name}:`, error);
    await this.db.run(`
      UPDATE schedule_executions SET status = ?, error_message = ? WHERE id = ?
    `, [EXECUTION_STATUS.FAILED, error.message, executionId]);
  }
}
```

### Substituicao de Variaveis

```javascript
prepareMessage(template, variables) {
  if (!template) return '';

  let message = template;
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
  });
  return message;
}
```

**Variaveis Disponiveis:**
- `{nome}` - Nome do membro da equipe
- `{data}` - Data atual (DD/MM/YYYY)
- `{hora}` - Hora atual (HH:MM)

---

## Sistema de Follow-up

### Verificar Follow-ups Pendentes

```javascript
async checkPendingFollowups() {
  const now = new Date();

  // Buscar execucoes aguardando resposta que excederam o timeout
  const pendingExecutions = await this.db.all(`
    SELECT e.*, s.followup_message, s.max_followups, s.followup_interval_minutes,
           s.device_id, t.name as team_member_name, t.phone_number, d.name as device_name
    FROM schedule_executions e
    JOIN agent_schedules s ON e.schedule_id = s.id
    JOIN team_members t ON e.team_member_id = t.id
    JOIN whatsapp_devices d ON s.device_id = d.id
    WHERE e.status = 'awaiting_response'
    AND e.followup_count < s.max_followups
  `, [EXECUTION_STATUS.AWAITING_RESPONSE]);

  for (const execution of pendingExecutions) {
    const sentAt = new Date(execution.sent_at);
    const lastFollowup = execution.last_followup_at ? new Date(execution.last_followup_at) : sentAt;
    const minutesSinceLastContact = (now - lastFollowup) / (1000 * 60);

    if (minutesSinceLastContact >= execution.followup_interval_minutes) {
      await this.sendFollowup(execution);
    }
  }
}
```

### Enviar Follow-up

```javascript
async sendFollowup(execution) {
  try {
    console.log(`[SCHEDULER] Enviando follow-up #${execution.followup_count + 1} para ${execution.team_member_name}`);

    const message = this.prepareMessage(
      execution.followup_message || 'Ola {nome}, voce conseguiu ver minha mensagem anterior?',
      { nome: execution.team_member_name, ... }
    );

    const evolutionConfig = await this.getEvolutionConfig();
    await this.sendWhatsAppMessage(execution.device_name, execution.phone_number, message, evolutionConfig.apiKey);

    await this.db.run(`
      UPDATE schedule_executions
      SET followup_count = followup_count + 1, last_followup_at = ?
      WHERE id = ?
    `, [new Date().toISOString(), execution.id]);

    // Se atingiu maximo de follow-ups, marcar como sem resposta
    if (execution.followup_count + 1 >= execution.max_followups) {
      await this.db.run(`
        UPDATE schedule_executions SET status = ?, completed_at = ? WHERE id = ?
      `, [EXECUTION_STATUS.NO_RESPONSE, new Date().toISOString(), execution.id]);
    }

  } catch (error) {
    console.error(`[SCHEDULER] Erro ao enviar follow-up:`, error);
  }
}
```

---

## Processamento de Respostas com IA

### Processar Resposta Recebida

```javascript
async processIncomingResponse(phoneNumber, messageText, deviceName) {
  // Buscar execucao pendente para este numero
  const pendingExecution = await this.db.get(`
    SELECT e.*, s.use_ai_response, s.custom_prompt, s.rag_document_id, s.user_id,
           t.name as team_member_name
    FROM schedule_executions e
    JOIN agent_schedules s ON e.schedule_id = s.id
    JOIN team_members t ON e.team_member_id = t.id
    WHERE t.phone_number LIKE ?
    AND e.status = 'awaiting_response'
    ORDER BY e.sent_at DESC
    LIMIT 1
  `, [`%${phoneNumber.slice(-11)}%`]);

  if (!pendingExecution) {
    return null; // Nao e resposta a um agendamento
  }

  // Atualizar execucao com a resposta
  await this.db.run(`
    UPDATE schedule_executions
    SET response_received = ?, responded_at = ?, status = ?
    WHERE id = ?
  `, [messageText, new Date().toISOString(), EXECUTION_STATUS.RESPONDED, pendingExecution.id]);

  // Analisar resposta com IA se configurado
  if (pendingExecution.use_ai_response) {
    const analysis = await this.analyzeResponse(pendingExecution, messageText);

    // Salvar analise
    await this.db.run(`
      UPDATE schedule_executions SET ai_analysis = ? WHERE id = ?
    `, [JSON.stringify(analysis), pendingExecution.id]);

    // Extrair e salvar atividades
    if (analysis.activities && analysis.activities.length > 0) {
      await this.saveExtractedActivities(pendingExecution, analysis.activities);
    }
  }

  return { executionId: pendingExecution.id, teamMember: pendingExecution.team_member_name };
}
```

### Analisar Resposta com Gemini AI

```javascript
async analyzeResponse(execution, responseText) {
  const schedule = await this.getSchedule(execution.schedule_id);

  const prompt = schedule.custom_prompt || `
Voce e um assistente de gestao de equipes. Analise a resposta do funcionario e extraia:

1. Liste as atividades mencionadas
2. Classifique cada atividade como: 'planned' (planejada), 'completed' (concluida), 'pending' (pendente) ou 'blocked' (bloqueada)
3. Identifique a prioridade se mencionada: 'high', 'medium', 'low'
4. Detecte se ha impedimentos ou problemas mencionados

Responda em JSON com o formato:
{
  "summary": "resumo breve da resposta",
  "sentiment": "positive/neutral/negative",
  "activities": [
    {
      "description": "descricao da atividade",
      "type": "planned/completed/pending/blocked",
      "priority": "high/medium/low",
      "category": "categoria se identificavel"
    }
  ],
  "blockers": ["lista de impedimentos se houver"],
  "needs_followup": true/false,
  "suggested_response": "sugestao de resposta se necessario"
}

Resposta do funcionario:
"${responseText}"
`;

  const result = await this.aiModel.generateContent(prompt);
  const responseTextAI = result.response.text();

  // Tentar extrair JSON da resposta
  try {
    const jsonMatch = responseTextAI.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[SCHEDULER] Erro ao parsear JSON da analise:', e);
  }

  return { summary: responseTextAI, activities: [], sentiment: 'neutral' };
}
```

### Salvar Atividades Extraidas

```javascript
async saveExtractedActivities(execution, activities) {
  const today = new Date().toISOString().split('T')[0];

  for (const activity of activities) {
    const activityId = `act_${uuidv4()}`;

    await this.db.run(`
      INSERT INTO team_activities (
        id, execution_id, team_member_id, user_id,
        activity_type, description, priority, category,
        reported_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      activityId, execution.id, execution.team_member_id, execution.user_id,
      activity.type || 'reported', activity.description, activity.priority,
      activity.category, today, 'reported'
    ]);
  }

  console.log(`[SCHEDULER] ${activities.length} atividades extraidas e salvas`);
}
```

---

## API REST

### Endpoints de Membros da Equipe

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/scheduler/team-members` | Listar membros |
| POST | `/api/scheduler/team-members` | Criar membro |
| GET | `/api/scheduler/team-members/:id` | Buscar membro |
| PUT | `/api/scheduler/team-members/:id` | Atualizar membro |
| DELETE | `/api/scheduler/team-members/:id` | Deletar membro |

### Endpoints de Agendamentos

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/scheduler/schedules` | Listar agendamentos |
| POST | `/api/scheduler/schedules` | Criar agendamento |
| GET | `/api/scheduler/schedules/:id` | Buscar agendamento |
| PUT | `/api/scheduler/schedules/:id` | Atualizar agendamento |
| DELETE | `/api/scheduler/schedules/:id` | Deletar agendamento |
| POST | `/api/scheduler/schedules/:id/trigger` | Disparar manualmente |

### Endpoints de Execucoes

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/scheduler/executions` | Historico de execucoes |
| POST | `/api/scheduler/executions/:id/postpone` | Adiar execucao |

### Endpoints de Atividades

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/scheduler/activities` | Historico de atividades |

### Endpoints de Templates

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/scheduler/templates` | Listar templates |
| POST | `/api/scheduler/templates` | Criar template |
| PUT | `/api/scheduler/templates/:id` | Atualizar template |
| DELETE | `/api/scheduler/templates/:id` | Deletar template |

### Endpoints de Estatisticas

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/scheduler/stats/team` | Estatisticas da equipe |

### Endpoints de Controle

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/scheduler/status` | Status do scheduler |
| POST | `/api/scheduler/start` | Iniciar scheduler |
| POST | `/api/scheduler/stop` | Parar scheduler |

---

## Controle do Scheduler

### Iniciar

```javascript
start(intervalMs = 60000) {
  if (this.isRunning) {
    console.log('[SCHEDULER] Ja esta rodando');
    return;
  }

  this.isRunning = true;
  console.log('[SCHEDULER] Iniciando servico de agendamento...');

  // Verificar imediatamente e depois a cada intervalo
  this.checkAndTriggerSchedules();
  this.checkInterval = setInterval(() => this.checkAndTriggerSchedules(), intervalMs);
}
```

### Parar

```javascript
stop() {
  if (this.checkInterval) {
    clearInterval(this.checkInterval);
    this.checkInterval = null;
  }
  this.isRunning = false;
  console.log('[SCHEDULER] Servico de agendamento parado');
}
```

### Status

```javascript
getStatus() {
  return {
    isRunning: this.isRunning,
    checkInterval: this.checkInterval ? 'active' : 'inactive'
  };
}
```

---

## Templates Padrao

O sistema inclui templates padrao criados automaticamente:

1. **Inicio do Dia - Padrao** (`daily_start`)
   ```
   Bom dia, {nome}!

   Quais atividades voce planeja realizar hoje? Por favor, liste as principais tarefas que pretende executar.
   ```

2. **Fim do Dia - Padrao** (`daily_end`)
   ```
   Boa tarde, {nome}!

   Como foi seu dia? Por favor, me conte:
   1. Quais atividades voce conseguiu completar?
   2. Quais ficaram pendentes?
   3. Teve algum impedimento?
   ```

3. **Follow-up - Padrao** (`followup`)
   ```
   Ola {nome}, vi que ainda nao respondeu. Quando puder, me conta sobre suas atividades.
   ```

4. **Lembrete - Padrao** (`reminder`)
   ```
   {nome}, so passando para lembrar de registrar suas atividades do dia. E importante para o acompanhamento da equipe!
   ```

---

## Fluxo de Funcionamento

```
1. Criar Membro da Equipe
   └── POST /api/scheduler/team-members

2. Criar Agendamento
   └── POST /api/scheduler/schedules
       ├── Tipo: daily_start (08:00) ou daily_end (17:00)
       ├── Dias: [1,2,3,4,5] (seg-sex)
       └── Calcula next_trigger_at automaticamente

3. Scheduler verifica a cada 60 segundos
   └── SELECT schedules WHERE next_trigger_at <= NOW()

4. Dispara agendamentos devidos
   ├── Prepara mensagem (substitui {nome}, {data}, {hora})
   ├── Envia via WhatsApp (Evolution API)
   ├── Cria registro de execucao
   └── Atualiza next_trigger_at para proximo disparo

5. Aguarda resposta
   ├── Se responder: processa com IA, extrai atividades
   ├── Se timeout: envia follow-up (max 2 tentativas)
   └── Se nao responder: marca como no_response

6. Analise com IA (Gemini)
   ├── Classifica atividades (planned/completed/pending/blocked)
   ├── Identifica prioridades
   ├── Detecta impedimentos
   └── Salva em team_activities

7. Relatorios e Estatisticas
   └── GET /api/scheduler/stats/team
```

---

## Exemplo de Uso via API

### 1. Criar Membro da Equipe

```bash
curl -X POST http://localhost:3001/api/scheduler/team-members \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Joao Silva",
    "phone_number": "5511999999999",
    "role": "Desenvolvedor",
    "department": "TI"
  }'
```

### 2. Criar Agendamento de Inicio do Dia

```bash
curl -X POST http://localhost:3001/api/scheduler/schedules \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "dev_xxx",
    "team_member_id": "tm_xxx",
    "name": "Check-in Matinal - Joao",
    "schedule_type": "daily_start",
    "time_of_day": "08:00",
    "days_of_week": [1, 2, 3, 4, 5],
    "initial_message": "Bom dia, {nome}! Quais atividades voce planeja realizar hoje?",
    "followup_message": "Ola {nome}, vi que ainda nao respondeu. Quando puder, me conta sobre suas atividades.",
    "wait_for_response": true,
    "response_timeout_minutes": 60,
    "max_followups": 2,
    "followup_interval_minutes": 30,
    "use_ai_response": true
  }'
```

### 3. Disparar Agendamento Manualmente

```bash
curl -X POST http://localhost:3001/api/scheduler/schedules/sched_xxx/trigger \
  -H "Authorization: Bearer TOKEN"
```

### 4. Ver Estatisticas da Equipe

```bash
curl http://localhost:3001/api/scheduler/stats/team \
  -H "Authorization: Bearer TOKEN"
```

---

## Integracao com server.cjs

```javascript
// server.cjs

const { AgentScheduler, createSchedulerRoutes } = require('./scheduler.cjs');

// Inicializacao
const scheduler = new AgentScheduler(db, getEvolutionConfig, sendWhatsAppMessage);

// Registrar rotas
app.use('/api/scheduler', createSchedulerRoutes(scheduler, authMiddleware));

// Iniciar scheduler automaticamente
scheduler.start(60000); // Verifica a cada 60 segundos
```

---

## Notas de Seguranca

1. Todas as rotas requerem autenticacao (`authMiddleware`)
2. Dados sao filtrados por `user_id` - cada usuario ve apenas seus dados
3. Soft delete para membros e agendamentos (is_active = 0)
4. API Key do Google esta hardcoded - mover para variaveis de ambiente em producao
