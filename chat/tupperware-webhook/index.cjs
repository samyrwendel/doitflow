const fs = require('fs');
const path = require('path');
const startupLogPath = path.join(__dirname, 'startup-error.log');

try {
    const express = require('express');
    const cors = require('cors');
    const https = require('https');

    const app = express();
    app.get('/ping', (req, res) => res.send('pong'));

    const port = 3007;
    const dbPath = path.join(__dirname, 'db.json');
    const instancesPath = path.join(__dirname, 'instances.json');
    const errorLogPath = path.join(__dirname, 'error.log');
    const agentePath = path.join(__dirname, '..', 'agente.json');

    // Limpa o log de erro de inicialização antigo
    if (fs.existsSync(startupLogPath)) {
        fs.unlinkSync(startupLogPath);
    }

    const logError = (error) => {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${error.stack || error}\n`;
        fs.appendFileSync(errorLogPath, logMessage);
    };

    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    const readDb = () => {
        try {
            if (fs.existsSync(dbPath)) {
                const data = fs.readFileSync(dbPath, 'utf8');
                return JSON.parse(data);
            }
            return { messages: [] };
        } catch (error) {
            logError(error);
            console.error('Erro lendo o banco de dados:', error);
            return { messages: [] };
        }
    };

    const writeDb = (data) => {
        try {
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            logError(error);
            console.error('Erro escrevendo no banco de dados:', error);
        }
    };

    const readInstances = () => {
        try {
            if (fs.existsSync(instancesPath)) {
                const data = fs.readFileSync(instancesPath, 'utf8');
                return JSON.parse(data);
            }
            return { instances: [] };
        } catch (error) {
            logError(error);
            console.error('Erro lendo o arquivo de instâncias:', error);
            return { instances: [] };
        }
    };

    const writeInstances = (data) => {
        try {
            fs.writeFileSync(instancesPath, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            logError(error);
            console.error('Erro escrevendo no arquivo de instâncias:', error);
        }
    };

    // Endpoint para servir o arquivo instances.json
    app.get('/instances', (req, res) => {
        console.log('[Webhook Server] Recebida requisição GET /instances');
        try {
            const instancesData = readInstances();
            res.json(instancesData);
        } catch (error) {
            logError(error);
            console.error('Erro lendo instances.json:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    });

    // Endpoint para atualizar o arquivo instances.json
    app.put('/instances', (req, res) => {
        console.log('[Webhook Server] Recebida requisição PUT /instances');
        console.log('[Webhook Server] Body recebido:', JSON.stringify(req.body, null, 2));
        try {
            const newInstancesData = req.body;
            
            if (!newInstancesData || typeof newInstancesData !== 'object') {
                console.error('[Webhook Server] Dados inválidos recebidos:', newInstancesData);
                return res.status(400).json({ error: 'Dados inválidos' });
            }
            
            // Atualiza o timestamp de modificação
            if (newInstancesData.metadata) {
                newInstancesData.metadata.updated_at = new Date().toISOString();
            } else {
                newInstancesData.metadata = {
                    updated_at: new Date().toISOString()
                };
            }
            
            writeInstances(newInstancesData);
            console.log('[Webhook Server] Arquivo instances.json atualizado com sucesso');
            res.json({ message: 'Instâncias atualizadas com sucesso', data: newInstancesData });
        } catch (error) {
            logError(error);
            console.error('[Webhook Server] Erro atualizando instances.json:', error);
            res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
        }
    });



    // Endpoint para servir o arquivo agente.json
    app.get('/agente', (req, res) => {
        console.log('[Webhook Server] Recebida requisição GET /agente');
        try {
            if (fs.existsSync(agentePath)) {
                const agentData = fs.readFileSync(agentePath, 'utf8');
                const parsedData = JSON.parse(agentData);
                res.json(parsedData);
            } else {
                res.status(404).json({ error: 'Arquivo agente.json não encontrado' });
            }
        } catch (error) {
            logError(error);
            console.error('Erro lendo agente.json:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    });

    // Endpoint para atualizar o arquivo agente.json
    app.put('/agente', (req, res) => {
        console.log('[Webhook Server] Recebida requisição PUT /agente');
        try {
            const newAgentData = req.body;
            
            // Atualiza o timestamp de modificação
            if (newAgentData.metadata) {
                newAgentData.metadata.updated_at = new Date().toISOString();
            }
            
            fs.writeFileSync(agentePath, JSON.stringify(newAgentData, null, 2), 'utf8');
            console.log('[Webhook Server] Arquivo agente.json atualizado com sucesso');
            res.json({ message: 'Agente atualizado com sucesso', data: newAgentData });
        } catch (error) {
            logError(error);
            console.error('Erro atualizando agente.json:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    });

    app.get('/messages', (req, res) => {
        console.log('[Webhook Server] Recebida requisição GET /messages');
        try {
            const db = readDb();
            const sortedMessages = db.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            res.json(sortedMessages);
        } catch (error) {
            logError(error);
            res.status(500).send('Erro interno do servidor');
        }
    });

    app.post('/messages', (req, res) => {
        console.log('[Webhook Server] Recebida requisição POST /messages');
        try {
            const db = readDb();
            const { id, remoteJid, body } = req.body;

            if (!id || !remoteJid) {
                return res.status(400).json({ message: 'ID da mensagem e remoteJid são obrigatórios.' });
            }

            const newMessage = {
                id,
                remoteJid,
                body,
                status: 'sent',
                timestamp: new Date().toISOString(),
            };

            if (!db.messages.some(msg => msg.id === id)) {
                db.messages.push(newMessage);
                writeDb(db);
                console.log(`[Webhook Server] Mensagem registrada: ${id}`);
                res.status(201).json(newMessage);
            } else {
                const msgIndex = db.messages.findIndex(msg => msg.id === id);
                if (db.messages[msgIndex].status === 'pending') {
                    db.messages[msgIndex].status = 'sent';
                    db.messages[msgIndex].updatedAt = new Date().toISOString();
                }
                writeDb(db);
                res.status(200).json({ message: 'Mensagem já registrada.' });
            }
        } catch (error) {
            logError(error);
            res.status(500).send('Erro interno do servidor');
        }
    });

    app.post('/webhook', (req, res) => {
        console.log('[Webhook Server] Recebida requisição POST /webhook');
        try {
            const event = req.body;
            console.log('[Webhook Server] Evento recebido:', JSON.stringify(event, null, 2));

            if (event.event === 'messages.update' && event.data?.status) {
                const messageId = event.data.keyId;
                const status = event.data.status;

                if (messageId) {
                    const db = readDb();
                    const messageIndex = db.messages.findIndex(msg => msg.id === messageId);

                    if (messageIndex !== -1) {
                        const message = db.messages[messageIndex];
                        message.status = status;
                        message.updatedAt = new Date().toISOString(); // Mantém para informações gerais de "última atualização"

                        if ((status === 'delivered' || status === 'DELIVERY_ACK') && !message.deliveredAt) {
                            message.deliveredAt = new Date().toISOString();
                        } else if ((status === 'read' || status === 'READ') && !message.readAt) {
                            message.readAt = new Date().toISOString();
                            // Se a mensagem foi lida mas não tem data de entrega, adiciona uma
                            if (!message.deliveredAt) {
                                message.deliveredAt = message.readAt;
                            }
                        }
                        
                        writeDb(db);
                        console.log(`[Webhook Server] Status da mensagem ${messageId} atualizado para: ${status}`);
                    } else {
                        console.log(`[Webhook Server] Recebido status para mensagem não registrada: ${messageId}`);
                    }
                }
            }

            if (event.event === 'messages.upsert' && event.data?.message) {
                console.log('[Webhook Server] Nova mensagem recebida:', event.data.message);
            }

            res.sendStatus(200);
        } catch (error) {
            logError(error);
            res.status(500).send('Erro interno do servidor');
        }
    });

    // Middleware para tratar erros de parsing JSON
    app.use((error, req, res, next) => {
        if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
            logError(new Error(`JSON Parse Error: ${error.message}`));
            return res.status(400).json({ error: 'Invalid JSON format' });
        }
        logError(error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    });

    app.listen(port, '0.0.0.0', () => {
        if (!fs.existsSync(dbPath)) {
            writeDb({ messages: [] });
        }
        if (fs.existsSync(errorLogPath)) {
            fs.unlinkSync(errorLogPath);
        }
        console.log(`[Webhook Server] tupperware-webhook rodando na porta ${port} (IPv4 e IPv6)`);
    });

} catch (error) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] FATAL STARTUP ERROR: ${error.stack || error}\n`;
    fs.writeFileSync(startupLogPath, logMessage);
    process.exit(1);
}