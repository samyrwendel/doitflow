const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('./database/db.cjs');

// Chave secreta para JWT - em produção deve ser uma variável de ambiente
const JWT_SECRET = process.env.JWT_SECRET || 'demo-transcricao-chat-rag-secret-key-2025';

class AuthService {
  static async login(username, password) {
    try {
      const db = await getDatabase();
      
      // Buscar usuário
      const user = await db.getUserByUsername(username);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar senha
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        throw new Error('Senha incorreta');
      }

      // Criar token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          isAdmin: Boolean(user.is_admin)
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Criar sessão no banco
      const sessionId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await db.createSession({
        id: sessionId,
        userId: user.id,
        token: token,
        expiresAt: expiresAt.toISOString()
      });

      // Atualizar último login
      await db.updateUserLogin(user.id);

      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          isAdmin: Boolean(user.is_admin)
        }
      };
    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async logout(token) {
    try {
      const db = await getDatabase();
      await db.deleteSession(token);
      return { success: true };
    } catch (error) {
      console.error('Erro no logout:', error);
      return { success: false, error: error.message };
    }
  }

  static async validateToken(token) {
    try {
      // Verificar JWT
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Verificar sessão no banco
      const db = await getDatabase();
      const session = await db.getSessionByToken(token);
      
      if (!session) {
        throw new Error('Sessão inválida');
      }

      return {
        valid: true,
        user: {
          id: decoded.userId,
          username: decoded.username,
          fullName: session.full_name,
          isAdmin: Boolean(decoded.isAdmin)
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  static async register(userData) {
    try {
      const db = await getDatabase();
      
      // Verificar se usuário já existe
      const existingUser = await db.getUserByUsername(userData.username);
      if (existingUser) {
        throw new Error('Usuário já existe');
      }

      // Hash da senha
      const passwordHash = await bcrypt.hash(userData.password, 10);

      // Criar usuário
      const userId = uuidv4();
      await db.createUser({
        id: userId,
        username: userData.username,
        passwordHash,
        email: userData.email,
        fullName: userData.fullName,
        isAdmin: userData.isAdmin || false
      });

      return {
        success: true,
        userId
      };
    } catch (error) {
      console.error('Erro no registro:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getUserApiKeys(userId) {
    try {
      const db = await getDatabase();
      const apiKeys = await db.getUserApiKeys(userId);
      
      // Retornar apenas informações básicas (sem expor as chaves completas)
      return apiKeys.map(key => ({
        provider: key.provider,
        hasKey: true,
        lastUsed: key.last_used,
        usageCount: key.usage_count
      }));
    } catch (error) {
      console.error('Erro ao buscar API keys:', error);
      return [];
    }
  }

  static async getUserApiKeysForModal(userId) {
    try {
      const db = await getDatabase();
      const apiKeys = await db.getUserApiKeys(userId);
      
      // Retornar keys mascaradas para o modal
      return apiKeys.map(key => ({
        provider: key.provider,
        api_key: key.api_key, // Para o modal precisamos da key completa
        hasKey: true,
        lastUsed: key.last_used,
        usageCount: key.usage_count
      }));
    } catch (error) {
      console.error('Erro ao buscar API keys para modal:', error);
      return [];
    }
  }

  static async saveUserApiKey(userId, provider, apiKey) {
    try {
      const db = await getDatabase();
      
      const keyId = uuidv4();
      await db.createUserApiKey({
        id: keyId,
        userId,
        provider,
        apiKey
      });

      return {
        success: true,
        provider
      };
    } catch (error) {
      console.error('Erro ao salvar API key:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getUserApiKey(userId, provider) {
    try {
      const db = await getDatabase();
      const apiKey = await db.getUserApiKey(userId, provider);
      
      if (apiKey) {
        // Atualizar contador de uso
        await db.updateApiKeyUsage(userId, provider);
        return apiKey.api_key;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar API key:', error);
      return null;
    }
  }
}

// Middleware de autenticação para Express
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token de autenticação necessário' });
    }

    const validation = await AuthService.validateToken(token);
    if (!validation.valid) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    req.user = validation.user;
    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware opcional (não bloqueia se não tiver token)
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const validation = await AuthService.validateToken(token);
      if (validation.valid) {
        req.user = validation.user;
      }
    }
    
    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação opcional:', error);
    next(); // Continue mesmo com erro
  }
};

module.exports = {
  AuthService,
  authMiddleware,
  optionalAuthMiddleware
};