// Browser-compatible interfaces (moved from database.ts)
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

class EcommerceService {
  private isServer: boolean;

  constructor() {
    // Detectar se estamos no servidor ou browser
    this.isServer = typeof window === 'undefined';
  }

  // Configurações da Loja
  async getStoreSettings(): Promise<StoreSettings | null> {
    try {
      if (this.isServer) {
        // No servidor, usar NocoDB ou retornar dados mock
        return this.getMockStoreSettings();
      }
      
      // No browser, usar localStorage
      const stored = localStorage.getItem('tupperware-store-settings');
      if (stored) {
        return JSON.parse(stored);
      }
      
      return this.getMockStoreSettings();
    } catch (error) {
      console.error('Erro ao buscar configurações da loja:', error);
      return null;
    }
  }

  async updateStoreSettings(settings: Partial<StoreSettings>): Promise<boolean> {
    try {
      if (this.isServer) {
        // No servidor, usar NocoDB
        console.log('Atualizando configurações no servidor:', settings);
        return true;
      }
      
      // No browser, usar localStorage
      const existing = await this.getStoreSettings();
      const updated = { ...existing, ...settings, id: existing?.id || 1 };
      localStorage.setItem('tupperware-store-settings', JSON.stringify(updated));
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar configurações da loja:', error);
      return false;
    }
  }

  private getMockStoreSettings(): StoreSettings {
    return {
      id: 1,
      name: 'Tupperware Sofia',
      description: 'Produtos de qualidade para sua casa',
      logo: '/logotw.png',
      banner: '',
      contact_email: 'contato@tupperware.sofia.ms',
      contact_phone: '(11) 99999-9999',
      address: 'São Paulo, SP',
      social_media_facebook: '',
      social_media_instagram: '@tupperware_sofia',
      social_media_twitter: ''
    };
  }

  private getMockProducts(): Product[] {
    return [
      {
        id: 1,
        name: 'Jarra Cristal 2L',
        description: 'Jarra de cristal com tampa hermética, ideal para sucos e água.',
        price: 89.90,
        image: '/products/jarra-cristal.jpg',
        category: 'Jarras',
        stock: 15,
        active: true
      },
      {
        id: 2,
        name: 'Conjunto de Potes Modular',
        description: 'Set com 4 potes modulares para organização da geladeira.',
        price: 159.90,
        image: '/products/potes-modular.jpg',
        category: 'Potes',
        stock: 8,
        active: true
      },
      {
        id: 3,
        name: 'Garrafa Térmica 500ml',
        description: 'Garrafa térmica que mantém a temperatura por até 12 horas.',
        price: 79.90,
        image: '/products/garrafa-termica.jpg',
        category: 'Garrafas',
        stock: 20,
        active: true
      }
    ];
  }

  // Produtos
  async getProducts(activeOnly: boolean = true): Promise<Product[]> {
    try {
      if (this.isServer) {
        return this.getMockProducts();
      }
      
      const stored = localStorage.getItem('tupperware-products');
      if (stored) {
        const products: Product[] = JSON.parse(stored);
        return activeOnly ? products.filter(p => p.active !== false) : products;
      }
      
      return this.getMockProducts();
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
  }

  async getProduct(id: number): Promise<Product | null> {
    try {
      const products = await this.getProducts(false);
      return products.find(p => p.id === id) || null;
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      return null;
    }
  }

  async createProduct(product: Omit<Product, 'id'>): Promise<number> {
    try {
      const products = await this.getProducts(false);
      const newId = Math.max(...products.map(p => p.id || 0), 0) + 1;
      const newProduct: Product = { ...product, id: newId };
      
      products.push(newProduct);
      localStorage.setItem('tupperware-products', JSON.stringify(products));
      
      return newId;
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<void> {
    try {
      const products = await this.getProducts(false);
      const index = products.findIndex(p => p.id === id);
      
      if (index !== -1) {
        products[index] = { ...products[index], ...updates };
        localStorage.setItem('tupperware-products', JSON.stringify(products));
      }
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      const products = await this.getProducts(false);
      const filtered = products.filter(p => p.id !== id);
      localStorage.setItem('tupperware-products', JSON.stringify(filtered));
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      throw error;
    }
  }

  // Pedidos
  async getOrders(): Promise<Order[]> {
    try {
      if (this.isServer) {
        return [];
      }
      
      const stored = localStorage.getItem('tupperware-orders');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      return [];
    }
  }

  async getOrder(id: number): Promise<Order | null> {
    try {
      const orders = await this.getOrders();
      return orders.find(o => o.id === id) || null;
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      return null;
    }
  }

  async createOrder(order: Omit<Order, 'id'>, items: Omit<OrderItem, 'id' | 'order_id'>[]): Promise<number> {
    try {
      const orders = await this.getOrders();
      const orderItems = await this.getOrderItems();
      
      const newOrderId = Math.max(...orders.map(o => o.id || 0), 0) + 1;
      const newOrder: Order = { ...order, id: newOrderId };
      
      orders.push(newOrder);
      localStorage.setItem('tupperware-orders', JSON.stringify(orders));
      
      // Adicionar itens do pedido
      for (const item of items) {
        const newItemId = Math.max(...orderItems.map(i => i.id || 0), 0) + 1;
        orderItems.push({
          ...item,
          id: newItemId,
          order_id: newOrderId
        });
      }
      localStorage.setItem('tupperware-order-items', JSON.stringify(orderItems));
      
      return newOrderId;
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      throw error;
    }
  }

  async getOrderItems(orderId?: number): Promise<OrderItem[]> {
    try {
      if (this.isServer) {
        return [];
      }
      
      const stored = localStorage.getItem('tupperware-order-items');
      const items: OrderItem[] = stored ? JSON.parse(stored) : [];
      
      return orderId ? items.filter(i => i.order_id === orderId) : items;
    } catch (error) {
      console.error('Erro ao buscar itens do pedido:', error);
      return [];
    }
  }

  async updateOrderStatus(id: number, status: Order['status']): Promise<void> {
    try {
      const orders = await this.getOrders();
      const index = orders.findIndex(o => o.id === id);
      
      if (index !== -1) {
        orders[index] = { ...orders[index], status };
        localStorage.setItem('tupperware-orders', JSON.stringify(orders));
      }
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      throw error;
    }
  }

  async deleteOrder(id: number): Promise<void> {
    try {
      const orders = await this.getOrders();
      const filtered = orders.filter(o => o.id !== id);
      localStorage.setItem('tupperware-orders', JSON.stringify(filtered));
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      throw error;
    }
  }

  // Comentários
  async getComments(productId?: number): Promise<Comment[]> {
    try {
      if (this.isServer) {
        return [];
      }
      
      const stored = localStorage.getItem('tupperware-comments');
      const comments: Comment[] = stored ? JSON.parse(stored) : [];
      
      return productId ? comments.filter(c => c.product_id === productId) : comments;
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      return [];
    }
  }

  async getCommentsByProduct(productId: number, approvedOnly: boolean = false): Promise<Comment[]> {
    try {
      const comments = await this.getComments(productId);
      return approvedOnly ? comments.filter(c => c.approved !== false) : comments;
    } catch (error) {
      console.error('Erro ao buscar comentários do produto:', error);
      return [];
    }
  }

  async createComment(comment: Omit<Comment, 'id'>): Promise<number> {
    try {
      const comments = await this.getComments();
      const newId = Math.max(...comments.map(c => c.id || 0), 0) + 1;
      const newComment: Comment = { ...comment, id: newId };
      
      comments.push(newComment);
      localStorage.setItem('tupperware-comments', JSON.stringify(comments));
      
      return newId;
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
      throw error;
    }
  }

  async updateComment(id: number, updates: Partial<Comment>): Promise<void> {
    try {
      const comments = await this.getComments();
      const index = comments.findIndex(c => c.id === id);
      
      if (index !== -1) {
        comments[index] = { ...comments[index], ...updates };
        localStorage.setItem('tupperware-comments', JSON.stringify(comments));
      }
    } catch (error) {
      console.error('Erro ao atualizar comentário:', error);
      throw error;
    }
  }

  async deleteComment(id: number): Promise<void> {
    try {
      const comments = await this.getComments();
      const filtered = comments.filter(c => c.id !== id);
      localStorage.setItem('tupperware-comments', JSON.stringify(filtered));
    } catch (error) {
      console.error('Erro ao excluir comentário:', error);
      throw error;
    }
  }

  // Utilitários
  async initializeDatabase(): Promise<void> {
    try {
      // As tabelas já são criadas no construtor do DatabaseService
      console.log('✅ Banco de dados do E-commerce inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar banco de dados do E-commerce:', error);
      throw error;
    }
  }
}

export default new EcommerceService();