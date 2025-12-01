import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FaShoppingCart,
  FaPlus,
  FaMinus,
  FaTrash,
  FaStore,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaFacebook,
  FaInstagram,
  FaTwitter
} from 'react-icons/fa';

// Tipos para os dados da loja
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

interface CartItem {
  product: Product;
  quantity: number;
}

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

interface OrderForm {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  notes: string;
}

export function StoreFront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    name: 'Minha Loja',
    description: 'Descrição da loja',
    logo: '',
    banner: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: ''
    }
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderForm, setOrderForm] = useState<OrderForm>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    address: '',
    notes: ''
  });
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Carregar dados do localStorage ao inicializar
  useEffect(() => {
    const savedProducts = localStorage.getItem('ecommerceProducts');
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    }

    const savedSettings = localStorage.getItem('ecommerceSettings');
    if (savedSettings) {
      setStoreSettings(JSON.parse(savedSettings));
    }

    // Carregar carrinho do localStorage
    const savedCart = localStorage.getItem('ecommerceCart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Salvar carrinho no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('ecommerceCart', JSON.stringify(cart));
  }, [cart]);

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'todos' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    return product.active && matchesCategory && matchesSearch;
  });

  // Obter categorias únicas
  const categories = ['todos', ...Array.from(new Set(products.filter(p => p.active).map(p => p.category).filter(Boolean)))];

  // Adicionar produto ao carrinho
  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { product, quantity: 1 }];
      }
    });
  };

  // Remover produto do carrinho
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  // Atualizar quantidade do produto no carrinho
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  // Calcular total do carrinho
  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  // Limpar carrinho
  const clearCart = () => {
    setCart([]);
  };

  // Finalizar pedido
  const handleCheckout = () => {
    if (!orderForm.customerName || !orderForm.customerEmail || !orderForm.customerPhone) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Criar objeto do pedido
    const order = {
      id: Date.now().toString(),
      customerName: orderForm.customerName,
      customerEmail: orderForm.customerEmail,
      customerPhone: orderForm.customerPhone,
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      })),
      total: cartTotal,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Salvar pedido no localStorage
    const existingOrders = JSON.parse(localStorage.getItem('ecommerceOrders') || '[]');
    localStorage.setItem('ecommerceOrders', JSON.stringify([...existingOrders, order]));

    // Limpar formulário e carrinho
    setOrderForm({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      address: '',
      notes: ''
    });
    clearCart();
    setIsCheckoutOpen(false);
    setOrderSuccess(true);

    // Esconder mensagem de sucesso após 5 segundos
    setTimeout(() => setOrderSuccess(false), 5000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FaStore className="h-6 w-6 text-blue-500" />
                <h1 className="text-xl font-bold">{storeSettings.name}</h1>
              </div>
            </div>
            <Button
              onClick={() => setIsCartOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 relative"
            >
              <FaShoppingCart className="w-4 h-4 mr-2" />
              Carrinho
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cart.reduce((total, item) => total + item.quantity, 0)}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Banner */}
      {storeSettings.banner && (
        <div className="relative h-64 bg-gray-800">
          <img
            src={storeSettings.banner}
            alt="Banner da loja"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">{storeSettings.name}</h2>
              <p className="text-lg">{storeSettings.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem de sucesso */}
      {orderSuccess && (
        <div className="bg-green-600 text-white p-4 text-center">
          Pedido realizado com sucesso! Entraremos em contato em breve.
        </div>
      )}

      {/* Conteúdo principal */}
      <main className="container mx-auto px-4 py-8">
        {/* Barra de pesquisa e filtros */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-700 text-white hover:bg-gray-800'}
                >
                  {category === 'todos' ? 'Todos' : category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de produtos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-16">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400 text-lg">Nenhum produto encontrado</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <Card key={product.id} className="bg-gray-900 border-gray-800 overflow-hidden hover:border-gray-700 transition-colors">
                <div className="aspect-square bg-gray-800 relative">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaStore className="h-12 w-12 text-gray-600" />
                    </div>
                  )}
                  {product.stock <= 5 && (
                    <Badge className="absolute top-2 right-2 bg-orange-600">
                      Últimas {product.stock} unidades
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-white mb-2">{product.name}</h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-green-400">R$ {product.price.toFixed(2)}</span>
                    <Button
                      onClick={() => addToCart(product)}
                      className="bg-blue-600 hover:bg-blue-700"
                      size="sm"
                      disabled={product.stock === 0}
                    >
                      <FaPlus className="w-3 h-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaStore className="h-5 w-5 text-blue-500" />
                {storeSettings.name}
              </h3>
              <p className="text-gray-400">{storeSettings.description}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contato</h3>
              <div className="space-y-2 text-gray-400">
                {storeSettings.contactEmail && (
                  <div className="flex items-center gap-2">
                    <FaEnvelope className="h-4 w-4" />
                    <span>{storeSettings.contactEmail}</span>
                  </div>
                )}
                {storeSettings.contactPhone && (
                  <div className="flex items-center gap-2">
                    <FaPhone className="h-4 w-4" />
                    <span>{storeSettings.contactPhone}</span>
                  </div>
                )}
                {storeSettings.address && (
                  <div className="flex items-center gap-2">
                    <FaMapMarkerAlt className="h-4 w-4" />
                    <span>{storeSettings.address}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Redes Sociais</h3>
              <div className="flex gap-4">
                {storeSettings.socialMedia.facebook && (
                  <a href={storeSettings.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    <FaFacebook className="h-5 w-5" />
                  </a>
                )}
                {storeSettings.socialMedia.instagram && (
                  <a href={storeSettings.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    <FaInstagram className="h-5 w-5" />
                  </a>
                )}
                {storeSettings.socialMedia.twitter && (
                  <a href={storeSettings.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    <FaTwitter className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} {storeSettings.name}. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Carrinho */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Seu Carrinho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Seu carrinho está vazio</p>
            ) : (
              <>
                <ScrollArea className="max-h-64">
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex items-center gap-3 bg-gray-800 p-3 rounded">
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{item.product.name}</h4>
                          <p className="text-sm text-gray-400">R$ {item.product.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="text-gray-400 hover:text-white h-8 w-8 p-0"
                          >
                            <FaMinus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="text-gray-400 hover:text-white h-8 w-8 p-0"
                          >
                            <FaPlus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                          >
                            <FaTrash className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-lg font-bold text-green-400">R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={clearCart}
                      className="flex-1 border-gray-700 text-white hover:bg-gray-800"
                    >
                      Limpar
                    </Button>
                    <Button
                      onClick={() => {
                        setIsCartOpen(false);
                        setIsCheckoutOpen(true);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Finalizar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Finalizar Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-800 p-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-green-400">R$ {cartTotal.toFixed(2)}</span>
              </div>
              <div className="text-sm text-gray-400">
                {cart.reduce((total, item) => total + item.quantity, 0)} itens
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="customerName" className="block text-sm font-medium text-gray-300 mb-1">
                  Nome Completo *
                </Label>
                <Input
                  id="customerName"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm({...orderForm, customerName: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="customerEmail" className="block text-sm font-medium text-gray-300 mb-1">
                  E-mail *
                </Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={orderForm.customerEmail}
                  onChange={(e) => setOrderForm({...orderForm, customerEmail: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone" className="block text-sm font-medium text-gray-300 mb-1">
                  Telefone *
                </Label>
                <Input
                  id="customerPhone"
                  value={orderForm.customerPhone}
                  onChange={(e) => setOrderForm({...orderForm, customerPhone: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-1">
                  Endereço de Entrega
                </Label>
                <Textarea
                  id="address"
                  value={orderForm.address}
                  onChange={(e) => setOrderForm({...orderForm, address: e.target.value})}
                  rows={2}
                  className="bg-gray-800 border-gray-700 text-white resize-none"
                />
              </div>
              <div>
                <Label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">
                  Observações
                </Label>
                <Textarea
                  id="notes"
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                  rows={2}
                  className="bg-gray-800 border-gray-700 text-white resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCheckoutOpen(false)}
                className="flex-1 border-gray-700 text-white hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCheckout}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Confirmar Pedido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}