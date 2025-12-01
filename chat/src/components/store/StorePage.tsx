import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FaShoppingCart, FaStar, FaStore, FaPhone, FaEnvelope, FaMapMarkerAlt, FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';
import ecommerceService from '@/services/ecommerceService';
import { Product, StoreSettings, Comment } from '../tabs/EcommerceTab';

interface CartItem {
  product: Product;
  quantity: number;
}

export function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Carregar configurações da loja
        const settings = await ecommerceService.getStoreSettings();
        if (settings) {
          setStoreSettings({
            name: settings.name,
            description: settings.description || '',
            logo: settings.logo || '',
            banner: settings.banner || '',
            contactEmail: settings.contact_email || '',
            contactPhone: settings.contact_phone || '',
            address: settings.address || '',
            socialMedia: {
              facebook: settings.social_media_facebook || '',
              instagram: settings.social_media_instagram || '',
              twitter: settings.social_media_twitter || ''
            }
          });
        }
        
        // Carregar produtos ativos
        const productsData = await ecommerceService.getProducts();
        setProducts(productsData
          .filter(p => p.active)
          .map(p => ({
            id: p.id?.toString() || '',
            name: p.name,
            description: p.description || '',
            price: p.price,
            image: p.image || '',
            category: p.category || '',
            stock: p.stock,
            active: p.active || false,
            createdAt: p.created_at || new Date().toISOString()
          })));
        
        // Carregar comentários aprovados
        const commentsData = await ecommerceService.getComments();
        setComments(commentsData
          .filter(c => c.approved)
          .map(c => ({
            id: c.id?.toString() || '',
            productId: c.product_id.toString(),
            customerName: c.customer_name,
            rating: c.rating,
            text: c.text || '',
            approved: c.approved || false,
            createdAt: c.created_at || new Date().toISOString()
          })));
        
        // Carregar carrinho do localStorage
        const savedCart = localStorage.getItem('ecommerceCart');
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
      } catch (error) {
        console.error('Erro ao carregar dados da loja:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Salvar carrinho no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('ecommerceCart', JSON.stringify(cart));
  }, [cart]);

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

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handlePlaceOrder = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
      alert('Por favor, preencha todas as informações de contato.');
      return;
    }
    
    if (cart.length === 0) {
      alert('Seu carrinho está vazio.');
      return;
    }
    
    try {
      // Preparar itens do pedido
      const orderItems = cart.map(item => ({
        product_id: parseInt(item.product.id),
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      }));
      
      // Criar pedido com itens
      await ecommerceService.createOrder({
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        total: getTotalPrice(),
        status: 'pending'
      }, orderItems);
      
      // Atualizar estoque
      for (const item of cart) {
        await ecommerceService.updateProduct(parseInt(item.product.id), {
          stock: item.product.stock - item.quantity
        });
      }
      
      // Limpar carrinho
      setCart([]);
      setIsCheckoutOpen(false);
      setIsOrderPlaced(true);
      
      // Esconder mensagem de sucesso após 5 segundos
      setTimeout(() => setIsOrderPlaced(false), 5000);
    } catch (error) {
      console.error('Erro ao realizar pedido:', error);
      alert('Erro ao realizar pedido. Tente novamente.');
    }
  };

  const getProductComments = (productId: string) => {
    return comments.filter(comment => comment.productId === productId);
  };

  const getAverageRating = (productId: string) => {
    const productComments = getProductComments(productId);
    if (productComments.length === 0) return 0;
    
    const totalRating = productComments.reduce((sum, comment) => sum + comment.rating, 0);
    return totalRating / productComments.length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando loja...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Cabeçalho da Loja */}
      <header className="relative bg-gray-800">
        {storeSettings?.banner && (
          <div 
            className="h-64 bg-cover bg-center" 
            style={{ backgroundImage: `url(${storeSettings.banner})` }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-center">
                {storeSettings.logo && (
                  <img 
                    src={storeSettings.logo} 
                    alt={storeSettings.name} 
                    className="h-24 mx-auto mb-4"
                  />
                )}
                <h1 className="text-4xl font-bold">{storeSettings.name}</h1>
                <p className="text-xl mt-2 max-w-2xl mx-auto">{storeSettings.description}</p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mensagem de Pedido Realizado */}
      {isOrderPlaced && (
        <div className="bg-green-600 text-white py-4 text-center">
          Pedido realizado com sucesso! Entraremos em contato em breve.
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Conteúdo Principal */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6">Nossos Produtos</h2>
            
            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Nenhum produto disponível no momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                  <Card key={product.id} className="bg-gray-800 border-gray-700 overflow-hidden">
                    <div className="h-48 bg-gray-700 flex items-center justify-center">
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-500 text-sm">Imagem não disponível</div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{product.name}</h3>
                        <span className="text-green-400 font-bold">R$ {product.price.toFixed(2)}</span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
                      
                      <div className="flex items-center mb-3">
                        <div className="flex mr-2">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(getAverageRating(product.id)) ? 'text-yellow-400' : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-400">
                          {getProductComments(product.id).length} avaliações
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">
                          Estoque: {product.stock > 0 ? product.stock : 'Esgotado'}
                        </span>
                        <Button
                          onClick={() => addToCart(product)}
                          disabled={product.stock === 0}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <FaShoppingCart className="mr-2" />
                          Adicionar
                        </Button>
                      </div>
                      
                      <div className="mt-3">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="text-blue-400 hover:text-blue-300 p-0 h-auto text-sm"
                              onClick={() => setSelectedProduct(product)}
                            >
                              Ver detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-white text-xl">{selectedProduct?.name}</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                {selectedProduct?.image ? (
                                  <img 
                                    src={selectedProduct.image} 
                                    alt={selectedProduct.name} 
                                    className="w-full h-64 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-full h-64 bg-gray-700 rounded flex items-center justify-center">
                                    <span className="text-gray-500">Imagem não disponível</span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="mb-4">
                                  <span className="text-2xl font-bold text-green-400">
                                    R$ {selectedProduct?.price.toFixed(2)}
                                  </span>
                                </div>
                                
                                <div className="mb-4">
                                  <p className="text-gray-300">{selectedProduct?.description}</p>
                                </div>
                                
                                <div className="mb-4">
                                  <span className="text-sm text-gray-400">
                                    Categoria: {selectedProduct?.category}
                                  </span>
                                </div>
                                
                                <div className="mb-4">
                                  <span className="text-sm text-gray-400">
                                    Estoque: {selectedProduct && selectedProduct.stock > 0 ? selectedProduct.stock : 'Esgotado'}
                                  </span>
                                </div>
                                
                                <Button
                                  onClick={() => selectedProduct && addToCart(selectedProduct)}
                                  disabled={!selectedProduct || selectedProduct.stock === 0}
                                  className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                  <FaShoppingCart className="mr-2" />
                                  Adicionar ao Carrinho
                                </Button>
                              </div>
                            </div>
                            
                            {/* Avaliações */}
                            <div className="mt-6">
                              <h4 className="text-lg font-semibold mb-3">Avaliações</h4>
                              {getProductComments(product.id).length === 0 ? (
                                <p className="text-gray-400">Nenhuma avaliação ainda.</p>
                              ) : (
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                  {getProductComments(product.id).map(comment => (
                                    <div key={comment.id} className="bg-gray-800 p-3 rounded">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium">{comment.customerName}</span>
                                        <div className="flex">
                                          {[...Array(5)].map((_, i) => (
                                            <FaStar
                                              key={i}
                                              className={`w-3 h-3 ${
                                                i < comment.rating ? 'text-yellow-400' : 'text-gray-600'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                      <p className="text-sm text-gray-300">{comment.text}</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {new Date(comment.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          {/* Barra Lateral - Carrinho */}
          <div className="w-full lg:w-80">
            <Card className="bg-gray-800 border-gray-700 sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <FaShoppingCart className="mr-2" />
                  Carrinho ({getTotalItems()})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">Seu carrinho está vazio</p>
                ) : (
                  <>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {cart.map(item => (
                        <div key={item.product.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{item.product.name}</h4>
                            <div className="flex items-center mt-1">
                              <span className="text-green-400 text-sm mr-2">
                                R$ {item.product.price.toFixed(2)}
                              </span>
                              <div className="flex items-center border border-gray-600 rounded">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-gray-300 hover:text-white"
                                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                >
                                  -
                                </Button>
                                <span className="px-2 text-sm">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-gray-300 hover:text-white"
                                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.product.stock}
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex justify-between font-bold text-lg mb-4">
                        <span>Total:</span>
                        <span className="text-green-400">R$ {getTotalPrice().toFixed(2)}</span>
                      </div>
                      
                      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full bg-blue-600 hover:bg-blue-700">
                            Finalizar Compra
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 border-gray-700">
                          <DialogHeader>
                            <DialogTitle className="text-white">Informações de Entrega</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                                Nome Completo *
                              </Label>
                              <Input
                                id="name"
                                value={customerInfo.name}
                                onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                                className="bg-gray-800/50 border-gray-700 text-white"
                              />
                            </div>
                            <div>
                              <Label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                                E-mail *
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                value={customerInfo.email}
                                onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                                className="bg-gray-800/50 border-gray-700 text-white"
                              />
                            </div>
                            <div>
                              <Label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
                                Telefone *
                              </Label>
                              <Input
                                id="phone"
                                value={customerInfo.phone}
                                onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                                className="bg-gray-800/50 border-gray-700 text-white"
                              />
                            </div>
                            <div>
                              <Label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-1">
                                Endereço de Entrega *
                              </Label>
                              <Textarea
                                id="address"
                                value={customerInfo.address}
                                onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                                rows={3}
                                className="bg-gray-800/50 border-gray-700 text-white resize-none"
                              />
                            </div>
                            
                            <div className="bg-gray-800 p-4 rounded">
                              <h4 className="font-medium mb-2">Resumo do Pedido</h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {cart.map(item => (
                                  <div key={item.product.id} className="flex justify-between text-sm">
                                    <span>{item.quantity}x {item.product.name}</span>
                                    <span>R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-between font-bold mt-2 pt-2 border-t border-gray-700">
                                <span>Total:</span>
                                <span className="text-green-400">R$ {getTotalPrice().toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <Button
                              onClick={handlePlaceOrder}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              Confirmar Pedido
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Informações da Loja */}
            {storeSettings && (
              <Card className="bg-gray-800 border-gray-700 mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <FaStore className="mr-2" />
                    Informações da Loja
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {storeSettings.contactPhone && (
                    <div className="flex items-center text-sm">
                      <FaPhone className="mr-2 text-blue-400" />
                      <span>{storeSettings.contactPhone}</span>
                    </div>
                  )}
                  {storeSettings.contactEmail && (
                    <div className="flex items-center text-sm">
                      <FaEnvelope className="mr-2 text-blue-400" />
                      <span>{storeSettings.contactEmail}</span>
                    </div>
                  )}
                  {storeSettings.address && (
                    <div className="flex items-start text-sm">
                      <FaMapMarkerAlt className="mr-2 text-blue-400 mt-1" />
                      <span>{storeSettings.address}</span>
                    </div>
                  )}
                  
                  <div className="pt-3 border-t border-gray-700">
                    <h4 className="font-medium mb-2">Redes Sociais</h4>
                    <div className="flex space-x-3">
                      {storeSettings.socialMedia.facebook && (
                        <a 
                          href={storeSettings.socialMedia.facebook} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <FaFacebook size={20} />
                        </a>
                      )}
                      {storeSettings.socialMedia.instagram && (
                        <a 
                          href={storeSettings.socialMedia.instagram} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <FaInstagram size={20} />
                        </a>
                      )}
                      {storeSettings.socialMedia.twitter && (
                        <a 
                          href={storeSettings.socialMedia.twitter} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <FaTwitter size={20} />
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}