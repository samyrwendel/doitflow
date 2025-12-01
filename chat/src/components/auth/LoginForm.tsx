/**
 * Componente de formulário de login
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Mail, Lock, CheckCircle, Zap } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { LoginCredentials } from '@/services/authService';
import { toast } from "sonner";
import { LoginLoadingScreen } from '@/components/ui/loading-screen';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const { login } = useAuthContext();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validação básica
    if (!formData.email || !formData.password) {
      const errorMsg = 'Por favor, preencha todos os campos';
      setError(errorMsg);
      toast.error('Erro de validação', {
        description: errorMsg,
        duration: 3000,
      });
      return;
    }

    try {
      setIsLoginLoading(true);
      const success = await login(formData.email, formData.password);
      
      if (success) {
        toast.success('Login realizado com sucesso!', {
          description: 'Redirecionando para o sistema...',
          duration: 2000,
        });
        onSuccess?.();
      } else {
        const errorMsg = 'Email ou senha incorretos';
        setError(errorMsg);
        toast.error('Falha no login', {
          description: errorMsg,
          duration: 4000,
        });
      }
    } catch (error) {
      const errorMsg = 'Erro interno do sistema';
      setError(errorMsg);
      toast.error('Erro interno', {
        description: 'Tente novamente em alguns instantes',
        duration: 4000,
      });
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Limpar erro ao digitar
  };

  const handleDevLogin = async () => {
    setError('');
    const devCredentials = {
      email: 'admin@tupperware.com',
      password: 'admin123'
    };
    
    setFormData(devCredentials);
    
    try {
      setIsLoginLoading(true);
      const success = await login(devCredentials.email, devCredentials.password);
      
      if (success) {
        toast.success('Login de desenvolvimento realizado!', {
          description: 'Redirecionando para o sistema...',
          duration: 2000,
        });
        onSuccess?.();
      } else {
        const errorMsg = 'Credenciais de desenvolvimento inválidas';
        setError(errorMsg);
        toast.error('Falha no login de desenvolvimento', {
          description: errorMsg,
          duration: 4000,
        });
      }
    } catch (error) {
      const errorMsg = 'Erro no login de desenvolvimento';
      setError(errorMsg);
      toast.error('Erro interno', {
        description: 'Tente novamente em alguns instantes',
        duration: 4000,
      });
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Mostra tela de carregamento durante o login
  if (isLoginLoading) {
    return <LoginLoadingScreen />;
  }

  return (
    <Card className="w-full max-w-md mx-auto glass-card shadow-2xl rounded-2xl border-white/20">
      <CardHeader className="space-y-4 text-center pb-8">
        <div className="mx-auto w-16 h-16 rounded-2xl glass-surface flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8" style={{color: 'var(--color-primary)'}} />
        </div>
        <CardTitle className="text-3xl font-bold" style={{color: 'var(--text-primary)'}}>
          Bem-vindo
        </CardTitle>
        <CardDescription className="text-lg" style={{color: 'var(--text-secondary)'}}>
          Faça login para acessar o sistema
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Label htmlFor="email" className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4" style={{color: 'var(--color-primary)'}} />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="pl-10 glass-input rounded-xl h-12 transition-all"
                style={{color: 'var(--text-primary)'}}
                disabled={isLoginLoading}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="password" className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4" style={{color: 'var(--color-primary)'}} />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="pl-10 pr-10 glass-input rounded-xl h-12 transition-all"
                style={{color: 'var(--text-primary)'}}
                disabled={isLoginLoading}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 rounded-xl transition-all"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoginLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" style={{color: 'var(--text-secondary)'}} />
                ) : (
                  <Eye className="h-4 w-4" style={{color: 'var(--text-secondary)'}} />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl h-12 transition-all"
            disabled={isLoginLoading}
          >
            {isLoginLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>

          <Button
            type="button"
            onClick={handleDevLogin}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl h-10 transition-all mt-2"
            disabled={isLoginLoading}
          >
            {isLoginLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Login Facilitado (Dev)
              </>
            )}
          </Button>

          {onSwitchToRegister && (
            <div className="text-center pt-4">
              <Button
                type="button"
                variant="link"
                onClick={onSwitchToRegister}
                disabled={isLoginLoading}
                className="text-sm hover:bg-white/10 rounded-xl transition-all"
                style={{color: 'var(--text-secondary)'}}
              >
                Não tem uma conta? Cadastre-se
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}