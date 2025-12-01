/**
 * Componente de tela de carregamento personalizada
 */

import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ 
  message = "Carregando..." 
}: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
      {/* Background pattern matching the main layout */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      }} />

      {/* Minimal loading content */}
      <div className="relative z-10 flex flex-col items-center space-y-4">
        {/* Simple spinner */}
        <Loader2 
          className="w-8 h-8 animate-spin" 
          style={{ color: 'var(--text-secondary)' }}
        />

        {/* Simple text */}
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {message}
        </p>
      </div>
    </div>
  );
}

export function LoginLoadingScreen() {
  return (
    <LoadingScreen 
      message="Autenticando usuário..."
    />
  );
}

export function SystemLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
      {/* Background pattern matching the main layout */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      }} />

      {/* Minimal loading content */}
      <div className="relative z-10 flex flex-col items-center space-y-4">
        {/* Simple spinner */}
        <Loader2 
          className="w-8 h-8 animate-spin" 
          style={{ color: 'var(--text-secondary)' }}
        />

        {/* Simple text */}
        <div className="text-center space-y-1">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Carregando Sistema
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Preparando sua experiência...
          </p>
        </div>
      </div>
    </div>
  );
}