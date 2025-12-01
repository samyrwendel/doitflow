import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  FaStore,
  FaBox,
  FaShoppingCart,
  FaComments,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaLink,
  FaCheck,
  FaTimes,
  FaStar,
  FaMagic
} from 'react-icons/fa';
import { populateMockData } from '../../mock-store-data';
import ecommerceService from '@/services/ecommerceService';

// Tipos para os dados da loja (compatíveis com o banco de dados)
export interface Product {
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

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Comment {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  text: string;
  approved: boolean;
  createdAt: string;
}

export interface StoreSettings {
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

export function EcommerceTab() {
  const [activeTab, setActiveTab] = useState<'store' | 'products' | 'orders' | 'comments'>('store');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
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

  // Estados para formulários
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    image: '',
    category: '',
    stock: 0,
    active: true
  });

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [storeLink, setStoreLink] = useState<string>('');

  // Carregar dados do banco de dados ao inicializar
  useEffect(() => {
    const loadData = async () => {
      try {
        // setLoading(true);
        
        // Inicializar banco de dados se necessário
        await ecommerceService.initializeDatabase();
        
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
        
        // Carregar produtos
        const productsData = await ecommerceService.getProducts();
        setProducts(productsData.map(p => ({
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
        
        // Carregar pedidos
        const ordersData = await ecommerceService.getOrders();
        setOrders(await Promise.all(ordersData.map(async o => {
          const items = await ecommerceService.getOrderItems(o.id!);
          return {
            id: o.id?.toString() || '',
            customerName: o.customer_name,
            customerEmail: o.customer_email,
            customerPhone: o.customer_phone,
            items: items.map(i => ({
              productId: i.product_id.toString(),
              productName: i.product_name,
              quantity: i.quantity,
              price: i.price
            })),
            total: o.total,
            status: o.status as 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
            createdAt: o.created_at || new Date().toISOString(),
            updatedAt: o.updated_at || new Date().toISOString()
          };
        })));
        
        // Carregar comentários
        const commentsData = await ecommerceService.getComments();
        setComments(commentsData.map(c => ({
          id: c.id?.toString() || '',
          productId: c.product_id.toString(),
          customerName: c.customer_name,
          rating: c.rating,
          text: c.text || '',
          approved: c.approved || false,
          createdAt: c.created_at || new Date().toISOString()
        })));
        
        // Gerar link da loja
        generateStoreLink();
      } catch (error) {
        console.error('Erro ao carregar dados do E-commerce:', error);
      } finally {
        // setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const generateStoreLink = () => {
    const baseUrl = window.location.origin;
    const storeUrl = `${baseUrl}/store`;
    setStoreLink(storeUrl);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.description || !newProduct.price) {
      alert('Nome, descrição e preço são obrigatórios');
      return;
    }

    try {
      const productId = await ecommerceService.createProduct({
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        image: newProduct.image || '',
        category: newProduct.category || '',
        stock: newProduct.stock || 0,
        active: newProduct.active !== false
      });

      const product: Product = {
        id: productId.toString(),
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        image: newProduct.image || '',
        category: newProduct.category || '',
        stock: newProduct.stock || 0,
        active: newProduct.active !== false,
        createdAt: new Date().toISOString()
      };

      setProducts([...products, product]);
      setNewProduct({
        name: '',
        description: '',
        price: 0,
        image: '',
        category: '',
        stock: 0,
        active: true
      });
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      alert('Erro ao adicionar produto. Tente novamente.');
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      await ecommerceService.updateProduct(parseInt(editingProduct.id), {
        name: editingProduct.name,
        description: editingProduct.description,
        price: editingProduct.price,
        image: editingProduct.image,
        category: editingProduct.category,
        stock: editingProduct.stock,
        active: editingProduct.active
      });

      setProducts(products.map(p =>
        p.id === editingProduct.id ? editingProduct : p
      ));
      setEditingProduct(null);
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      alert('Erro ao atualizar produto. Tente novamente.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await ecommerceService.deleteProduct(parseInt(id));
        setProducts(products.filter(p => p.id !== id));
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Erro ao excluir produto. Tente novamente.');
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await ecommerceService.updateOrderStatus(parseInt(orderId), status);
      setOrders(orders.map(o =>
        o.id === orderId
          ? { ...o, status, updatedAt: new Date().toISOString() }
          : o
      ));
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      alert('Erro ao atualizar status do pedido. Tente novamente.');
    }
  };

  const handleApproveComment = async (id: string) => {
    try {
      await ecommerceService.updateComment(parseInt(id), { approved: true });
      setComments(comments.map(c =>
        c.id === id ? { ...c, approved: true } : c
      ));
    } catch (error) {
      console.error('Erro ao aprovar comentário:', error);
      alert('Erro ao aprovar comentário. Tente novamente.');
    }
  };

  const handleRejectComment = async (id: string) => {
    if (window.confirm('Tem certeza que deseja rejeitar este comentário?')) {
      try {
        await ecommerceService.deleteComment(parseInt(id));
        setComments(comments.filter(c => c.id !== id));
      } catch (error) {
        console.error('Erro ao rejeitar comentário:', error);
        alert('Erro ao rejeitar comentário. Tente novamente.');
      }
    }
  };

  const copyStoreLink = () => {
    navigator.clipboard.writeText(storeLink);
    alert('Link da loja copiado para a área de transferência!');
  };

  const handleSaveStoreSettings = async () => {
    try {
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
      alert('Configurações da loja salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações da loja:', error);
      alert('Erro ao salvar configurações da loja. Tente novamente.');
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] pb-2.5 px-6 pt-6">
      <Card className="h-full flex flex-col glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <FaStore className="h-5 w-5 text-blue-400" />
            Gerenciador de Loja Online
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="store" className="flex items-center gap-2">
                <FaStore className="w-4 h-4" />
                <span className="hidden sm:inline">Loja</span>
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <FaBox className="w-4 h-4" />
                <span className="hidden sm:inline">Produtos</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <FaShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Pedidos</span>
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-2">
                <FaComments className="w-4 h-4" />
                <span className="hidden sm:inline">Comentários</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="store" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-6 pr-4">
                  <Card className="glass-card border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">Configurações da Loja</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="storeName" className="block text-sm font-medium text-gray-300 mb-1">
                            Nome da Loja
                          </Label>
                          <Input
                            id="storeName"
                            value={storeSettings.name}
                            onChange={(e) => setStoreSettings({...storeSettings, name: e.target.value})}
                            className="bg-gray-800/50 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contactEmail" className="block text-sm font-medium text-gray-300 mb-1">
                            E-mail de Contato
                          </Label>
                          <Input
                            id="contactEmail"
                            type="email"
                            value={storeSettings.contactEmail}
                            onChange={(e) => setStoreSettings({...storeSettings, contactEmail: e.target.value})}
                            className="bg-gray-800/50 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contactPhone" className="block text-sm font-medium text-gray-300 mb-1">
                            Telefone de Contato
                          </Label>
                          <Input
                            id="contactPhone"
                            value={storeSettings.contactPhone}
                            onChange={(e) => setStoreSettings({...storeSettings, contactPhone: e.target.value})}
                            className="bg-gray-800/50 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-1">
                            Endereço
                          </Label>
                          <Input
                            id="address"
                            value={storeSettings.address}
                            onChange={(e) => setStoreSettings({...storeSettings, address: e.target.value})}
                            className="bg-gray-800/50 border-gray-700 text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                          Descrição da Loja
                        </Label>
                        <Textarea
                          id="description"
                          value={storeSettings.description}
                          onChange={(e) => setStoreSettings({...storeSettings, description: e.target.value})}
                          rows={3}
                          className="bg-gray-800/50 border-gray-700 text-white resize-none"
                        />
                      </div>
                      <Button
                        onClick={handleSaveStoreSettings}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        Salvar Configurações
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">Link da Loja Online</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Input
                          value={storeLink}
                          readOnly
                          className="bg-gray-800/50 border-gray-700 text-white flex-1"
                        />
                        <Button
                          onClick={copyStoreLink}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <FaLink className="w-4 h-4 mr-2" />
                          Copiar
                        </Button>
                        <Button
                          onClick={() => window.open(storeLink, '_blank')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <FaEye className="w-4 h-4 mr-2" />
                          Visualizar
                        </Button>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          onClick={async () => {
                            try {
                              await populateMockData();
                              // Recarregar os dados após popular
                              const productsData = await ecommerceService.getProducts();
                              setProducts(productsData.map(p => ({
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
                              
                              const ordersData = await ecommerceService.getOrders();
                              setOrders(await Promise.all(ordersData.map(async o => {
                                const items = await ecommerceService.getOrderItems(o.id!);
                                return {
                                  id: o.id?.toString() || '',
                                  customerName: o.customer_name,
                                  customerEmail: o.customer_email,
                                  customerPhone: o.customer_phone,
                                  items: items.map(i => ({
                                    productId: i.product_id.toString(),
                                    productName: i.product_name,
                                    quantity: i.quantity,
                                    price: i.price
                                  })),
                                  total: o.total,
                                  status: o.status as 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
                                  createdAt: o.created_at || new Date().toISOString(),
                                  updatedAt: o.updated_at || new Date().toISOString()
                                };
                              })));
                              
                              const commentsData = await ecommerceService.getComments();
                              setComments(commentsData.map(c => ({
                                id: c.id?.toString() || '',
                                productId: c.product_id.toString(),
                                customerName: c.customer_name,
                                rating: c.rating,
                                text: c.text || '',
                                approved: c.approved || false,
                                createdAt: c.created_at || new Date().toISOString()
                              })));
                              
                              alert('Dados de exemplo carregados com sucesso!');
                            } catch (error) {
                              console.error('Erro ao carregar dados de exemplo:', error);
                              alert('Erro ao carregar dados de exemplo. Tente novamente.');
                            }
                          }}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <FaMagic className="w-4 h-4 mr-2" />
                          Carregar Dados de Exemplo
                        </Button>
                      </div>
                      <Alert className="mt-4 bg-blue-500/20 border-blue-500/50 text-blue-200">
                        <AlertDescription>
                          Compartilhe este link com seus clientes para que eles possam acessar sua loja online.
                          As alterações feitas nos produtos, pedidos e comentários serão refletidas automaticamente na loja.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="products" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-6 pr-4">
                  <Card className="glass-card border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">Adicionar Produto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="productName" className="block text-sm font-medium text-gray-300 mb-1">
                            Nome do Produto *
                          </Label>
                          <Input
                            id="productName"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                            className="bg-gray-800/50 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="productPrice" className="block text-sm font-medium text-gray-300 mb-1">
                            Preço *
                          </Label>
                          <Input
                            id="productPrice"
                            type="number"
                            step="0.01"
                            value={newProduct.price}
                            onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                            className="bg-gray-800/50 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="productCategory" className="block text-sm font-medium text-gray-300 mb-1">
                            Categoria
                          </Label>
                          <Input
                            id="productCategory"
                            value={newProduct.category}
                            onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                            className="bg-gray-800/50 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="productStock" className="block text-sm font-medium text-gray-300 mb-1">
                            Estoque
                          </Label>
                          <Input
                            id="productStock"
                            type="number"
                            value={newProduct.stock}
                            onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                            className="bg-gray-800/50 border-gray-700 text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="productDescription" className="block text-sm font-medium text-gray-300 mb-1">
                          Descrição *
                        </Label>
                        <Textarea
                          id="productDescription"
                          value={newProduct.description}
                          onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                          rows={3}
                          className="bg-gray-800/50 border-gray-700 text-white resize-none"
                        />
                      </div>
                      <div>
                        <Label htmlFor="productImage" className="block text-sm font-medium text-gray-300 mb-1">
                          URL da Imagem
                        </Label>
                        <Input
                          id="productImage"
                          value={newProduct.image}
                          onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                          className="bg-gray-800/50 border-gray-700 text-white"
                        />
                      </div>
                      <Button
                        onClick={handleAddProduct}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <FaPlus className="w-4 h-4 mr-2" />
                        Adicionar Produto
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">Produtos Cadastrados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {products.length === 0 ? (
                          <p className="text-gray-400 text-center py-4">Nenhum produto cadastrado</p>
                        ) : (
                          products.map((product) => (
                            <Card key={product.id} className="glass-card border-0">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-medium text-white">{product.name}</h3>
                                      <Badge variant={product.active ? 'default' : 'secondary'}>
                                        {product.active ? 'Ativo' : 'Inativo'}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">{product.description}</p>
                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                      <span className="text-green-400">R$ {product.price.toFixed(2)}</span>
                                      <span className="text-gray-400">Estoque: {product.stock}</span>
                                      {product.category && (
                                        <span className="text-gray-400">Categoria: {product.category}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setEditingProduct(product)}
                                          className="text-blue-400 hover:text-blue-300"
                                        >
                                          <FaEdit className="w-4 h-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="bg-gray-900 border-gray-700">
                                        <DialogHeader>
                                          <DialogTitle className="text-white">Editar Produto</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <Label htmlFor="editName" className="block text-sm font-medium text-gray-300 mb-1">
                                              Nome
                                            </Label>
                                            <Input
                                              id="editName"
                                              value={editingProduct?.name || ''}
                                              onChange={(e) => setEditingProduct(editingProduct ? {...editingProduct, name: e.target.value} : null)}
                                              className="bg-gray-800/50 border-gray-700 text-white"
                                            />
                                          </div>
                                          <div>
                                            <Label htmlFor="editPrice" className="block text-sm font-medium text-gray-300 mb-1">
                                              Preço
                                            </Label>
                                            <Input
                                              id="editPrice"
                                              type="number"
                                              step="0.01"
                                              value={editingProduct?.price || 0}
                                              onChange={(e) => setEditingProduct(editingProduct ? {...editingProduct, price: parseFloat(e.target.value)} : null)}
                                              className="bg-gray-800/50 border-gray-700 text-white"
                                            />
                                          </div>
                                          <div>
                                            <Label htmlFor="editDescription" className="block text-sm font-medium text-gray-300 mb-1">
                                              Descrição
                                            </Label>
                                            <Textarea
                                              id="editDescription"
                                              value={editingProduct?.description || ''}
                                              onChange={(e) => setEditingProduct(editingProduct ? {...editingProduct, description: e.target.value} : null)}
                                              rows={3}
                                              className="bg-gray-800/50 border-gray-700 text-white resize-none"
                                            />
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="checkbox"
                                              id="editActive"
                                              checked={editingProduct?.active || false}
                                              onChange={(e) => setEditingProduct(editingProduct ? {...editingProduct, active: e.target.checked} : null)}
                                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                                            />
                                            <Label htmlFor="editActive" className="text-sm text-gray-300">
                                              Produto ativo
                                            </Label>
                                          </div>
                                          <Button
                                            onClick={handleUpdateProduct}
                                            className="w-full bg-blue-600 hover:bg-blue-700"
                                          >
                                            Salvar Alterações
                                          </Button>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <FaTrash className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="orders" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-6 pr-4">
                  <Card className="glass-card border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">Pedidos Recebidos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {orders.length === 0 ? (
                          <p className="text-gray-400 text-center py-4">Nenhum pedido recebido</p>
                        ) : (
                          orders.map((order) => (
                            <Card key={order.id} className="glass-card border-0">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-medium text-white">Pedido #{order.id}</h3>
                                      <Badge variant={
                                        order.status === 'pending' ? 'secondary' :
                                        order.status === 'processing' ? 'default' :
                                        order.status === 'shipped' ? 'default' :
                                        order.status === 'delivered' ? 'default' : 'destructive'
                                      }>
                                        {order.status === 'pending' ? 'Pendente' :
                                         order.status === 'processing' ? 'Processando' :
                                         order.status === 'shipped' ? 'Enviado' :
                                         order.status === 'delivered' ? 'Entregue' : 'Cancelado'}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">
                                      Cliente: {order.customerName} ({order.customerEmail})
                                    </p>
                                    <p className="text-sm text-gray-400">
                                      Total: R$ {order.total.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Data: {new Date(order.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setSelectedOrder(order)}
                                          className="text-blue-400 hover:text-blue-300"
                                        >
                                          <FaEye className="w-4 h-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="bg-gray-900 border-gray-700">
                                        <DialogHeader>
                                          <DialogTitle className="text-white">Detalhes do Pedido</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <h4 className="font-medium text-white mb-2">Informações do Cliente</h4>
                                            <p className="text-sm text-gray-300">Nome: {selectedOrder?.customerName}</p>
                                            <p className="text-sm text-gray-300">E-mail: {selectedOrder?.customerEmail}</p>
                                            <p className="text-sm text-gray-300">Telefone: {selectedOrder?.customerPhone}</p>
                                          </div>
                                          <div>
                                            <h4 className="font-medium text-white mb-2">Itens do Pedido</h4>
                                            <div className="space-y-2">
                                              {selectedOrder?.items.map((item, index) => (
                                                <div key={index} className="flex justify-between text-sm">
                                                  <span className="text-gray-300">
                                                    {item.quantity}x {item.productName}
                                                  </span>
                                                  <span className="text-gray-300">
                                                    R$ {(item.price * item.quantity).toFixed(2)}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                          <div className="flex justify-between font-medium text-white">
                                            <span>Total:</span>
                                            <span>R$ {selectedOrder?.total.toFixed(2)}</span>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                    <select
                                      value={order.status}
                                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as Order['status'])}
                                      className="bg-gray-800/50 border-gray-700 text-white text-sm rounded px-2 py-1"
                                    >
                                      <option value="pending">Pendente</option>
                                      <option value="processing">Processando</option>
                                      <option value="shipped">Enviado</option>
                                      <option value="delivered">Entregue</option>
                                      <option value="cancelled">Cancelado</option>
                                    </select>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="comments" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-6 pr-4">
                  <Card className="glass-card border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">Comentários dos Clientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {comments.length === 0 ? (
                          <p className="text-gray-400 text-center py-4">Nenhum comentário recebido</p>
                        ) : (
                          comments.map((comment) => (
                            <Card key={comment.id} className="glass-card border-0">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="font-medium text-white">{comment.customerName}</h3>
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
                                      <Badge variant={comment.approved ? 'default' : 'secondary'}>
                                        {comment.approved ? 'Aprovado' : 'Pendente'}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-300">{comment.text}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                      {new Date(comment.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {!comment.approved && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleApproveComment(comment.id)}
                                          className="text-green-400 hover:text-green-300"
                                        >
                                          <FaCheck className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleRejectComment(comment.id)}
                                          className="text-red-400 hover:text-red-300"
                                        >
                                          <FaTimes className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}