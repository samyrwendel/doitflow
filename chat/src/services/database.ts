import Database from 'better-sqlite3';

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

// Interfaces para E-commerce
export interface StoreSettings {
  id?: number;
  name: string;
  description?: string;
  logo?: string;
  banner?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  social_media_facebook?: string;
  social_media_instagram?: string;
  social_media_twitter?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id?: number;
  name: string;
  description?: string;
  price: number;
  image?: string;
  category?: string;
  stock: number;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: string;
  total: number;
  status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id?: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  created_at?: string;
}

export interface Comment {
  id?: number;
  product_id: number;
  customer_name: string;
  rating: number;
  text?: string;
  approved?: boolean;
  created_at?: string;
}

class DatabaseService {
  private db: Database.Database;
  private static instance: DatabaseService;

  private constructor() {
    // Criar banco na pasta do projeto
    this.db = new Database('app.db');
    this.initializeDatabase();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initializeDatabase(): void {
    try {
      // Criar tabelas manualmente
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS configurations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS instances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          evolution_url TEXT NOT NULL,
          api_key TEXT NOT NULL,
          status TEXT DEFAULT 'disconnected',
          is_active INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS instance_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          instance_id INTEGER NOT NULL,
          openai_key TEXT,
          openai_model TEXT DEFAULT 'gpt-3.5-turbo',
          default_phones TEXT,
          default_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (instance_id) REFERENCES instances(id)
        );
        
        CREATE TABLE IF NOT EXISTS message_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          instance_id INTEGER NOT NULL,
          phone_numbers TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (instance_id) REFERENCES instances(id)
        );
        
        CREATE TABLE IF NOT EXISTS store_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          logo TEXT,
          banner TEXT,
          contact_email TEXT,
          contact_phone TEXT,
          address TEXT,
          social_media_facebook TEXT,
          social_media_instagram TEXT,
          social_media_twitter TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          image TEXT,
          category TEXT,
          stock INTEGER NOT NULL,
          active INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          customer_address TEXT,
          total REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        );
        
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          rating INTEGER NOT NULL,
          text TEXT,
          approved INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id)
        );
      `);
    } catch (error) {
      console.error('Erro ao inicializar banco de dados:', error);
    }
  }

  // Operações para Configurações
  public getConfiguration(key: string): Configuration | undefined {
    const stmt = this.db.prepare('SELECT * FROM configurations WHERE key = ?');
    return stmt.get(key) as Configuration | undefined;
  }

  public setConfiguration(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO configurations (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(key, value);
  }

  public getAllConfigurations(): Configuration[] {
    const stmt = this.db.prepare('SELECT * FROM configurations ORDER BY key');
    return stmt.all() as Configuration[];
  }

  public deleteConfiguration(key: string): void {
    const stmt = this.db.prepare('DELETE FROM configurations WHERE key = ?');
    stmt.run(key);
  }

  // Operações para Instâncias
  public createInstance(instance: Omit<Instance, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO instances (name, evolution_url, api_key, status, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      instance.name,
      instance.evolution_url,
      instance.api_key,
      instance.status || 'disconnected',
      instance.is_active !== false ? 1 : 0
    );
    return result.lastInsertRowid as number;
  }

  public getInstance(id: number): Instance | undefined {
    const stmt = this.db.prepare('SELECT * FROM instances WHERE id = ?');
    return stmt.get(id) as Instance | undefined;
  }

  public getInstanceByName(name: string): Instance | undefined {
    const stmt = this.db.prepare('SELECT * FROM instances WHERE name = ?');
    return stmt.get(name) as Instance | undefined;
  }

  public getAllInstances(): Instance[] {
    const stmt = this.db.prepare('SELECT * FROM instances WHERE is_active = 1 ORDER BY name');
    return stmt.all() as Instance[];
  }

  public updateInstance(id: number, updates: Partial<Instance>): void {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field as keyof Instance]);
    
    const stmt = this.db.prepare(`
      UPDATE instances SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(...values, id);
  }

  public deleteInstance(id: number): void {
    const stmt = this.db.prepare('UPDATE instances SET is_active = 0 WHERE id = ?');
    stmt.run(id);
  }

  // Operações para Configurações de Instância
  public createInstanceSettings(settings: Omit<InstanceSettings, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO instance_settings (instance_id, openai_key, openai_model, default_phones, default_message)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      settings.instance_id,
      settings.openai_key,
      settings.openai_model || 'gpt-3.5-turbo',
      settings.default_phones,
      settings.default_message
    );
    return result.lastInsertRowid as number;
  }

  public getInstanceSettings(instanceId: number): InstanceSettings | undefined {
    const stmt = this.db.prepare('SELECT * FROM instance_settings WHERE instance_id = ?');
    return stmt.get(instanceId) as InstanceSettings | undefined;
  }

  public updateInstanceSettings(instanceId: number, updates: Partial<InstanceSettings>): void {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'instance_id');
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field as keyof InstanceSettings]);
    
    const stmt = this.db.prepare(`
      UPDATE instance_settings SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE instance_id = ?
    `);
    stmt.run(...values, instanceId);
  }

  // Operações para Histórico de Mensagens
  public addMessageHistory(message: Omit<MessageHistory, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO message_history (instance_id, phone_numbers, message, status)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      message.instance_id,
      message.phone_numbers,
      message.message,
      message.status || 'pending'
    );
    return result.lastInsertRowid as number;
  }

  public getMessageHistory(instanceId?: number, limit: number = 100): MessageHistory[] {
    let query = 'SELECT * FROM message_history';
    let params: any[] = [];
    
    if (instanceId) {
      query += ' WHERE instance_id = ?';
      params.push(instanceId);
    }
    
    query += ' ORDER BY sent_at DESC LIMIT ?';
    params.push(limit);
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params) as MessageHistory[];
  }

  public updateMessageStatus(id: number, status: string): void {
    const stmt = this.db.prepare('UPDATE message_history SET status = ? WHERE id = ?');
    stmt.run(status, id);
  }

  // Utilitários
  public close(): void {
    this.db.close();
  }

  public backup(filename: string): void {
    this.db.backup(filename);
  }

  public getStats(): { instances: number; messages: number; configurations: number } {
    const instancesStmt = this.db.prepare('SELECT COUNT(*) as count FROM instances WHERE is_active = 1');
    const messagesStmt = this.db.prepare('SELECT COUNT(*) as count FROM message_history');
    const configsStmt = this.db.prepare('SELECT COUNT(*) as count FROM configurations');
    
    return {
      instances: (instancesStmt.get() as any).count,
      messages: (messagesStmt.get() as any).count,
      configurations: (configsStmt.get() as any).count
    };
  }

  // Operações para Configurações da Loja
  public getStoreSettings(): StoreSettings | undefined {
    const stmt = this.db.prepare('SELECT * FROM store_settings ORDER BY id DESC LIMIT 1');
    const result = stmt.get() as any;
    
    if (!result) return undefined;
    
    return {
      id: result.id,
      name: result.name,
      description: result.description,
      logo: result.logo,
      banner: result.banner,
      contact_email: result.contact_email,
      contact_phone: result.contact_phone,
      address: result.address,
      social_media_facebook: result.social_media_facebook,
      social_media_instagram: result.social_media_instagram,
      social_media_twitter: result.social_media_twitter,
      created_at: result.created_at,
      updated_at: result.updated_at
    };
  }

  public createStoreSettings(settings: Omit<StoreSettings, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO store_settings (
        name, description, logo, banner, contact_email, contact_phone, address,
        social_media_facebook, social_media_instagram, social_media_twitter
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      settings.name,
      settings.description,
      settings.logo,
      settings.banner,
      settings.contact_email,
      settings.contact_phone,
      settings.address,
      settings.social_media_facebook,
      settings.social_media_instagram,
      settings.social_media_twitter
    );
    return result.lastInsertRowid as number;
  }

  public updateStoreSettings(id: number, updates: Partial<StoreSettings>): void {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field as keyof StoreSettings]);
    
    const stmt = this.db.prepare(`
      UPDATE store_settings SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(...values, id);
  }

  // Operações para Produtos
  public createProduct(product: Omit<Product, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO products (name, description, price, image, category, stock, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      product.name,
      product.description,
      product.price,
      product.image,
      product.category,
      product.stock,
      product.active !== false ? 1 : 0
    );
    return result.lastInsertRowid as number;
  }

  public getProduct(id: number): Product | undefined {
    const stmt = this.db.prepare('SELECT * FROM products WHERE id = ?');
    const result = stmt.get(id) as any;
    
    if (!result) return undefined;
    
    return {
      id: result.id,
      name: result.name,
      description: result.description,
      price: result.price,
      image: result.image,
      category: result.category,
      stock: result.stock,
      active: result.active === 1,
      created_at: result.created_at,
      updated_at: result.updated_at
    };
  }

  public getAllProducts(activeOnly: boolean = false): Product[] {
    let query = 'SELECT * FROM products';
    const params: any[] = [];
    
    if (activeOnly) {
      query += ' WHERE active = 1';
    }
    
    query += ' ORDER BY name';
    
    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as any[];
    
    return results.map(result => ({
      id: result.id,
      name: result.name,
      description: result.description,
      price: result.price,
      image: result.image,
      category: result.category,
      stock: result.stock,
      active: result.active === 1,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));
  }

  public updateProduct(id: number, updates: Partial<Product>): void {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return;

    const setClause = fields.map(field => {
      if (field === 'active') {
        return `${field} = ?`;
      }
      return `${field} = ?`;
    }).join(', ');
    
    const values = fields.map(field => {
      if (field === 'active') {
        return updates[field] ? 1 : 0;
      }
      return updates[field as keyof Product];
    });
    
    const stmt = this.db.prepare(`
      UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(...values, id);
  }

  public deleteProduct(id: number): void {
    const stmt = this.db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(id);
  }

  // Operações para Pedidos
  public createOrder(order: Omit<Order, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, total, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      order.customer_name,
      order.customer_email,
      order.customer_phone,
      order.customer_address,
      order.total,
      order.status || 'pending'
    );
    return result.lastInsertRowid as number;
  }

  public getOrder(id: number): Order | undefined {
    const stmt = this.db.prepare('SELECT * FROM orders WHERE id = ?');
    return stmt.get(id) as Order | undefined;
  }

  public getAllOrders(limit: number = 100): Order[] {
    const stmt = this.db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?');
    return stmt.all(limit) as Order[];
  }

  public updateOrderStatus(id: number, status: Order['status']): void {
    const stmt = this.db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(status, id);
  }

  public deleteOrder(id: number): void {
    const stmt = this.db.prepare('DELETE FROM orders WHERE id = ?');
    stmt.run(id);
  }

  // Operações para Itens do Pedido
  public createOrderItem(item: Omit<OrderItem, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      item.order_id,
      item.product_id,
      item.product_name,
      item.quantity,
      item.price
    );
    return result.lastInsertRowid as number;
  }

  public getOrderItems(orderId: number): OrderItem[] {
    const stmt = this.db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id');
    return stmt.all(orderId) as OrderItem[];
  }

  // Operações para Comentários
  public createComment(comment: Omit<Comment, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO comments (product_id, customer_name, rating, text, approved)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      comment.product_id,
      comment.customer_name,
      comment.rating,
      comment.text,
      comment.approved ? 1 : 0
    );
    return result.lastInsertRowid as number;
  }

  public getComment(id: number): Comment | undefined {
    const stmt = this.db.prepare('SELECT * FROM comments WHERE id = ?');
    const result = stmt.get(id) as any;
    
    if (!result) return undefined;
    
    return {
      id: result.id,
      product_id: result.product_id,
      customer_name: result.customer_name,
      rating: result.rating,
      text: result.text,
      approved: result.approved === 1,
      created_at: result.created_at
    };
  }

  public getCommentsByProduct(productId: number, approvedOnly: boolean = false): Comment[] {
    let query = 'SELECT * FROM comments WHERE product_id = ?';
    const params: any[] = [productId];
    
    if (approvedOnly) {
      query += ' AND approved = 1';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as any[];
    
    return results.map(result => ({
      id: result.id,
      product_id: result.product_id,
      customer_name: result.customer_name,
      rating: result.rating,
      text: result.text,
      approved: result.approved === 1,
      created_at: result.created_at
    }));
  }

  public getAllComments(approvedOnly: boolean = false): Comment[] {
    let query = 'SELECT * FROM comments';
    const params: any[] = [];
    
    if (approvedOnly) {
      query += ' WHERE approved = 1';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as any[];
    
    return results.map(result => ({
      id: result.id,
      product_id: result.product_id,
      customer_name: result.customer_name,
      rating: result.rating,
      text: result.text,
      approved: result.approved === 1,
      created_at: result.created_at
    }));
  }

  public updateComment(id: number, updates: Partial<Comment>): void {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return;

    const setClause = fields.map(field => {
      if (field === 'approved') {
        return `${field} = ?`;
      }
      return `${field} = ?`;
    }).join(', ');
    
    const values = fields.map(field => {
      if (field === 'approved') {
        return updates[field] ? 1 : 0;
      }
      return updates[field as keyof Comment];
    });
    
    const stmt = this.db.prepare(`
      UPDATE comments SET ${setClause} WHERE id = ?
    `);
    stmt.run(...values, id);
  }

  public deleteComment(id: number): void {
    const stmt = this.db.prepare('DELETE FROM comments WHERE id = ?');
    stmt.run(id);
  }
}

export default DatabaseService;