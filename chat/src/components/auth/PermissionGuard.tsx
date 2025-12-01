/**
 * Componente para controlar exibição baseada em permissões
 */

import React from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  role?: string;
  resource?: string;
  action?: string;
  fallback?: React.ReactNode;
  requireAll?: boolean; // Se true, requer todas as condições. Se false, requer apenas uma
}

export function PermissionGuard({
  children,
  permission,
  role,
  resource,
  action,
  fallback = null,
  requireAll = true
}: PermissionGuardProps) {
  const { user, hasPermission, canAccess } = useAuth();

  const checks: boolean[] = [];

  // Verificar permissão específica
  if (permission) {
    checks.push(hasPermission(permission));
  }

  // Verificar role
  if (role) {
    checks.push(user?.role === role);
  }

  // Verificar acesso a recurso/ação
  if (resource && action) {
    checks.push(canAccess(resource, action));
  }

  // Se não há verificações, mostrar conteúdo
  if (checks.length === 0) {
    return <>{children}</>;
  }

  // Aplicar lógica de verificação
  const hasAccess = requireAll 
    ? checks.every(check => check) // Todas as condições devem ser verdadeiras
    : checks.some(check => check);  // Pelo menos uma condição deve ser verdadeira

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hook para verificar permissões de forma programática
 */
export function usePermissions() {
  const { user, hasPermission, canAccess } = useAuth();

  const checkPermission = (permission: string): boolean => {
    return hasPermission(permission);
  };

  const checkRole = (role: string): boolean => {
    return user?.role === role;
  };

  const checkAccess = (resource: string, action: string): boolean => {
    return canAccess(resource, action);
  };

  const checkMultiple = (
    conditions: {
      permission?: string;
      role?: string;
      resource?: string;
      action?: string;
    },
    requireAll = true
  ): boolean => {
    const checks: boolean[] = [];

    if (conditions.permission) {
      checks.push(hasPermission(conditions.permission));
    }

    if (conditions.role) {
      checks.push(user?.role === conditions.role);
    }

    if (conditions.resource && conditions.action) {
      checks.push(canAccess(conditions.resource, conditions.action));
    }

    if (checks.length === 0) return true;

    return requireAll 
      ? checks.every(check => check)
      : checks.some(check => check);
  };

  return {
    checkPermission,
    checkRole,
    checkAccess,
    checkMultiple,
    user
  };
}