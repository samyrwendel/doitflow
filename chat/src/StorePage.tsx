import { StoreFront } from './components/StoreFront';
import { useEffect } from 'react';

export function StorePage() {
  useEffect(() => {
    // Verificar se já existem produtos no localStorage
    const products = localStorage.getItem('ecommerceProducts');
    
    // Se não existirem produtos, carregar dados de exemplo
    if (!products || JSON.parse(products).length === 0) {
      // Importar e executar a função de forma dinâmica para evitar erros de importação
      import('./mock-store-data').then(({ populateMockData }) => {
        populateMockData();
      });
    }
  }, []);

  return <StoreFront />;
}