-- Migration para criar tabelas de E-commerce

-- Tabela para configurações da loja
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para produtos
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  image TEXT,
  category TEXT,
  stock INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para pedidos
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  total REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para itens do pedido
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Tabela para comentários
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  approved BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_product_id ON comments(product_id);
CREATE INDEX IF NOT EXISTS idx_comments_approved ON comments(approved);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER IF NOT EXISTS update_store_settings_timestamp 
  AFTER UPDATE ON store_settings
  BEGIN
    UPDATE store_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_products_timestamp 
  AFTER UPDATE ON products
  BEGIN
    UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_orders_timestamp 
  AFTER UPDATE ON orders
  BEGIN
    UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Inserir configurações da loja
INSERT INTO store_settings (
  name, description, logo, banner, contact_email, contact_phone, address,
  social_media_facebook, social_media_instagram, social_media_twitter
) VALUES (
  'Tupperware Brasil',
  'A melhor qualidade em produtos para armazenamento e organização da sua casa.',
  'https://i.imgur.com/8QK7m0L.png',
  'https://i.imgur.com/8QK7m0L.png',
  'contato@tupperware.com.br',
  '(11) 9999-8888',
  'Av. Paulista, 1000 - São Paulo, SP',
  'https://facebook.com/tupperwarebrasil',
  'https://instagram.com/tupperwarebrasil',
  'https://twitter.com/tupperwarebrasil'
);

-- Inserir produtos de exemplo
INSERT INTO products (name, description, price, image, category, stock, active) VALUES
('Conjunto Classic Sheer', 'Conjunto de recipientes com design elegante e tampa hermética.', 129.90, 'https://i.imgur.com/8QK7m0L.png', 'Recipientes', 50, 1),
('Garrafa Tupperware', 'Garrafa térmica que mantém sua bebida na temperatura ideal por horas.', 89.90, 'https://i.imgur.com/8QK7m0L.png', 'Garrafas', 30, 1),
('Kit Talheres Executivo', 'Talheres de alta qualidade em estojo prático para transporte.', 69.90, 'https://i.imgur.com/8QK7m0L.png', 'Talheres', 40, 1),
('Panela de Pressão', 'Panela de pressão com sistema de segurança avançado.', 199.90, 'https://i.imgur.com/8QK7m0L.png', 'Panelas', 20, 1),
('Jogo de Tupperware', 'Jogo completo com diversos tamanhos para todas as necessidades.', 249.90, 'https://i.imgur.com/8QK7m0L.png', 'Recipientes', 15, 1),
('Pote para Micro-ondas', 'Pote seguro para micro-ondas com tampa de ventilação.', 39.90, 'https://i.imgur.com/8QK7m0L.png', 'Recipientes', 60, 1),
('Conjunto de Frascos', 'Frascos perfeitos para armazenar especiarias e temperos.', 49.90, 'https://i.imgur.com/8QK7m0L.png', 'Recipientes', 45, 1),
('Garrafa de Água', 'Garrafa de água com design ergonômico e capacidade de 1L.', 59.90, 'https://i.imgur.com/8QK7m0L.png', 'Garrafas', 70, 1),
('Kit Organizador', 'Kit completo para organizar sua cozinha de forma prática.', 99.90, 'https://i.imgur.com/8QK7m0L.png', 'Organizadores', 35, 1),
('Conjunto de Copos', 'Copos resistentes com design moderno e cores vibrantes.', 79.90, 'https://i.imgur.com/8QK7m0L.png', 'Copos', 55, 1),
('Forma para Bolo', 'Forma antiaderente perfeita para todos os tipos de receitas.', 89.90, 'https://i.imgur.com/8QK7m0L.png', 'Formas', 25, 1),
('Escorredor de Macarrão', 'Escorredor prático com alça ergonômica e design moderno.', 49.90, 'https://i.imgur.com/8QK7m0L.png', 'Utensílios', 40, 1);

-- Inserir comentários de exemplo
INSERT INTO comments (product_id, customer_name, rating, text, approved) VALUES
(1, 'Ana Silva', 5, 'Adorei o conjunto! A qualidade é excepcional e o design é lindo.', 1),
(2, 'Carlos Oliveira', 4, 'Ótima garrafa, mantém a temperatura por bastante tempo.', 1),
(3, 'Mariana Santos', 5, 'Os talheres são de ótima qualidade e o estojo é muito prático.', 1),
(4, 'Roberto Ferreira', 5, 'Melhor panela de pressão que já usei! Muito segura e eficiente.', 1),
(5, 'Juliana Costa', 4, 'O jogo é completo e os recipientes são muito versáteis.', 1),
(6, 'Fernando Lima', 5, 'Perfeito para levar o almoço! A tampa de ventilação é muito útil.', 1),
(7, 'Patricia Almeida', 4, 'Ótimos frascos, minha cozinha ficou muito mais organizada.', 1),
(8, 'Ricardo Mendes', 5, 'Garrafa de excelente qualidade, já estou usando no dia a dia.', 1);