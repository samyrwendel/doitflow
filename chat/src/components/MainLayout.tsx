import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigurationTab } from './tabs/ConfigurationTab';
import { GestaoEnvioTab } from "./tabs/GestaoEnvioTab";
import { EcommerceTab } from "./tabs/EcommerceTab";
import { Settings, LogOut, Send, Flame, ShoppingCart, Bot } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';



export function MainLayout() {
  const { logout } = useAuthContext();

  const handleLogout = async () => {
    await logout();
  };



  return (
    <div className="h-screen w-full overflow-hidden relative">
      <div className="h-full max-w-[1900px] w-full mx-auto px-4 pt-4 pb-5 flex flex-col relative z-10">
        <Tabs defaultValue="gestao-envio" className="flex-1 flex flex-col min-h-0">
          {/* Header Menu with Tabs */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 flex justify-center">
              <TabsList className="inline-flex h-12 items-center justify-start rounded-2xl glass-card p-1">

              <TabsTrigger 
                value="gestao-envio"
                className="flex items-center gap-3 px-6 h-10 rounded-14px transition-all duration-300 data-[state=active]:bg-[var(--glass-active)] data-[state=active]:text-[var(--text-active)] data-[state=active]:shadow-lg hover:bg-[var(--glass-surface)]"
                style={{
                  color: 'var(--text-secondary)'
                } as React.CSSProperties}
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">WhatsApp Marketing</span>
              </TabsTrigger>

              <TabsTrigger 
                value="aquecimento"
                disabled
                className="flex items-center gap-3 px-6 h-10 rounded-14px transition-all duration-300 data-[state=active]:bg-[var(--glass-active)] data-[state=active]:text-[var(--text-active)] data-[state=active]:shadow-lg hover:bg-[var(--glass-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: 'var(--text-secondary)'
                } as React.CSSProperties}
              >
                <Flame className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">Aquecimento</span>
              </TabsTrigger>

              <TabsTrigger
                value="ecommerce"
                className="flex items-center gap-3 px-6 h-10 rounded-14px transition-all duration-300 data-[state=active]:bg-[var(--glass-active)] data-[state=active]:text-[var(--text-active)] data-[state=active]:shadow-lg hover:bg-[var(--glass-surface)]"
                style={{
                  color: 'var(--text-secondary)'
                } as React.CSSProperties}
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">E-commerce</span>
              </TabsTrigger>

              <TabsTrigger 
                value="atendimento"
                disabled
                className="flex items-center gap-3 px-6 h-10 rounded-14px transition-all duration-300 data-[state=active]:bg-[var(--glass-active)] data-[state=active]:text-[var(--text-active)] data-[state=active]:shadow-lg hover:bg-[var(--glass-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: 'var(--text-secondary)'
                } as React.CSSProperties}
              >
                <Bot className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">Atendimento</span>
              </TabsTrigger>

              <TabsTrigger 
                value="config"
                className="flex items-center gap-3 px-6 h-10 rounded-14px transition-all duration-300 data-[state=active]:bg-[var(--glass-active)] data-[state=active]:text-[var(--text-active)] data-[state=active]:shadow-lg hover:bg-[var(--glass-surface)]"
                style={{
                  color: 'var(--text-secondary)'
                } as React.CSSProperties}
              >
                <Settings className="w-5 h-5 settings-icon" />
                <span className="hidden sm:inline font-medium">Configuração</span>
              </TabsTrigger>
            </TabsList>
            </div>
            
            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="glass-card h-16 w-16 rounded-full hover:bg-[var(--glass-surface)] transition-all duration-300 flex items-center justify-center aspect-square"
              style={{
                color: 'var(--text-secondary)',
                borderRadius: '50%'
              } as React.CSSProperties}
            >
              <LogOut className="w-8 h-8" />
            </Button>
           </div>
          
          <div className="flex-1 min-h-0">


            <TabsContent value="gestao-envio" className="h-full m-0">
              <GestaoEnvioTab />
            </TabsContent>
            
            <TabsContent value="ecommerce" className="h-full m-0">
              <EcommerceTab />
            </TabsContent>
            
            <TabsContent value="config" className="h-full m-0">
              <ConfigurationTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}