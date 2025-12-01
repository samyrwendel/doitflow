# Documentação - Painel E-commerce

## Visão Geral

O painel E-commerce é uma funcionalidade completa para gerenciamento de lojas online, integrada ao sistema Tupperware. Ele permite criar, gerenciar e operar uma loja virtual com produtos, pedidos e comentários, além de fornecer uma interface de loja online para os clientes.

## Funcionalidades

### 1. Gerenciamento da Loja
- Configurações básicas da loja (nome, descrição, contato)
- Personalização de informações de contato e redes sociais
- Geração automática de link estático para a loja online

### 2. Gerenciamento de Produtos
- Cadastro de produtos com nome, descrição, preço, categoria e estoque
- Upload de imagens para produtos
- Ativação/desativação de produtos
- Edição e exclusão de produtos
- Controle de estoque

### 3. Gerenciamento de Pedidos
- Visualização de pedidos recebidos
- Atualização de status dos pedidos (pendente, processando, enviado, entregue, cancelado)
- Detalhes dos pedidos com informações do cliente e itens
- Histórico de alterações de status

### 4. Gerenciamento de Comentários
- Moderação de comentários de clientes
- Aprovação ou rejeição de comentários
- Sistema de avaliação por estrelas
- Controle de conteúdo publicado

## Estrutura dos Componentes

### `EcommerceTab.tsx`
Componente principal do painel de administração, dividido em quatro abas:

1. **Loja**: Configurações gerais da loja e link de acesso
2. **Produtos**: Cadastro e gerenciamento de produtos
3. **Pedidos**: Visualização e gerenciamento de pedidos
4. **Comentários**: Moderação de comentários

### `StoreFront.tsx`
Componente que representa a interface da loja online para clientes, incluindo:

- Exibição de produtos com filtros por categoria e busca
- Carrinho de compras com gestão de itens
- Processo de checkout com formulário de cliente
- Design responsivo e moderno

### `StorePage.tsx`
Componente que encapsula a loja online para ser usado como página independente.

## Armazenamento de Dados

O sistema utiliza o `localStorage` do navegador para armazenar:

- **Produtos**: `ecommerceProducts`
- **Pedidos**: `ecommerceOrders`
- **Comentários**: `ecommerceComments`
- **Configurações**: `ecommerceSettings`
- **Carrinho**: `ecommerceCart`

## Tipos de Dados

### Product
```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  active: boolean;
  createdAt: string;
}
```

### Order
```typescript
interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}
```

### Comment
```typescript
interface Comment {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  text: string;
  approved: boolean;
  createdAt: string;
}
```

### StoreSettings
```typescript
interface StoreSettings {
  name: string;
  description: string;
  logo: string;
  banner: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
  };
}
```

## Como Usar

### 1. Configurando a Loja
1. Acesse a aba "E-commerce" no painel principal
2. Na aba "Loja", configure as informações básicas:
   - Nome da loja
   - Descrição
   - E-mail e telefone de contato
   - Endereço
3. Copie o link gerado para compartilhar com clientes

### 2. Adicionando Produtos
1. Na aba "Produtos", preencha o formulário de adição:
   - Nome do produto (obrigatório)
   - Descrição (obrigatória)
   - Preço (obrigatório)
   - Categoria
   - Estoque
   - URL da imagem
2. Clique em "Adicionar Produto"
3. Para editar, clique no ícone de edição na lista de produtos

### 3. Gerenciando Pedidos
1. Na aba "Pedidos", visualize todos os pedidos recebidos
2. Clique no ícone de olho para ver detalhes do pedido
3. Use o seletor de status para atualizar a situação do pedido
4. Os status disponíveis são: Pendente, Processando, Enviado, Entregue, Cancelado

### 4. Moderando Comentários
1. Na aba "Comentários", visualize todos os comentários recebidos
2. Comentários não aprovados aparecem com status "Pendente"
3. Use os ícones de aprovação (✓) ou rejeição (✗) para moderar
4. Comentários aprovados aparecem na loja online

## Acesso à Loja Online

### Via Painel
1. Copie o link estático gerado na aba "Loja"
2. Compartilhe este link com clientes

### Via URL Direta
A loja também pode ser acessada diretamente através das seguintes URLs:
- `http://localhost:5174/store` (ambiente de desenvolvimento)
- `http://seu-dominio.com/store` (ambiente de produção)

## Integração com o Sistema Principal

O painel E-commerce está integrado ao sistema principal através:

- **Autenticação**: Utiliza o mesmo sistema de login do painel principal
- **Navegação**: Acessível através da aba "E-commerce" no menu principal
- **Estilo**: Mantém a consistência visual com o resto da aplicação

## Personalização Visual

A loja online utiliza o mesmo sistema de temas do painel principal:
- Tema escuro por padrão
- Cores consistentes com a marca Tupperware
- Design responsivo para dispositivos móveis

## Funcionalidades Futuras

Algumas funcionalidades que podem ser implementadas no futuro:

1. **Integração com Gateways de Pagamento**: PayPal, Stripe, Mercado Pago
2. **Cálculo Automático de Frete**: Correios, transportadoras
3. **Sistema de Notificações**: E-mail para clientes sobre status de pedidos
4. **Relatórios e Análises**: Vendas, produtos mais vendidos, métricas
5. **Gestão de Estoques Avançada**: Alertas de baixo estoque, previsões
6. **Sistema de Promoções**: Cupons de desconto, ofertas especiais
7. **Integração com Redes Sociais**: Compartilhamento automático
8. **Otimização para SEO**: Meta tags, sitemaps, estrutura semântica

## Considerações Técnicas

- **Performance**: O uso do localStorage torna o sistema rápido, mas limitado
- **Escalabilidade**: Para grandes volumes, considere migração para banco de dados
- **Segurança**: Implementar validações adicionais no lado do servidor
- **Backup**: Implementar sistema de backup dos dados da loja

## Suporte e Manutenção

Para dúvidas ou problemas relacionados ao painel E-commerce:

1. Verifique o console do navegador para erros
2. Limpe o localStorage se houver problemas com dados
3. Recarregue a página para atualizar as informações
4. Entre em contato com o suporte técnico para assistência adicional