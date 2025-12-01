// Implementação de banco de dados para browser usando IndexedDB
// Como fallback quando SQLite não está disponível

export interface Instance {
  id?: number;
  name: string;
  evolution_url: string;
  api_key: string;
  status?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InstanceSettings {
  id?: number;
  instance_id: number;
  openai_key?: string;
  openai_model?: string;
  default_phones?: string;
  default_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Configuration {
  id?: number;
  key: string;
  value: string;
  created_at?: string;
  updated_at?: string;
}

export interface MessageHistory {
  id?: number;
  instance_id: number;
  phone_numbers: string;
  message: string;
  status?: string;
  sent_at?: string;
}

class BrowserDatabaseService {
  private db: IDBDatabase | null = null;
  private static instance: BrowserDatabaseService;
  private dbName = 'EnviadorDB';
  private version = 11;

  private constructor() {}

  public static getInstance(): BrowserDatabaseService {
    if (!BrowserDatabaseService.instance) {
      BrowserDatabaseService.instance = new BrowserDatabaseService();
    }
    return BrowserDatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verificar se IndexedDB está disponível
      if (!window.indexedDB) {
        reject(new Error('IndexedDB não está disponível neste navegador'));
        return;
      }

      // Limpar banco existente se houver problemas de versão
      try {
        const deleteRequest = indexedDB.deleteDatabase(this.dbName);
        deleteRequest.onsuccess = () => {
          const request = indexedDB.open(this.dbName, this.version);
          this.setupDatabaseHandlers(request, resolve, reject);
        };
        deleteRequest.onerror = () => {
          // Se não conseguir deletar, tenta abrir normalmente
          const request = indexedDB.open(this.dbName, this.version);
          this.setupDatabaseHandlers(request, resolve, reject);
        };
      } catch (error) {
        // Fallback para abertura normal
        const request = indexedDB.open(this.dbName, this.version);
        this.setupDatabaseHandlers(request, resolve, reject);
      }
    });
  }

  private setupDatabaseHandlers(request: IDBOpenDBRequest, resolve: () => void, reject: (error: Error) => void) {
    request.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest).error;
      console.error('Erro ao abrir IndexedDB:', error);
      reject(new Error(`Erro ao abrir IndexedDB: ${error?.message || 'Erro desconhecido'}`));
    };

    request.onsuccess = () => {
      this.db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Criar object stores (sempre recriar para garantir consistência)
      try {
        // Criar configurations store
        const configStore = db.createObjectStore('configurations', { keyPath: 'id', autoIncrement: true });
        configStore.createIndex('key', 'key', { unique: true });

        // Criar instances store
        const instanceStore = db.createObjectStore('instances', { keyPath: 'id', autoIncrement: true });
        instanceStore.createIndex('name', 'name', { unique: true });
        instanceStore.createIndex('is_active', 'is_active');

        // Criar instance_settings store
        const settingsStore = db.createObjectStore('instance_settings', { keyPath: 'id', autoIncrement: true });
        settingsStore.createIndex('instance_id', 'instance_id');

        // Criar message_history store
        const historyStore = db.createObjectStore('message_history', { keyPath: 'id', autoIncrement: true });
        historyStore.createIndex('instance_id', 'instance_id');
        historyStore.createIndex('sent_at', 'sent_at');
      } catch (error) {
        console.warn('Erro ao criar object stores:', error);
      }
    };
  }

  private async executeTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database não inicializado');
    }

    // Verificar se a object store existe
    if (!this.db.objectStoreNames.contains(storeName)) {
      throw new Error(`Object store '${storeName}' não encontrada`);
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], mode);
        const store = transaction.objectStore(storeName);
        const request = operation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Operações para Configurações
  public async getConfiguration(key: string): Promise<Configuration | undefined> {
    const result = await this.executeTransaction(
      'configurations',
      'readonly',
      (store) => store.index('key').get(key)
    );
    return result;
  }

  public async setConfiguration(key: string, value: string): Promise<void> {
    const existing = await this.getConfiguration(key);
    const config: Configuration = {
      key,
      value,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      config.id = existing.id;
      config.created_at = existing.created_at;
    } else {
      config.created_at = new Date().toISOString();
    }

    await this.executeTransaction(
      'configurations',
      'readwrite',
      (store) => store.put(config)
    );
  }

  public async getAllConfigurations(): Promise<Configuration[]> {
    return this.executeTransaction(
      'configurations',
      'readonly',
      (store) => store.getAll()
    );
  }

  public async deleteConfiguration(key: string): Promise<void> {
    const existing = await this.getConfiguration(key);
    if (existing && existing.id) {
      await this.executeTransaction(
        'configurations',
        'readwrite',
        (store) => store.delete(existing.id!)
      );
    }
  }

  // Operações para Instâncias
  public async createInstance(instance: Omit<Instance, 'id'>): Promise<number> {
    const newInstance: Instance = {
      ...instance,
      status: instance.status || 'disconnected',
      is_active: instance.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await this.executeTransaction(
      'instances',
      'readwrite',
      (store) => store.add(newInstance)
    );
    return result as number;
  }

  public async getInstance(id: number): Promise<Instance | undefined> {
    return this.executeTransaction(
      'instances',
      'readonly',
      (store) => store.get(id)
    );
  }

  public async getInstanceByName(name: string): Promise<Instance | undefined> {
    return this.executeTransaction(
      'instances',
      'readonly',
      (store) => store.index('name').get(name)
    );
  }

  public async getAllInstances(): Promise<Instance[]> {
    const instances = await this.executeTransaction(
      'instances',
      'readonly',
      (store) => store.getAll()
    );
    return instances.filter(instance => instance.is_active);
  }

  public async updateInstance(id: number, updates: Partial<Instance>): Promise<void> {
    const existing = await this.getInstance(id);
    if (!existing) return;

    const updated = {
      ...existing,
      ...updates,
      id,
      updated_at: new Date().toISOString()
    };

    await this.executeTransaction(
      'instances',
      'readwrite',
      (store) => store.put(updated)
    );
  }

  public async deleteInstance(id: number): Promise<void> {
    await this.updateInstance(id, { is_active: false });
  }

  // Operações para Configurações de Instância
  public async createInstanceSettings(settings: Omit<InstanceSettings, 'id'>): Promise<number> {
    const newSettings: InstanceSettings = {
      ...settings,
      openai_model: settings.openai_model || 'gpt-3.5-turbo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await this.executeTransaction(
      'instance_settings',
      'readwrite',
      (store) => store.add(newSettings)
    );
    return result as number;
  }

  public async getInstanceSettings(instanceId: number): Promise<InstanceSettings | undefined> {
    return this.executeTransaction(
      'instance_settings',
      'readonly',
      (store) => store.index('instance_id').get(instanceId)
    );
  }

  public async updateInstanceSettings(instanceId: number, updates: Partial<InstanceSettings>): Promise<void> {
    const existing = await this.getInstanceSettings(instanceId);
    if (!existing) return;

    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    await this.executeTransaction(
      'instance_settings',
      'readwrite',
      (store) => store.put(updated)
    );
  }

  // Operações para Histórico de Mensagens
  public async addMessageHistory(message: Omit<MessageHistory, 'id'>): Promise<number> {
    const newMessage: MessageHistory = {
      ...message,
      status: message.status || 'pending',
      sent_at: new Date().toISOString()
    };

    const result = await this.executeTransaction(
      'message_history',
      'readwrite',
      (store) => store.add(newMessage)
    );
    return result as number;
  }

  public async getMessageHistory(instanceId?: number, limit: number = 100): Promise<MessageHistory[]> {
    const allMessages = await this.executeTransaction(
      'message_history',
      'readonly',
      (store) => store.getAll()
    );

    let filtered = allMessages;
    if (instanceId) {
      filtered = allMessages.filter(msg => msg.instance_id === instanceId);
    }

    return filtered
      .sort((a, b) => new Date(b.sent_at || '').getTime() - new Date(a.sent_at || '').getTime())
      .slice(0, limit);
  }

  public async updateMessageStatus(id: number, status: string): Promise<void> {
    const existing = await this.executeTransaction(
      'message_history',
      'readonly',
      (store) => store.get(id)
    );

    if (existing) {
      const updated = { ...existing, status };
      await this.executeTransaction(
        'message_history',
        'readwrite',
        (store) => store.put(updated)
      );
    }
  }

  // Utilitários
  public async getStats(): Promise<{ instances: number; messages: number; configurations: number }> {
    const [instances, messages, configurations] = await Promise.all([
      this.getAllInstances(),
      this.getMessageHistory(),
      this.getAllConfigurations()
    ]);

    return {
      instances: instances.length,
      messages: messages.length,
      configurations: configurations.length
    };
  }

  public isInitialized(): boolean {
    return this.db !== null && this.db.objectStoreNames.contains('instances');
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default BrowserDatabaseService;