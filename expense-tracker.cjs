/**
 * Sistema de Monitoramento de Gastos com Transporte (Uber/99)
 *
 * Funcionalidades:
 * - Análise de imagens de prints de corridas usando Gemini Vision
 * - Extração automática de dados (valor, origem, destino, data)
 * - Monitoramento de saldo da conta
 * - Geração de relatórios
 */

const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

// Tipos de provedores de transporte
const RIDE_PROVIDERS = {
  UBER: 'uber',
  NINENINE: '99',
  INDRIVER: 'indriver',
  CABIFY: 'cabify',
  OUTRO: 'outro'
};

// Status de corridas
const RIDE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DUPLICATE: 'duplicate'
};

class ExpenseTracker {
  constructor(db) {
    this.db = db;

    // Inicializar Gemini Vision
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
      console.warn('[EXPENSE-TRACKER] ⚠️ GOOGLE_API_KEY não configurada - análise de imagens desabilitada');
    }
    this.genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;
    this.visionModel = this.genAI ? this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) : null;
  }

  // ============================================
  // ANÁLISE DE IMAGENS
  // ============================================

  /**
   * Analisa uma imagem de corrida (Uber/99) e extrai os dados
   */
  async analyzeRideImage(imageBase64) {
    if (!this.visionModel) {
      throw new Error('Gemini Vision não configurado - verifique GOOGLE_API_KEY');
    }

    const prompt = `Analise esta imagem de um print de aplicativo de transporte (Uber, 99, inDriver, etc).

EXTRAIA AS SEGUINTES INFORMAÇÕES (se visíveis):

1. **Provedor**: Qual app? (uber, 99, indriver, cabify, outro)
2. **Valor da corrida**: Valor total em reais (apenas números, ex: 25.90)
3. **Data**: Data da corrida (formato: YYYY-MM-DD)
4. **Hora**: Horário (formato: HH:MM)
5. **Origem**: Endereço ou local de partida
6. **Destino**: Endereço ou local de chegada
7. **Distância**: Se visível (em km)
8. **Duração**: Se visível (em minutos)
9. **Tipo de corrida**: UberX, 99Pop, etc
10. **Forma de pagamento**: Se visível

IMPORTANTE:
- Se não conseguir identificar algum campo, retorne null
- Para o valor, extraia APENAS o número (sem "R$")
- Se for um print de SALDO/CRÉDITOS (não uma corrida), indique no campo "tipo": "saldo"

Responda APENAS com um JSON válido no formato:
{
  "tipo": "corrida" ou "saldo",
  "provedor": "uber" | "99" | "indriver" | "cabify" | "outro",
  "valor": 25.90,
  "data": "2024-12-01",
  "hora": "14:30",
  "origem": "Rua Example, 123",
  "destino": "Av. Destination, 456",
  "distancia_km": 5.2,
  "duracao_min": 15,
  "tipo_corrida": "UberX",
  "pagamento": "Uber Cash",
  "saldo_disponivel": null,
  "confianca": 0.95
}

Se for um print de SALDO:
{
  "tipo": "saldo",
  "provedor": "uber" | "99",
  "saldo_disponivel": 150.00,
  "data": "2024-12-01",
  "confianca": 0.90
}`;

    try {
      // Preparar a imagem para o Gemini
      const imagePart = {
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          mimeType: 'image/jpeg'
        }
      };

      const result = await this.visionModel.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Extrair JSON da resposta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Não foi possível extrair dados da imagem');
      }

      const extractedData = JSON.parse(jsonMatch[0]);
      console.log('[EXPENSE-TRACKER] Dados extraídos:', extractedData);

      return extractedData;
    } catch (error) {
      console.error('[EXPENSE-TRACKER] Erro ao analisar imagem:', error);
      throw error;
    }
  }

  // ============================================
  // GERENCIAMENTO DE GRUPOS
  // ============================================

  async createGroup(userId, data) {
    const id = `eg_${uuidv4()}`;

    await this.db.run(`
      INSERT INTO expense_groups (id, user_id, group_jid, group_name, device_id, initial_balance, period_start)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.group_jid,
      data.group_name,
      data.device_id,
      data.initial_balance || 0,
      data.period_start || new Date().toISOString().split('T')[0]
    ]);

    return this.getGroup(id);
  }

  async getGroup(groupId) {
    return this.db.get('SELECT * FROM expense_groups WHERE id = ?', [groupId]);
  }

  async getGroupByJid(groupJid) {
    return this.db.get('SELECT * FROM expense_groups WHERE group_jid = ?', [groupJid]);
  }

  async listGroups(userId) {
    return this.db.all('SELECT * FROM expense_groups WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  }

  async updateGroup(groupId, data) {
    const updates = [];
    const params = [];

    if (data.group_name) { updates.push('group_name = ?'); params.push(data.group_name); }
    if (data.initial_balance !== undefined) { updates.push('initial_balance = ?'); params.push(data.initial_balance); }
    if (data.current_balance !== undefined) { updates.push('current_balance = ?'); params.push(data.current_balance); }
    if (data.period_start) { updates.push('period_start = ?'); params.push(data.period_start); }
    if (data.period_end) { updates.push('period_end = ?'); params.push(data.period_end); }
    if (data.is_active !== undefined) { updates.push('is_active = ?'); params.push(data.is_active ? 1 : 0); }

    if (updates.length === 0) return this.getGroup(groupId);

    params.push(groupId);
    await this.db.run(`UPDATE expense_groups SET ${updates.join(', ')} WHERE id = ?`, params);

    // Sincronizar RAG automaticamente se saldo ou configuração mudou
    const group = await this.getGroup(groupId);
    if (group) {
      this.updateRAGDocument(group.user_id).catch(err => {
        console.error('[EXPENSE-TRACKER] Erro ao atualizar RAG após editar grupo:', err);
      });
    }

    return group;
  }

  async deleteGroup(groupId) {
    const group = await this.getGroup(groupId);
    await this.db.run('DELETE FROM expense_groups WHERE id = ?', [groupId]);

    // Sincronizar RAG após deletar grupo
    if (group) {
      this.updateRAGDocument(group.user_id).catch(err => {
        console.error('[EXPENSE-TRACKER] Erro ao atualizar RAG após deletar grupo:', err);
      });
    }
  }

  // ============================================
  // GERENCIAMENTO DE CORRIDAS
  // ============================================

  async addRide(groupId, userId, data, imageBase64 = null) {
    const id = `ride_${uuidv4()}`;

    // Se tiver imagem, analisar automaticamente
    let aiExtractedData = data.ai_extracted_data;
    let confidenceScore = data.confidence_score || 0;

    if (imageBase64 && !aiExtractedData) {
      try {
        const analysis = await this.analyzeRideImage(imageBase64);
        if (analysis.tipo === 'corrida') {
          aiExtractedData = JSON.stringify(analysis);
          confidenceScore = analysis.confianca || 0.8;

          // Usar dados extraídos se não foram fornecidos manualmente
          data.provider = data.provider || analysis.provedor;
          data.cost = data.cost || analysis.valor;
          data.ride_date = data.ride_date || analysis.data;
          data.ride_time = data.ride_time || analysis.hora;
          data.origin = data.origin || analysis.origem;
          data.destination = data.destination || analysis.destino;
        } else if (analysis.tipo === 'saldo') {
          // É um print de saldo, não de corrida
          return this.addBalanceRecord(groupId, userId, {
            balance: analysis.saldo_disponivel,
            balance_date: analysis.data || new Date().toISOString().split('T')[0],
            account_type: analysis.provedor === 'uber' ? 'uber_cash' : '99pay',
            sender_jid: data.sender_jid,
            sender_name: data.sender_name
          }, imageBase64);
        }
      } catch (error) {
        console.error('[EXPENSE-TRACKER] Erro na análise automática:', error);
      }
    }

    await this.db.run(`
      INSERT INTO expense_rides (
        id, group_id, user_id, provider, ride_date, ride_time,
        origin, destination, cost, sender_jid, sender_name,
        team_member_id, image_base64, ai_extracted_data, confidence_score,
        message_id, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      groupId,
      userId,
      data.provider || 'outro',
      data.ride_date || new Date().toISOString().split('T')[0],
      data.ride_time,
      data.origin,
      data.destination,
      data.cost || 0,
      data.sender_jid,
      data.sender_name,
      data.team_member_id,
      imageBase64,
      aiExtractedData,
      confidenceScore,
      data.message_id,
      RIDE_STATUS.PENDING
    ]);

    // Atualizar saldo do grupo
    await this.recalculateGroupBalance(groupId);

    // Atualizar RAG automaticamente (em background, não bloqueia)
    this.updateRAGDocument(userId).catch(err => {
      console.error('[EXPENSE-TRACKER] Erro ao atualizar RAG após nova corrida:', err);
    });

    return this.getRide(id);
  }

  async getRide(rideId) {
    return this.db.get('SELECT * FROM expense_rides WHERE id = ?', [rideId]);
  }

  async listRides(groupId, filters = {}) {
    let query = 'SELECT * FROM expense_rides WHERE group_id = ?';
    const params = [groupId];

    if (filters.startDate) {
      query += ' AND ride_date >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND ride_date <= ?';
      params.push(filters.endDate);
    }
    if (filters.provider) {
      query += ' AND provider = ?';
      params.push(filters.provider);
    }
    if (filters.sender_jid) {
      query += ' AND sender_jid = ?';
      params.push(filters.sender_jid);
    }
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY ride_date DESC, ride_time DESC';

    return this.db.all(query, params);
  }

  async updateRide(rideId, data) {
    const updates = [];
    const params = [];

    if (data.provider) { updates.push('provider = ?'); params.push(data.provider); }
    if (data.ride_date) { updates.push('ride_date = ?'); params.push(data.ride_date); }
    if (data.ride_time) { updates.push('ride_time = ?'); params.push(data.ride_time); }
    if (data.origin) { updates.push('origin = ?'); params.push(data.origin); }
    if (data.destination) { updates.push('destination = ?'); params.push(data.destination); }
    if (data.cost !== undefined) { updates.push('cost = ?'); params.push(data.cost); }
    if (data.status) {
      updates.push('status = ?');
      params.push(data.status);
      if (data.status !== RIDE_STATUS.PENDING) {
        updates.push('reviewed_at = ?');
        params.push(new Date().toISOString());
      }
    }
    if (data.reviewed_by) { updates.push('reviewed_by = ?'); params.push(data.reviewed_by); }

    if (updates.length === 0) return this.getRide(rideId);

    params.push(rideId);
    await this.db.run(`UPDATE expense_rides SET ${updates.join(', ')} WHERE id = ?`, params);

    // Recalcular saldo se o custo mudou
    const ride = await this.getRide(rideId);
    if (ride && data.cost !== undefined) {
      await this.recalculateGroupBalance(ride.group_id);
    }

    // Sincronizar RAG automaticamente após atualização
    if (ride) {
      const group = await this.getGroup(ride.group_id);
      if (group) {
        this.updateRAGDocument(group.user_id).catch(err => {
          console.error('[EXPENSE-TRACKER] Erro ao atualizar RAG após editar corrida:', err);
        });
      }
    }

    return this.getRide(rideId);
  }

  async deleteRide(rideId) {
    const ride = await this.getRide(rideId);
    const group = ride ? await this.getGroup(ride.group_id) : null;

    await this.db.run('DELETE FROM expense_rides WHERE id = ?', [rideId]);

    if (ride) {
      await this.recalculateGroupBalance(ride.group_id);
    }

    // Sincronizar RAG automaticamente após deletar
    if (group) {
      this.updateRAGDocument(group.user_id).catch(err => {
        console.error('[EXPENSE-TRACKER] Erro ao atualizar RAG após deletar corrida:', err);
      });
    }
  }

  // ============================================
  // GERENCIAMENTO DE SALDOS
  // ============================================

  async addBalanceRecord(groupId, userId, data, imageBase64 = null) {
    const id = `bal_${uuidv4()}`;

    await this.db.run(`
      INSERT INTO expense_balance_records (
        id, group_id, user_id, balance, balance_date, balance_time,
        account_type, sender_jid, sender_name, team_member_id,
        image_base64, message_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      groupId,
      userId,
      data.balance,
      data.balance_date || new Date().toISOString().split('T')[0],
      data.balance_time,
      data.account_type,
      data.sender_jid,
      data.sender_name,
      data.team_member_id,
      imageBase64,
      data.message_id
    ]);

    // Atualizar saldo atual do grupo
    await this.db.run(`
      UPDATE expense_groups SET current_balance = ? WHERE id = ?
    `, [data.balance, groupId]);

    // Sincronizar RAG automaticamente após novo registro de saldo
    this.updateRAGDocument(userId).catch(err => {
      console.error('[EXPENSE-TRACKER] Erro ao atualizar RAG após novo saldo:', err);
    });

    return this.getBalanceRecord(id);
  }

  async getBalanceRecord(recordId) {
    return this.db.get('SELECT * FROM expense_balance_records WHERE id = ?', [recordId]);
  }

  async listBalanceRecords(groupId, limit = 10) {
    return this.db.all(`
      SELECT * FROM expense_balance_records
      WHERE group_id = ?
      ORDER BY balance_date DESC, created_at DESC
      LIMIT ?
    `, [groupId, limit]);
  }

  async getLatestBalance(groupId) {
    return this.db.get(`
      SELECT * FROM expense_balance_records
      WHERE group_id = ?
      ORDER BY balance_date DESC, created_at DESC
      LIMIT 1
    `, [groupId]);
  }

  // ============================================
  // CÁLCULOS E RELATÓRIOS
  // ============================================

  async recalculateGroupBalance(groupId) {
    const group = await this.getGroup(groupId);
    if (!group) return;

    // Calcular total gasto
    const totalSpent = await this.db.get(`
      SELECT COALESCE(SUM(cost), 0) as total
      FROM expense_rides
      WHERE group_id = ? AND status IN ('pending', 'approved')
    `, [groupId]);

    // Saldo atual = saldo inicial - total gasto
    const currentBalance = group.initial_balance - (totalSpent?.total || 0);

    await this.db.run(`
      UPDATE expense_groups SET current_balance = ? WHERE id = ?
    `, [currentBalance, groupId]);
  }

  async getGroupStats(groupId, startDate = null, endDate = null) {
    const params = [groupId];
    let dateFilter = '';

    if (startDate) {
      dateFilter += ' AND ride_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ' AND ride_date <= ?';
      params.push(endDate);
    }

    // Total de corridas e custo
    const totals = await this.db.get(`
      SELECT
        COUNT(*) as total_rides,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(AVG(cost), 0) as avg_cost,
        MIN(cost) as min_cost,
        MAX(cost) as max_cost
      FROM expense_rides
      WHERE group_id = ? AND status IN ('pending', 'approved')
      ${dateFilter}
    `, params);

    // Por provedor
    const byProvider = await this.db.all(`
      SELECT
        provider,
        COUNT(*) as rides,
        SUM(cost) as total_cost
      FROM expense_rides
      WHERE group_id = ? AND status IN ('pending', 'approved')
      ${dateFilter}
      GROUP BY provider
    `, params);

    // Por pessoa (sender)
    const byPerson = await this.db.all(`
      SELECT
        sender_name,
        sender_jid,
        COUNT(*) as rides,
        SUM(cost) as total_cost
      FROM expense_rides
      WHERE group_id = ? AND status IN ('pending', 'approved')
      ${dateFilter}
      GROUP BY sender_jid
    `, params);

    // Por dia
    const byDay = await this.db.all(`
      SELECT
        ride_date,
        COUNT(*) as rides,
        SUM(cost) as total_cost
      FROM expense_rides
      WHERE group_id = ? AND status IN ('pending', 'approved')
      ${dateFilter}
      GROUP BY ride_date
      ORDER BY ride_date DESC
    `, params);

    // Últimos saldos
    const latestBalance = await this.getLatestBalance(groupId);

    return {
      ...totals,
      by_provider: byProvider,
      by_person: byPerson,
      by_day: byDay,
      latest_balance: latestBalance?.balance || 0,
      latest_balance_date: latestBalance?.balance_date
    };
  }

  async generateReport(groupId, userId, startDate, endDate) {
    const id = `rep_${uuidv4()}`;
    const stats = await this.getGroupStats(groupId, startDate, endDate);
    const group = await this.getGroup(groupId);
    const rides = await this.listRides(groupId, { startDate, endDate });

    // Gerar conteúdo do relatório
    let reportContent = `# Relatório de Gastos com Transporte\n\n`;
    reportContent += `**Grupo:** ${group.group_name}\n`;
    reportContent += `**Período:** ${startDate} a ${endDate}\n\n`;

    reportContent += `## Resumo\n\n`;
    reportContent += `- **Total de corridas:** ${stats.total_rides}\n`;
    reportContent += `- **Gasto total:** R$ ${stats.total_cost?.toFixed(2)}\n`;
    reportContent += `- **Média por corrida:** R$ ${stats.avg_cost?.toFixed(2)}\n`;
    reportContent += `- **Saldo atual:** R$ ${stats.latest_balance?.toFixed(2)}\n\n`;

    reportContent += `## Por Aplicativo\n\n`;
    reportContent += `| App | Corridas | Total |\n`;
    reportContent += `|-----|----------|-------|\n`;
    for (const p of stats.by_provider) {
      reportContent += `| ${p.provider} | ${p.rides} | R$ ${p.total_cost?.toFixed(2)} |\n`;
    }

    reportContent += `\n## Por Pessoa\n\n`;
    reportContent += `| Nome | Corridas | Total |\n`;
    reportContent += `|------|----------|-------|\n`;
    for (const p of stats.by_person) {
      reportContent += `| ${p.sender_name || 'Desconhecido'} | ${p.rides} | R$ ${p.total_cost?.toFixed(2)} |\n`;
    }

    reportContent += `\n## Detalhamento das Corridas\n\n`;
    reportContent += `| Data | Hora | App | Origem | Destino | Valor |\n`;
    reportContent += `|------|------|-----|--------|---------|-------|\n`;
    for (const ride of rides) {
      reportContent += `| ${ride.ride_date} | ${ride.ride_time || '-'} | ${ride.provider} | ${ride.origin || '-'} | ${ride.destination || '-'} | R$ ${ride.cost?.toFixed(2)} |\n`;
    }

    // Salvar relatório
    await this.db.run(`
      INSERT INTO expense_reports (
        id, group_id, user_id, period_start, period_end,
        total_rides, total_cost, balance_start, balance_end,
        cost_by_provider, rides_by_provider, cost_by_member,
        report_content
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      groupId,
      userId,
      startDate,
      endDate,
      stats.total_rides,
      stats.total_cost,
      group.initial_balance,
      stats.latest_balance,
      JSON.stringify(stats.by_provider.reduce((acc, p) => { acc[p.provider] = p.total_cost; return acc; }, {})),
      JSON.stringify(stats.by_provider.reduce((acc, p) => { acc[p.provider] = p.rides; return acc; }, {})),
      JSON.stringify(stats.by_person.reduce((acc, p) => { acc[p.sender_name || 'unknown'] = p.total_cost; return acc; }, {})),
      reportContent
    ]);

    return {
      id,
      stats,
      report_content: reportContent
    };
  }

  async listReports(groupId) {
    return this.db.all(`
      SELECT * FROM expense_reports
      WHERE group_id = ?
      ORDER BY created_at DESC
    `, [groupId]);
  }

  // ============================================
  // INTEGRAÇÃO COM RAG
  // ============================================

  /**
   * Gera conteúdo formatado para RAG com dados de gastos
   * Este conteúdo pode ser usado pelo assistente para responder perguntas
   */
  async generateRAGContent(userId) {
    const groups = await this.listGroups(userId);
    if (groups.length === 0) {
      return null;
    }

    let content = `# Base de Conhecimento - Gastos com Transporte\n\n`;
    content += `Atualizado em: ${new Date().toLocaleString('pt-BR')}\n\n`;

    for (const group of groups) {
      const stats = await this.getGroupStats(group.id);
      const rides = await this.listRides(group.id, {});
      const balances = await this.listBalanceRecords(group.id, 5);

      content += `## Grupo: ${group.group_name}\n\n`;
      content += `### Resumo Geral\n`;
      content += `- Total de corridas registradas: ${stats.total_rides}\n`;
      content += `- Gasto total acumulado: R$ ${stats.total_cost?.toFixed(2) || '0.00'}\n`;
      content += `- Média por corrida: R$ ${stats.avg_cost?.toFixed(2) || '0.00'}\n`;
      content += `- Menor corrida: R$ ${stats.min_cost?.toFixed(2) || '0.00'}\n`;
      content += `- Maior corrida: R$ ${stats.max_cost?.toFixed(2) || '0.00'}\n`;
      content += `- Saldo inicial: R$ ${group.initial_balance.toFixed(2)}\n`;
      content += `- Saldo atual: R$ ${group.current_balance.toFixed(2)}\n\n`;

      // Por aplicativo
      if (stats.by_provider && stats.by_provider.length > 0) {
        content += `### Gastos por Aplicativo\n`;
        for (const p of stats.by_provider) {
          content += `- ${p.provider.toUpperCase()}: ${p.rides} corridas, R$ ${p.total_cost?.toFixed(2)}\n`;
        }
        content += `\n`;
      }

      // Por pessoa
      if (stats.by_person && stats.by_person.length > 0) {
        content += `### Gastos por Pessoa\n`;
        for (const p of stats.by_person) {
          content += `- ${p.sender_name || 'Não identificado'}: ${p.rides} corridas, R$ ${p.total_cost?.toFixed(2)}\n`;
        }
        content += `\n`;
      }

      // Últimas corridas
      if (rides.length > 0) {
        content += `### Últimas Corridas (até 20)\n`;
        const recentRides = rides.slice(0, 20);
        for (const ride of recentRides) {
          content += `- ${ride.ride_date}${ride.ride_time ? ' ' + ride.ride_time : ''}: `;
          content += `${ride.provider.toUpperCase()} `;
          if (ride.origin || ride.destination) {
            content += `de ${ride.origin || '?'} para ${ride.destination || '?'} `;
          }
          content += `- R$ ${ride.cost.toFixed(2)}`;
          if (ride.sender_name) {
            content += ` (${ride.sender_name})`;
          }
          content += `\n`;
        }
        content += `\n`;
      }

      // Últimos saldos
      if (balances.length > 0) {
        content += `### Histórico de Saldos\n`;
        for (const bal of balances) {
          content += `- ${bal.balance_date}: R$ ${bal.balance.toFixed(2)} (${bal.account_type || 'conta'})\n`;
        }
        content += `\n`;
      }
    }

    return content;
  }

  /**
   * Atualiza ou cria um documento RAG com os dados de gastos
   */
  async updateRAGDocument(userId) {
    try {
      const content = await this.generateRAGContent(userId);
      if (!content) {
        console.log('[EXPENSE-TRACKER] Sem dados para gerar RAG');
        return null;
      }

      // Verificar se já existe um documento RAG de gastos
      const existingDoc = await this.db.get(`
        SELECT * FROM rag_documents
        WHERE user_id = ? AND title = 'Gastos com Transporte (Auto)'
      `, [userId]);

      // Criar chunks do conteúdo
      const chunks = this.createChunks(content, 500);

      if (existingDoc) {
        // Atualizar documento existente
        await this.db.run(`
          UPDATE rag_documents
          SET content = ?, chunks = ?, chunk_count = ?, character_count = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [content, JSON.stringify(chunks), chunks.length, content.length, existingDoc.id]);

        console.log('[EXPENSE-TRACKER] Documento RAG atualizado:', existingDoc.id);
        return existingDoc.id;
      } else {
        // Criar novo documento
        const id = `rag_expenses_${uuidv4()}`;
        await this.db.run(`
          INSERT INTO rag_documents (id, user_id, title, content, chunks, source, chunk_count, character_count)
          VALUES (?, ?, 'Gastos com Transporte (Auto)', ?, ?, 'expense_tracker', ?, ?)
        `, [id, userId, content, JSON.stringify(chunks), chunks.length, content.length]);

        console.log('[EXPENSE-TRACKER] Novo documento RAG criado:', id);
        return id;
      }
    } catch (error) {
      console.error('[EXPENSE-TRACKER] Erro ao atualizar RAG:', error);
      return null;
    }
  }

  /**
   * Divide o conteúdo em chunks para o RAG
   */
  createChunks(text, chunkSize = 500) {
    const chunks = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // ============================================
  // PROCESSAMENTO DE WEBHOOK (MENSAGENS DO GRUPO)
  // ============================================

  async processGroupMessage(message) {
    // Verificar se o grupo está sendo monitorado
    const group = await this.getGroupByJid(message.group_jid);
    if (!group || !group.is_active) {
      return null;
    }

    // Verificar se tem imagem
    if (!message.image_base64 && !message.media_url) {
      return null;
    }

    // Baixar imagem se for URL
    let imageBase64 = message.image_base64;
    if (!imageBase64 && message.media_url) {
      // TODO: Implementar download da imagem
      console.log('[EXPENSE-TRACKER] URL de mídia recebida:', message.media_url);
      return null;
    }

    try {
      // Analisar a imagem
      const analysis = await this.analyzeRideImage(imageBase64);

      if (analysis.tipo === 'corrida' && analysis.valor) {
        // Adicionar corrida
        return await this.addRide(group.id, group.user_id, {
          provider: analysis.provedor,
          cost: analysis.valor,
          ride_date: analysis.data,
          ride_time: analysis.hora,
          origin: analysis.origem,
          destination: analysis.destino,
          sender_jid: message.sender_jid,
          sender_name: message.sender_name,
          message_id: message.message_id,
          ai_extracted_data: JSON.stringify(analysis),
          confidence_score: analysis.confianca
        }, imageBase64);
      } else if (analysis.tipo === 'saldo' && analysis.saldo_disponivel) {
        // Adicionar registro de saldo
        return await this.addBalanceRecord(group.id, group.user_id, {
          balance: analysis.saldo_disponivel,
          balance_date: analysis.data || new Date().toISOString().split('T')[0],
          account_type: analysis.provedor === 'uber' ? 'uber_cash' : '99pay',
          sender_jid: message.sender_jid,
          sender_name: message.sender_name,
          message_id: message.message_id
        }, imageBase64);
      }
    } catch (error) {
      console.error('[EXPENSE-TRACKER] Erro ao processar mensagem do grupo:', error);
    }

    return null;
  }
}

// ============================================
// ROTAS DA API
// ============================================

function createExpenseRoutes(expenseTracker, authMiddleware) {
  const router = express.Router();

  // === GRUPOS ===

  // Listar grupos
  router.get('/groups', authMiddleware, async (req, res) => {
    try {
      const groups = await expenseTracker.listGroups(req.userId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Criar grupo
  router.post('/groups', authMiddleware, async (req, res) => {
    try {
      const group = await expenseTracker.createGroup(req.userId, req.body);
      res.json(group);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Obter grupo
  router.get('/groups/:id', authMiddleware, async (req, res) => {
    try {
      const group = await expenseTracker.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Grupo não encontrado' });
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Atualizar grupo
  router.put('/groups/:id', authMiddleware, async (req, res) => {
    try {
      const group = await expenseTracker.updateGroup(req.params.id, req.body);
      res.json(group);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Deletar grupo
  router.delete('/groups/:id', authMiddleware, async (req, res) => {
    try {
      await expenseTracker.deleteGroup(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Estatísticas do grupo
  router.get('/groups/:id/stats', authMiddleware, async (req, res) => {
    try {
      const stats = await expenseTracker.getGroupStats(
        req.params.id,
        req.query.start_date,
        req.query.end_date
      );
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // === CORRIDAS ===

  // Listar corridas do grupo
  router.get('/groups/:id/rides', authMiddleware, async (req, res) => {
    try {
      const rides = await expenseTracker.listRides(req.params.id, req.query);
      res.json(rides);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Adicionar corrida
  router.post('/groups/:id/rides', authMiddleware, async (req, res) => {
    try {
      const ride = await expenseTracker.addRide(
        req.params.id,
        req.userId,
        req.body,
        req.body.image_base64
      );
      res.json(ride);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Atualizar corrida
  router.put('/rides/:id', authMiddleware, async (req, res) => {
    try {
      const ride = await expenseTracker.updateRide(req.params.id, {
        ...req.body,
        reviewed_by: req.userId
      });
      res.json(ride);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Deletar corrida
  router.delete('/rides/:id', authMiddleware, async (req, res) => {
    try {
      await expenseTracker.deleteRide(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // === SALDOS ===

  // Listar saldos
  router.get('/groups/:id/balances', authMiddleware, async (req, res) => {
    try {
      const balances = await expenseTracker.listBalanceRecords(
        req.params.id,
        parseInt(req.query.limit) || 10
      );
      res.json(balances);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Adicionar saldo manualmente
  router.post('/groups/:id/balances', authMiddleware, async (req, res) => {
    try {
      const balance = await expenseTracker.addBalanceRecord(
        req.params.id,
        req.userId,
        req.body,
        req.body.image_base64
      );
      res.json(balance);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // === RELATÓRIOS ===

  // Gerar relatório
  router.post('/groups/:id/reports', authMiddleware, async (req, res) => {
    try {
      const report = await expenseTracker.generateReport(
        req.params.id,
        req.userId,
        req.body.start_date,
        req.body.end_date
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Listar relatórios
  router.get('/groups/:id/reports', authMiddleware, async (req, res) => {
    try {
      const reports = await expenseTracker.listReports(req.params.id);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // === ANÁLISE DE IMAGEM ===

  // Analisar imagem (sem salvar)
  router.post('/analyze-image', authMiddleware, async (req, res) => {
    try {
      const { image_base64 } = req.body;
      if (!image_base64) {
        return res.status(400).json({ error: 'Imagem não fornecida' });
      }
      const analysis = await expenseTracker.analyzeRideImage(image_base64);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // === RAG SYNC ===

  // Sincronizar dados de gastos com o RAG
  router.post('/sync-rag', authMiddleware, async (req, res) => {
    try {
      const ragId = await expenseTracker.updateRAGDocument(req.userId);
      if (ragId) {
        res.json({ success: true, rag_document_id: ragId, message: 'RAG atualizado com sucesso' });
      } else {
        res.json({ success: false, message: 'Nenhum dado para sincronizar' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Obter conteúdo RAG (preview)
  router.get('/rag-content', authMiddleware, async (req, res) => {
    try {
      const content = await expenseTracker.generateRAGContent(req.userId);
      res.json({ content });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // === WEBHOOK (PÚBLICO) ===

  // Processar mensagem do grupo WhatsApp
  router.post('/webhook', async (req, res) => {
    try {
      const result = await expenseTracker.processGroupMessage(req.body);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { ExpenseTracker, createExpenseRoutes, RIDE_PROVIDERS, RIDE_STATUS };
