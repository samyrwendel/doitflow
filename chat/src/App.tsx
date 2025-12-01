import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { StorePage } from './components/store/StorePage';
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from 'react';

import { useAuthContext } from './contexts/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { SystemLoadingScreen } from './components/ui/loading-screen';

function App() {
  // Verificação de segurança para Fast Refresh
  let authData;
  try {
    authData = useAuthContext();
  } catch (error) {
    // Durante Fast Refresh, o contexto pode não estar disponível
    console.warn('[App] AuthContext não disponível durante Fast Refresh:', error);
    return (
      <>
        <SystemLoadingScreen />
        <Toaster />
      </>
    );
  }
  
  const { isAuthenticated, isLoading } = authData;

  useEffect(() => {
    // Desabilitar teste NocoDB temporariamente para evitar erros 404
    // if (import.meta.env.DEV) {
    //   testNocoDBConnection().then(result => {
    //     if (result.success) {
    //       console.log('🎉 NocoDB conectado com sucesso!', result.message);
    //     } else {
    //       console.warn('⚠️ Problema na conexão com NocoDB:', result.message);
    //     }
    //   });
    // }
  }, []);

  // Mostra loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <>
        <SystemLoadingScreen />
        <Toaster />
      </>
    );
  }

  // Se não estiver autenticado, mostra modal de login
  if (!isAuthenticated) {
    return (
      <>
        <AuthModal
          isOpen={true}
          onClose={() => {}} // Não permite fechar quando não autenticado
        />
        <Toaster />
      </>
    );
  }

  // Se estiver autenticado, mostra a aplicação principal
  return (
    <>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/store" element={<StorePage />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;