import DatabaseService from '../services/database';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface Migration {
  version: number;
  name: string;
  up: () => void;
  down?: () => void;
}

class MigrationManager {
  private db: DatabaseService;
  private migrations: Migration[] = [];

  constructor() {
    this.db = DatabaseService.getInstance();
    this.setupMigrationsTable();
    this.registerMigrations();
  }

  private setupMigrationsTable(): void {
    const createMigrationsTable = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    try {
      (this.db as any).db.exec(createMigrationsTable);
    } catch (error) {
      console.error('Erro ao criar tabela de migrations:', error);
    }
  }

  private registerMigrations(): void {
    // Migration 1: Criar estrutura inicial
    this.migrations.push({
      version: 1,
      name: 'create_initial_schema',
      up: () => {
        try {
          const schemaPath = join(__dirname, 'schema.sql');
          const schema = readFileSync(schemaPath, 'utf8');
          (this.db as any).db.exec(schema);
          console.log('✅ Schema inicial criado com sucesso');
        } catch (error) {
          console.error('❌ Erro ao executar migration inicial:', error);
          throw error;
        }
      }
    });

    // Migration 2: Inserir configurações padrão
    this.migrations.push({
      version: 2,
      name: 'insert_default_configurations',
      up: () => {
        try {
          // Configurações padrão do sistema
          const defaultConfigs = [
            { key: 'app_version', value: '1.0.0' },
            { key: 'default_openai_model', value: 'gpt-3.5-turbo' },
            { key: 'max_message_history', value: '1000' },
            { key: 'auto_backup_enabled', value: 'true' },
            { key: 'backup_interval_hours', value: '24' }
          ];

          for (const config of defaultConfigs) {
            this.db.setConfiguration(config.key, config.value);
          }
          
          console.log('✅ Configurações padrão inseridas com sucesso');
        } catch (error) {
          console.error('❌ Erro ao inserir configurações padrão:', error);
          throw error;
        }
      }
    });

    // Migration 3: Migrar dados do localStorage (se existirem)
    this.migrations.push({
      version: 3,
      name: 'migrate_from_localstorage',
      up: () => {
        try {
          // Verificar se estamos em ambiente browser
          if (typeof window !== 'undefined' && window.localStorage) {
            const savedConfig = localStorage.getItem('whatsapp-config');
            
            if (savedConfig) {
              const config = JSON.parse(savedConfig);
              
              // Se existe uma instância configurada, migrar para o banco
              if (config.instancia && config.evolutionUrl && config.chave) {
                const instanceId = this.db.createInstance({
                  name: config.instancia,
                  evolution_url: config.evolutionUrl,
                  api_key: config.chave,
                  status: 'disconnected'
                });

                // Criar configurações da instância
                this.db.createInstanceSettings({
                  instance_id: instanceId,
                  openai_key: config.openaiKey || '',
                  openai_model: config.openaiModel || 'gpt-3.5-turbo',
                  default_phones: config.telefones || '',
                  default_message: config.mensagem || ''
                });

                console.log('✅ Dados migrados do localStorage com sucesso');
                
                // Limpar localStorage após migração
                localStorage.removeItem('whatsapp-config');
              }
            }
          }
        } catch (error) {
          console.error('❌ Erro ao migrar dados do localStorage:', error);
          // Não falhar a migration por causa disso
        }
      }
    });
  }

  private getExecutedMigrations(): number[] {
    try {
      const stmt = (this.db as any).db.prepare('SELECT version FROM migrations ORDER BY version');
      const results = stmt.all();
      return results.map((row: any) => row.version);
    } catch (error) {
      console.error('Erro ao buscar migrations executadas:', error);
      return [];
    }
  }

  private markMigrationAsExecuted(migration: Migration): void {
    try {
      const stmt = (this.db as any).db.prepare(
        'INSERT INTO migrations (version, name) VALUES (?, ?)'
      );
      stmt.run(migration.version, migration.name);
    } catch (error) {
      console.error(`Erro ao marcar migration ${migration.version} como executada:`, error);
    }
  }

  public async runMigrations(): Promise<void> {
    console.log('🚀 Iniciando migrations...');
    
    const executedVersions = this.getExecutedMigrations();
    const pendingMigrations = this.migrations.filter(
      migration => !executedVersions.includes(migration.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ Todas as migrations já foram executadas');
      return;
    }

    console.log(`📋 ${pendingMigrations.length} migration(s) pendente(s)`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`⏳ Executando migration ${migration.version}: ${migration.name}`);
        
        // Executar a migration
        await migration.up();
        
        // Marcar como executada
        this.markMigrationAsExecuted(migration);
        
        console.log(`✅ Migration ${migration.version} executada com sucesso`);
      } catch (error) {
        console.error(`❌ Erro na migration ${migration.version}:`, error);
        throw new Error(`Migration ${migration.version} falhou: ${error}`);
      }
    }

    console.log('🎉 Todas as migrations foram executadas com sucesso!');
  }

  public async rollback(targetVersion: number): Promise<void> {
    const executedVersions = this.getExecutedMigrations();
    const migrationsToRollback = this.migrations
      .filter(migration => 
        migration.version > targetVersion && 
        executedVersions.includes(migration.version) &&
        migration.down
      )
      .sort((a, b) => b.version - a.version); // Ordem decrescente

    for (const migration of migrationsToRollback) {
      try {
        console.log(`⏳ Revertendo migration ${migration.version}: ${migration.name}`);
        
        if (migration.down) {
          await migration.down();
        }
        
        // Remover da tabela de migrations
        const stmt = (this.db as any).db.prepare('DELETE FROM migrations WHERE version = ?');
        stmt.run(migration.version);
        
        console.log(`✅ Migration ${migration.version} revertida com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao reverter migration ${migration.version}:`, error);
        throw error;
      }
    }
  }

  public getStatus(): { executed: number[]; pending: number[] } {
    const executedVersions = this.getExecutedMigrations();
    const allVersions = this.migrations.map(m => m.version);
    const pendingVersions = allVersions.filter(v => !executedVersions.includes(v));
    
    return {
      executed: executedVersions,
      pending: pendingVersions
    };
  }
}

export default MigrationManager;