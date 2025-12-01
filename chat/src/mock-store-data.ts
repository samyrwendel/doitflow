// Script para popular o banco de dados com dados de exemplo da loja Tupperware

import { Product, StoreSettings, Comment } from './components/tabs/EcommerceTab';
import ecommerceService from './services/ecommerceService';

// Configurações da loja
const storeSettings: StoreSettings = {
  name: 'Tupperware Brasil',
  description: 'Há mais de 75 anos transformingando vidas e lares com produtos inovadores que facilitam o dia a dia das famílias brasileiras.',
  logo: '/logotw.png',
  banner: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80',
  contactEmail: 'contato@tupperware.com.br',
  contactPhone: '(11) 3003-1234',
  address: 'Av. das Nações Unidas, 12.555 - São Paulo, SP',
  socialMedia: {
    facebook: 'https://facebook.com/tupperwarebrasil',
    instagram: 'https://instagram.com/tupperwarebrasil',
    twitter: 'https://twitter.com/tupperwarebrasil'
  }
};

// Produtos de exemplo
const products: Product[] = [
  {
    id: '1',
    name: 'Jogo de Tupperware Classic 4 Peças',
    description: 'Conjunto clássico com recipientes de diferentes tamanhos perfeitos para armazenar alimentos. Feitos com material de alta qualidade que preserva o sabor e frescor dos alimentos.',
    price: 129.90,
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80',
    category: 'Recipientes',
    stock: 15,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Garrafa Térmica Tupperware 1L',
    description: 'Mantenha suas bebidas na temperatura ideal por até 12 horas. Design elegante e moderno, perfeita para levar ao trabalho, academia ou passeios.',
    price: 89.90,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1887&q=80',
    category: 'Garrafas',
    stock: 8,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Jogo de Talheres Tupperware 24 Peças',
    description: 'Conjunto completo de talheres para 6 pessoas, fabricados em aço inoxidável de alta qualidade. Design ergonômico e acabamento espelhado.',
    price: 199.90,
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1887&q=80',
    category: 'Talheres',
    stock: 5,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Frigideira Antiaderente Tupperware 28cm',
    description: 'Frigideira com revestimento antiaderente de última geração, ideal para preparações saudáveis com pouco ou nenhum óleo. Alça ergonômica e resistente.',
    price: 159.90,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80',
    category: 'Panelas',
    stock: 12,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Conjunto de Potes Herméticos 6 Peças',
    description: 'Recipientes com sistema de vedação hermética que mantém os alimentos frescos por mais tempo. Perfeitos para armazenar na geladeira ou freezer.',
    price: 79.90,
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1887&q=80',
    category: 'Recipientes',
    stock: 20,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Liquidificador Tupperware 600W',
    description: 'Potente liquidificador com 600W de potência e 3 velocidades. Lâminas em aço inoxidável e copo de vidro resistente. Perfeito para vitaminas, sopas e molhos.',
    price: 249.90,
    image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1887&q=80',
    category: 'Eletrodomésticos',
    stock: 7,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '7',
    name: 'Jogo de Pratos Tupperware 24 Peças',
    description: 'Conjunto elegante de pratos para 6 pessoas, incluindo pratos de sobremesa, fundos e rasos. Design moderno e resistente para uso diário.',
    price: 189.90,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80',
    category: 'Louças',
    stock: 10,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '8',
    name: 'Conjunto de Facas Tupperware 5 Peças',
    description: 'Conjunto completo de facas com lâminas em aço inoxidável de alta qualidade. Inclui suporte de bambu e afiador. Design ergonômico para maior conforto.',
    price: 179.90,
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1887&q=80',
    category: 'Facas',
    stock: 6,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '9',
    name: 'Forma para Bolo Redonda 25cm',
    description: 'Forma antiaderente de alta qualidade para bolos perfeitos. Revestimento cerâmico livre de PFOA. Ideal para aniversários e celebrações.',
    price: 69.90,
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1887&q=80',
    category: 'Formas',
    stock: 15,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '10',
    name: 'Jogo de Copos Tupperware 6 Peças',
    description: 'Conjunto de copos de vidro temperado resistentes e elegantes. Capacidade de 300ml cada. Perfeitos para uso diário e ocasiões especiais.',
    price: 59.90,
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1887&q=80',
    category: 'Copos',
    stock: 18,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '11',
    name: 'Escorredor de Macarrão Tupperware',
    description: 'Escorredor prático com design inovador que facilita o preparo de massas. Material resistente e fácil de limpar. Inclui tampa para armazenamento.',
    price: 49.90,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80',
    category: 'Utensílios',
    stock: 25,
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '12',
    name: 'Conjunto de Especiarias 12 Potes',
    description: 'Organize suas especiarias com este conjunto elegante de 12 potes. Inclui suporte giratório e etiquetas personalizáveis. Vedação hermética.',
    price: 89.90,
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1887&q=80',
    category: 'Organização',
    stock: 14,
    active: true,
    createdAt: new Date().toISOString()
  }
];

// Comentários de exemplo
const comments: Comment[] = [
  {
    id: '1',
    productId: '1',
    customerName: 'Maria Silva',
    rating: 5,
    text: 'Adorei meu jogo de Tupperware! Os potes são muito práticos e mantêm os alimentos frescos por muito mais tempo. Recomendo!',
    approved: true,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: '2',
    productId: '2',
    customerName: 'João Santos',
    rating: 4,
    text: 'Garrafa térmica excelente! Mantém a temperatura por muitas horas. Único ponto negativo é que poderia ser mais leve.',
    approved: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: '3',
    productId: '3',
    customerName: 'Ana Oliveira',
    rating: 5,
    text: 'Os talheres são de altíssima qualidade! O acabamento é impecável e o design muito elegante. Vale cada centavo!',
    approved: true,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: '4',
    productId: '4',
    customerName: 'Carlos Pereira',
    rating: 5,
    text: 'Frigideira fantástica! Nada gruda e a limpeza é super fácil. Já preparei várias receitas e todas ficaram perfeitas.',
    approved: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: '5',
    productId: '5',
    customerName: 'Fernanda Lima',
    rating: 4,
    text: 'Ótimos potes herméticos! A vedação é realmente eficiente. Só acho que poderiam vir em mais cores.',
    approved: true,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: '6',
    productId: '6',
    customerName: 'Roberto Costa',
    rating: 5,
    text: 'Liquidificador potente e versátil! Uso diariamente para vitaminas e funciona perfeitamente. Muito satisfeito com a compra.',
    approved: true,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: '7',
    productId: '7',
    customerName: 'Juliana Martins',
    rating: 5,
    text: 'Os pratos são lindos e resistentes! Já recebi muitos elogios dos visitantes. Comprei outro conjunto para dar de presente.',
    approved: true,
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString()
  },
  {
    id: '8',
    productId: '8',
    customerName: 'Pedro Almeida',
    rating: 4,
    text: 'Facas muito afiadas e de boa qualidade! O suporte em bambou é um diferencial. Recomendo para quem cozinha.',
    approved: true,
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString()
  }
];

// Função para popular o banco de dados
export async function populateMockData() {
  try {
    // Inicializar banco de dados se necessário
    await ecommerceService.initializeDatabase();
    
    // Salvar configurações da loja
    await ecommerceService.updateStoreSettings({
      name: storeSettings.name,
      description: storeSettings.description,
      logo: storeSettings.logo,
      banner: storeSettings.banner,
      contact_email: storeSettings.contactEmail,
      contact_phone: storeSettings.contactPhone,
      address: storeSettings.address,
      social_media_facebook: storeSettings.socialMedia.facebook,
      social_media_instagram: storeSettings.socialMedia.instagram,
      social_media_twitter: storeSettings.socialMedia.twitter
    });
    
    // Salvar produtos
    for (const product of products) {
      await ecommerceService.createProduct({
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image,
        category: product.category,
        stock: product.stock,
        active: product.active
      });
    }
    
    // Salvar comentários
    for (const comment of comments) {
      await ecommerceService.createComment({
        product_id: parseInt(comment.productId),
        customer_name: comment.customerName,
        rating: comment.rating,
        text: comment.text,
        approved: comment.approved
      });
    }

    console.log('Dados de exemplo da loja Tupperware foram carregados com sucesso!');
    console.log(`Produtos: ${products.length}`);
    console.log(`Comentários: ${comments.length}`);
    console.log(`Configurações da loja: ${storeSettings.name}`);
    
    return true;
  } catch (error) {
    console.error('Erro ao popular dados de exemplo:', error);
    return false;
  }
}

// Não executar automaticamente ao importar
// A função será chamada explicitamente quando necessário