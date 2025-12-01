/**
 * Sistema de Agendamento de Agentes
 *
 * Este módulo gerencia:
 * - Membros da equipe
 * - Agendamentos de mensagens
 * - Disparo automático de mensagens
 * - Follow-ups e retry
 * - Análise de respostas com IA
 */

const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ============================================
// CONSTANTES
// ============================================

const SCHEDULE_TYPES = {
  DAILY_START: 'daily_start',
  DAILY_END: 'daily_end',
  WEEKLY: 'weekly',
  CUSTOM: 'custom'
};

const EXECUTION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  AWAITING_RESPONSE: 'awaiting_response',
  RESPONDED: 'responded',
  NO_RESPONSE: 'no_response',
  POSTPONED: 'postponed',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// ============================================
// CLASSE PRINCIPAL DO SCHEDULER
// ============================================

class AgentScheduler {
  constructor(db, getEvolutionConfig, sendWhatsAppMessage) {
    this.db = db;
    this.getEvolutionConfig = getEvolutionConfig;
    this.sendWhatsAppMessage = sendWhatsAppMessage;
    this.checkInterval = null;
    this.isRunning = false;

    // Configuração da IA para análise de respostas
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
      console.warn('[SCHEDULER] ⚠️ GOOGLE_API_KEY não configurada - análise de IA desabilitada');
    }
    this.genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;
    this.aiModel = this.genAI ? this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) : null;
  }

  // ============================================
  // GERENCIAMENTO DE MEMBROS DA EQUIPE
  // ============================================

  async createTeamMember(userId, data) {
    const id = `tm_${uuidv4()}`;

    await this.db.run(`
      INSERT INTO team_members (id, user_id, name, phone_number, role, department, timezone, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, userId, data.name, data.phone_number, data.role, data.department, data.timezone || 'America/Sao_Paulo', JSON.stringify(data.metadata || {})]);

    return this.getTeamMember(id);
  }

  async getTeamMember(id) {
    return this.db.get('SELECT * FROM team_members WHERE id = ?', [id]);
  }

  async listTeamMembers(userId) {
    return this.db.all('SELECT * FROM team_members WHERE user_id = ? AND is_active = 1 ORDER BY name', [userId]);
  }

  async updateTeamMember(id, data) {
    const fields = [];
    const values = [];

    ['name', 'phone_number', 'role', 'department', 'timezone', 'is_active'].forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (data.metadata) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(data.metadata));
    }

    if (fields.length > 0) {
      values.push(id);
      await this.db.run(`UPDATE team_members SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    return this.getTeamMember(id);
  }

  async deleteTeamMember(id) {
    await this.db.run('UPDATE team_members SET is_active = 0 WHERE id = ?', [id]);
  }

  // ============================================
  // GERENCIAMENTO DE AGENDAMENTOS
  // ============================================

  async createSchedule(userId, data) {
    const id = `sched_${uuidv4()}`;

    // Calcular próximo disparo
    const nextTrigger = this.calculateNextTrigger(data.time_of_day, data.days_of_week, data.timezone);

    await this.db.run(`
      INSERT INTO agent_schedules (
        id, user_id, device_id, team_member_id, name, schedule_type,
        time_of_day, days_of_week, timezone,
        initial_message, followup_message, reminder_message,
        wait_for_response, response_timeout_minutes, max_followups, followup_interval_minutes,
        use_ai_response, rag_document_id, custom_prompt,
        is_active, next_trigger_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, userId, data.device_id, data.team_member_id, data.name, data.schedule_type,
      data.time_of_day, JSON.stringify(data.days_of_week || [1,2,3,4,5]), data.timezone || 'America/Sao_Paulo',
      data.initial_message, data.followup_message, data.reminder_message,
      data.wait_for_response !== false ? 1 : 0, data.response_timeout_minutes || 60,
      data.max_followups || 2, data.followup_interval_minutes || 30,
      data.use_ai_response !== false ? 1 : 0, data.rag_document_id, data.custom_prompt,
      1, nextTrigger
    ]);

    console.log(`[SCHEDULER] Agendamento criado: ${id} - Próximo disparo: ${nextTrigger}`);
    return this.getSchedule(id);
  }

  async getSchedule(id) {
    const schedule = await this.db.get('SELECT * FROM agent_schedules WHERE id = ?', [id]);
    if (schedule) {
      schedule.days_of_week = JSON.parse(schedule.days_of_week || '[]');
    }
    return schedule;
  }

  async listSchedules(userId, filters = {}) {
    let query = 'SELECT s.*, t.name as team_member_name, t.phone_number, d.name as device_name FROM agent_schedules s';
    query += ' LEFT JOIN team_members t ON s.team_member_id = t.id';
    query += ' LEFT JOIN whatsapp_devices d ON s.device_id = d.id';
    query += ' WHERE s.user_id = ?';
    const params = [userId];

    if (filters.is_active !== undefined) {
      query += ' AND s.is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters.schedule_type) {
      query += ' AND s.schedule_type = ?';
      params.push(filters.schedule_type);
    }

    if (filters.team_member_id) {
      query += ' AND s.team_member_id = ?';
      params.push(filters.team_member_id);
    }

    query += ' ORDER BY s.created_at DESC';

    const schedules = await this.db.all(query, params);
    return schedules.map(s => ({
      ...s,
      days_of_week: JSON.parse(s.days_of_week || '[]')
    }));
  }

  async updateSchedule(id, data) {
    const fields = [];
    const values = [];

    const simpleFields = ['device_id', 'team_member_id', 'name', 'schedule_type', 'time_of_day',
      'timezone', 'initial_message', 'followup_message', 'reminder_message',
      'wait_for_response', 'response_timeout_minutes', 'max_followups', 'followup_interval_minutes',
      'use_ai_response', 'rag_document_id', 'custom_prompt', 'is_active'];

    simpleFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (data.days_of_week) {
      fields.push('days_of_week = ?');
      values.push(JSON.stringify(data.days_of_week));
    }

    // Recalcular próximo disparo se horário ou dias mudaram
    if (data.time_of_day || data.days_of_week) {
      const schedule = await this.getSchedule(id);
      const nextTrigger = this.calculateNextTrigger(
        data.time_of_day || schedule.time_of_day,
        data.days_of_week || schedule.days_of_week,
        data.timezone || schedule.timezone
      );
      fields.push('next_trigger_at = ?');
      values.push(nextTrigger);
    }

    if (fields.length > 0) {
      values.push(id);
      await this.db.run(`UPDATE agent_schedules SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    return this.getSchedule(id);
  }

  async deleteSchedule(id) {
    await this.db.run('UPDATE agent_schedules SET is_active = 0 WHERE id = ?', [id]);
  }

  async hardDeleteSchedule(id) {
    await this.db.run('DELETE FROM agent_schedules WHERE id = ?', [id]);
  }

  // ============================================
  // CÁLCULO DE AGENDAMENTO
  // ============================================

  calculateNextTrigger(timeOfDay, daysOfWeek, timezone = 'America/Sao_Paulo') {
    const now = new Date();
    const [hours, minutes] = timeOfDay.split(':').map(Number);

    // Criar data de hoje com o horário especificado
    let next = new Date();
    next.setHours(hours, minutes, 0, 0);

    // Ajuste simples de timezone (assumindo -3 para America/Sao_Paulo)
    // Em produção, usar biblioteca como luxon ou moment-timezone

    // Se o horário já passou hoje, começar de amanhã
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    // Encontrar próximo dia válido da semana
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

  // ============================================
  // EXECUÇÃO DE AGENDAMENTOS
  // ============================================

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

  async triggerSchedule(schedule) {
    const executionId = `exec_${uuidv4()}`;

    try {
      console.log(`[SCHEDULER] Disparando: ${schedule.name} para ${schedule.team_member_name}`);

      // Preparar mensagem (substituir variáveis)
      const message = this.prepareMessage(schedule.initial_message, {
        nome: schedule.team_member_name,
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });

      // Criar registro de execução
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
      } else {
        await this.db.run(`
          UPDATE schedule_executions SET status = ?, completed_at = ? WHERE id = ?
        `, [EXECUTION_STATUS.COMPLETED, new Date().toISOString(), executionId]);
      }

      // Atualizar próximo disparo
      const nextTrigger = this.calculateNextTrigger(
        schedule.time_of_day,
        schedule.days_of_week,
        schedule.timezone
      );
      await this.db.run(`
        UPDATE agent_schedules SET last_triggered_at = ?, next_trigger_at = ? WHERE id = ?
      `, [new Date().toISOString(), nextTrigger, schedule.id]);

      console.log(`[SCHEDULER] ✅ Mensagem enviada para ${schedule.team_member_name}`);

    } catch (error) {
      console.error(`[SCHEDULER] ❌ Erro ao disparar ${schedule.name}:`, error);

      await this.db.run(`
        UPDATE schedule_executions SET status = ?, error_message = ? WHERE id = ?
      `, [EXECUTION_STATUS.FAILED, error.message, executionId]);
    }
  }

  async checkPendingFollowups() {
    const now = new Date();

    // Buscar execuções aguardando resposta que excederam o timeout
    const pendingExecutions = await this.db.all(`
      SELECT e.*, s.followup_message, s.max_followups, s.followup_interval_minutes,
             s.device_id, t.name as team_member_name, t.phone_number, d.name as device_name
      FROM schedule_executions e
      JOIN agent_schedules s ON e.schedule_id = s.id
      JOIN team_members t ON e.team_member_id = t.id
      JOIN whatsapp_devices d ON s.device_id = d.id
      WHERE e.status = ?
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

  async sendFollowup(execution) {
    try {
      console.log(`[SCHEDULER] Enviando follow-up #${execution.followup_count + 1} para ${execution.team_member_name}`);

      const message = this.prepareMessage(execution.followup_message || 'Olá {nome}, você conseguiu ver minha mensagem anterior?', {
        nome: execution.team_member_name,
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });

      const evolutionConfig = await this.getEvolutionConfig();
      await this.sendWhatsAppMessage(execution.device_name, execution.phone_number, message, evolutionConfig.apiKey);

      await this.db.run(`
        UPDATE schedule_executions
        SET followup_count = followup_count + 1, last_followup_at = ?
        WHERE id = ?
      `, [new Date().toISOString(), execution.id]);

      // Se atingiu máximo de follow-ups, marcar como sem resposta
      if (execution.followup_count + 1 >= execution.max_followups) {
        await this.db.run(`
          UPDATE schedule_executions SET status = ?, completed_at = ? WHERE id = ?
        `, [EXECUTION_STATUS.NO_RESPONSE, new Date().toISOString(), execution.id]);
      }

    } catch (error) {
      console.error(`[SCHEDULER] ❌ Erro ao enviar follow-up:`, error);
    }
  }

  prepareMessage(template, variables) {
    if (!template) return '';

    let message = template;
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
    });
    return message;
  }

  // ============================================
  // PROCESSAMENTO DE RESPOSTAS
  // ============================================

  async processIncomingResponse(phoneNumber, messageText, deviceName) {
    // Buscar execução pendente para este número
    const pendingExecution = await this.db.get(`
      SELECT e.*, s.use_ai_response, s.custom_prompt, s.rag_document_id, s.user_id,
             t.name as team_member_name
      FROM schedule_executions e
      JOIN agent_schedules s ON e.schedule_id = s.id
      JOIN team_members t ON e.team_member_id = t.id
      WHERE t.phone_number LIKE ?
      AND e.status = ?
      ORDER BY e.sent_at DESC
      LIMIT 1
    `, [`%${phoneNumber.slice(-11)}%`, EXECUTION_STATUS.AWAITING_RESPONSE]);

    if (!pendingExecution) {
      return null; // Não é resposta a um agendamento
    }

    console.log(`[SCHEDULER] Resposta recebida de ${pendingExecution.team_member_name}: ${messageText.substring(0, 100)}...`);

    // Atualizar execução com a resposta
    await this.db.run(`
      UPDATE schedule_executions
      SET response_received = ?, responded_at = ?, status = ?
      WHERE id = ?
    `, [messageText, new Date().toISOString(), EXECUTION_STATUS.RESPONDED, pendingExecution.id]);

    // Analisar resposta com IA se configurado
    if (pendingExecution.use_ai_response) {
      try {
        const analysis = await this.analyzeResponse(pendingExecution, messageText);

        await this.db.run(`
          UPDATE schedule_executions SET ai_analysis = ? WHERE id = ?
        `, [JSON.stringify(analysis), pendingExecution.id]);

        // Extrair e salvar atividades
        if (analysis.activities && analysis.activities.length > 0) {
          await this.saveExtractedActivities(pendingExecution, analysis.activities);
        }

        return {
          executionId: pendingExecution.id,
          teamMember: pendingExecution.team_member_name,
          analysis
        };
      } catch (error) {
        console.error('[SCHEDULER] Erro na análise de IA:', error);
      }
    }

    // Marcar como completado
    await this.db.run(`
      UPDATE schedule_executions SET status = ?, completed_at = ? WHERE id = ?
    `, [EXECUTION_STATUS.COMPLETED, new Date().toISOString(), pendingExecution.id]);

    return {
      executionId: pendingExecution.id,
      teamMember: pendingExecution.team_member_name
    };
  }

  async analyzeResponse(execution, responseText) {
    // Verificar se a IA está configurada
    if (!this.aiModel) {
      console.warn('[SCHEDULER] IA não configurada - retornando análise básica');
      return {
        summary: responseText.substring(0, 200),
        activities: [],
        sentiment: 'neutral',
        error: 'AI_NOT_CONFIGURED'
      };
    }

    const schedule = await this.getSchedule(execution.schedule_id);

    const prompt = schedule.custom_prompt || `
Você é um assistente de gestão de equipes. Analise a resposta do funcionário e extraia:

1. Liste as atividades mencionadas
2. Classifique cada atividade como: 'planned' (planejada), 'completed' (concluída), 'pending' (pendente) ou 'blocked' (bloqueada)
3. Identifique a prioridade se mencionada: 'high', 'medium', 'low'
4. Detecte se há impedimentos ou problemas mencionados

Responda em JSON com o formato:
{
  "summary": "resumo breve da resposta",
  "sentiment": "positive/neutral/negative",
  "activities": [
    {
      "description": "descrição da atividade",
      "type": "planned/completed/pending/blocked",
      "priority": "high/medium/low",
      "category": "categoria se identificável"
    }
  ],
  "blockers": ["lista de impedimentos se houver"],
  "needs_followup": true/false,
  "suggested_response": "sugestão de resposta se necessário"
}

Resposta do funcionário:
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
      console.error('[SCHEDULER] Erro ao parsear JSON da análise:', e);
    }

    return {
      summary: responseTextAI,
      activities: [],
      sentiment: 'neutral'
    };
  }

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

    console.log(`[SCHEDULER] ${activities.length} atividades extraídas e salvas`);
  }

  // ============================================
  // ADIAMENTO DE AGENDAMENTOS
  // ============================================

  async postponeExecution(executionId, postponeTo, reason) {
    await this.db.run(`
      UPDATE schedule_executions
      SET status = ?, postponed_to = ?, postpone_reason = ?
      WHERE id = ?
    `, [EXECUTION_STATUS.POSTPONED, postponeTo, reason, executionId]);

    // Criar nova execução para o horário adiado
    const execution = await this.db.get('SELECT * FROM schedule_executions WHERE id = ?', [executionId]);

    if (execution) {
      const newExecutionId = `exec_${uuidv4()}`;
      await this.db.run(`
        INSERT INTO schedule_executions (id, schedule_id, team_member_id, status, triggered_at)
        VALUES (?, ?, ?, ?, ?)
      `, [newExecutionId, execution.schedule_id, execution.team_member_id, EXECUTION_STATUS.PENDING, postponeTo]);
    }
  }

  // ============================================
  // TEMPLATES DE MENSAGEM
  // ============================================

  async listTemplates(userId) {
    return this.db.all('SELECT * FROM schedule_message_templates WHERE user_id = ? ORDER BY template_type, name', [userId]);
  }

  async createTemplate(userId, data) {
    const id = `tpl_${uuidv4()}`;

    await this.db.run(`
      INSERT INTO schedule_message_templates (id, user_id, name, template_type, content, language)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, userId, data.name, data.template_type, data.content, data.language || 'pt']);

    return this.db.get('SELECT * FROM schedule_message_templates WHERE id = ?', [id]);
  }

  async updateTemplate(id, data) {
    const fields = [];
    const values = [];

    ['name', 'template_type', 'content', 'language', 'is_default'].forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await this.db.run(`UPDATE schedule_message_templates SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    return this.db.get('SELECT * FROM schedule_message_templates WHERE id = ?', [id]);
  }

  async deleteTemplate(id) {
    await this.db.run('DELETE FROM schedule_message_templates WHERE id = ? AND is_default = 0', [id]);
  }

  // ============================================
  // RELATÓRIOS E ESTATÍSTICAS
  // ============================================

  async getTeamStats(userId, startDate, endDate) {
    const stats = await this.db.all(`
      SELECT
        t.id as team_member_id,
        t.name as team_member_name,
        COUNT(DISTINCT e.id) as total_executions,
        SUM(CASE WHEN e.status = 'responded' THEN 1 ELSE 0 END) as responded,
        SUM(CASE WHEN e.status = 'no_response' THEN 1 ELSE 0 END) as no_response,
        COUNT(DISTINCT a.id) as total_activities,
        SUM(CASE WHEN a.activity_type = 'completed' THEN 1 ELSE 0 END) as completed_activities,
        SUM(CASE WHEN a.activity_type = 'pending' THEN 1 ELSE 0 END) as pending_activities
      FROM team_members t
      LEFT JOIN schedule_executions e ON t.id = e.team_member_id
        AND e.triggered_at BETWEEN ? AND ?
      LEFT JOIN team_activities a ON e.id = a.execution_id
      WHERE t.user_id = ? AND t.is_active = 1
      GROUP BY t.id, t.name
      ORDER BY t.name
    `, [startDate, endDate, userId]);

    return stats;
  }

  async getActivityHistory(userId, filters = {}) {
    let query = `
      SELECT a.*, t.name as team_member_name, e.triggered_at as execution_date
      FROM team_activities a
      JOIN team_members t ON a.team_member_id = t.id
      JOIN schedule_executions e ON a.execution_id = e.id
      WHERE a.user_id = ?
    `;
    const params = [userId];

    if (filters.team_member_id) {
      query += ' AND a.team_member_id = ?';
      params.push(filters.team_member_id);
    }

    if (filters.activity_type) {
      query += ' AND a.activity_type = ?';
      params.push(filters.activity_type);
    }

    if (filters.start_date) {
      query += ' AND a.reported_date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND a.reported_date <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY a.reported_date DESC, a.created_at DESC LIMIT 100';

    return this.db.all(query, params);
  }

  async getExecutionHistory(userId, filters = {}) {
    let query = `
      SELECT e.*, s.name as schedule_name, s.schedule_type, t.name as team_member_name, t.phone_number
      FROM schedule_executions e
      JOIN agent_schedules s ON e.schedule_id = s.id
      JOIN team_members t ON e.team_member_id = t.id
      WHERE s.user_id = ?
    `;
    const params = [userId];

    if (filters.schedule_id) {
      query += ' AND e.schedule_id = ?';
      params.push(filters.schedule_id);
    }

    if (filters.status) {
      query += ' AND e.status = ?';
      params.push(filters.status);
    }

    if (filters.team_member_id) {
      query += ' AND e.team_member_id = ?';
      params.push(filters.team_member_id);
    }

    query += ' ORDER BY e.triggered_at DESC LIMIT 100';

    return this.db.all(query, params);
  }

  // ============================================
  // CONTROLE DO SCHEDULER
  // ============================================

  start(intervalMs = 60000) {
    if (this.isRunning) {
      console.log('[SCHEDULER] Já está rodando');
      return;
    }

    this.isRunning = true;
    console.log('[SCHEDULER] ✅ Iniciando serviço de agendamento...');

    // Verificar imediatamente e depois a cada intervalo
    this.checkAndTriggerSchedules();
    this.checkInterval = setInterval(() => this.checkAndTriggerSchedules(), intervalMs);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('[SCHEDULER] ⏹ Serviço de agendamento parado');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval ? 'active' : 'inactive'
    };
  }
}

// ============================================
// FUNÇÃO PARA CRIAR ROTAS EXPRESS
// ============================================

function createSchedulerRoutes(scheduler, authMiddleware) {
  const router = require('express').Router();

  // ============================================
  // ROTAS DE MEMBROS DA EQUIPE
  // ============================================

  // Listar membros
  router.get('/team-members', authMiddleware, async (req, res) => {
    try {
      const members = await scheduler.listTeamMembers(req.user.id);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Criar membro
  router.post('/team-members', authMiddleware, async (req, res) => {
    try {
      const member = await scheduler.createTeamMember(req.user.id, req.body);
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Buscar membro
  router.get('/team-members/:id', authMiddleware, async (req, res) => {
    try {
      const member = await scheduler.getTeamMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: 'Membro não encontrado' });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Atualizar membro
  router.put('/team-members/:id', authMiddleware, async (req, res) => {
    try {
      const member = await scheduler.updateTeamMember(req.params.id, req.body);
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Deletar membro
  router.delete('/team-members/:id', authMiddleware, async (req, res) => {
    try {
      await scheduler.deleteTeamMember(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ROTAS DE AGENDAMENTOS
  // ============================================

  // Listar agendamentos
  router.get('/schedules', authMiddleware, async (req, res) => {
    try {
      const schedules = await scheduler.listSchedules(req.user.id, req.query);
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Criar agendamento
  router.post('/schedules', authMiddleware, async (req, res) => {
    try {
      const schedule = await scheduler.createSchedule(req.user.id, req.body);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Buscar agendamento
  router.get('/schedules/:id', authMiddleware, async (req, res) => {
    try {
      const schedule = await scheduler.getSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Atualizar agendamento
  router.put('/schedules/:id', authMiddleware, async (req, res) => {
    try {
      const schedule = await scheduler.updateSchedule(req.params.id, req.body);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Deletar agendamento
  router.delete('/schedules/:id', authMiddleware, async (req, res) => {
    try {
      await scheduler.deleteSchedule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Disparar agendamento manualmente
  router.post('/schedules/:id/trigger', authMiddleware, async (req, res) => {
    try {
      const schedule = await scheduler.getSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }

      // Buscar dados completos
      const fullSchedule = (await scheduler.listSchedules(req.user.id, {}))[0];
      const scheduleWithDetails = await scheduler.db.get(`
        SELECT s.*, t.name as team_member_name, t.phone_number, d.name as device_name
        FROM agent_schedules s
        JOIN team_members t ON s.team_member_id = t.id
        JOIN whatsapp_devices d ON s.device_id = d.id
        WHERE s.id = ?
      `, [req.params.id]);

      if (scheduleWithDetails) {
        scheduleWithDetails.days_of_week = JSON.parse(scheduleWithDetails.days_of_week || '[]');
        await scheduler.triggerSchedule(scheduleWithDetails);
        res.json({ success: true, message: 'Agendamento disparado' });
      } else {
        res.status(400).json({ error: 'Dados incompletos do agendamento' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ROTAS DE EXECUÇÕES
  // ============================================

  // Histórico de execuções
  router.get('/executions', authMiddleware, async (req, res) => {
    try {
      const executions = await scheduler.getExecutionHistory(req.user.id, req.query);
      res.json(executions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Adiar execução
  router.post('/executions/:id/postpone', authMiddleware, async (req, res) => {
    try {
      await scheduler.postponeExecution(req.params.id, req.body.postpone_to, req.body.reason);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ROTAS DE ATIVIDADES
  // ============================================

  // Histórico de atividades
  router.get('/activities', authMiddleware, async (req, res) => {
    try {
      const activities = await scheduler.getActivityHistory(req.user.id, req.query);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ROTAS DE TEMPLATES
  // ============================================

  // Listar templates
  router.get('/templates', authMiddleware, async (req, res) => {
    try {
      const templates = await scheduler.listTemplates(req.user.id);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Criar template
  router.post('/templates', authMiddleware, async (req, res) => {
    try {
      const template = await scheduler.createTemplate(req.user.id, req.body);
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Atualizar template
  router.put('/templates/:id', authMiddleware, async (req, res) => {
    try {
      const template = await scheduler.updateTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Deletar template
  router.delete('/templates/:id', authMiddleware, async (req, res) => {
    try {
      await scheduler.deleteTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ROTAS DE ESTATÍSTICAS
  // ============================================

  // Estatísticas da equipe
  router.get('/stats/team', authMiddleware, async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = end_date || new Date().toISOString();

      const stats = await scheduler.getTeamStats(req.user.id, startDate, endDate);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // ROTAS DE CONTROLE DO SCHEDULER
  // ============================================

  // Status do scheduler
  router.get('/status', authMiddleware, async (req, res) => {
    try {
      res.json(scheduler.getStatus());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Iniciar scheduler
  router.post('/start', authMiddleware, async (req, res) => {
    try {
      scheduler.start(req.body.interval_ms || 60000);
      res.json({ success: true, status: scheduler.getStatus() });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Parar scheduler
  router.post('/stop', authMiddleware, async (req, res) => {
    try {
      scheduler.stop();
      res.json({ success: true, status: scheduler.getStatus() });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { AgentScheduler, createSchedulerRoutes, SCHEDULE_TYPES, EXECUTION_STATUS };
