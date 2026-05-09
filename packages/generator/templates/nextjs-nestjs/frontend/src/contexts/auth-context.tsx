"use client";

/**
 * Authentication Context
 *
 * Provides authentication state using session-based authentication.
 * Uses HTTP-only cookies managed by the backend.
 */

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { getSession, signIn, signOut } from "@/lib/auth";

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  roles?: Array<{
    sys_role_id: string;
    name: string;
  }>;
  emailVerified?: boolean;
  sysUserId?: string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Auth Provider
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    async function loadSession() {
      try {
        const { data } = await getSession();

        // Session data shape: { user: { ... }, session: { ... } }
        const userData = (data as Record<string, unknown>)?.user as User | undefined;
        if (mounted && userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error("Failed to load session:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await signIn(email, password);

    if (error || !data) {
      throw new Error(error || "Login failed");
    }

    // Extract user from response
    const userData = (data as Record<string, unknown>)?.user as User | undefined;
    if (userData) {
      setUser(userData);
    }
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  const refreshSession = async () => {
    const { data } = await getSession();

    const userData = (data as Record<string, unknown>)?.user as User | undefined;
    if (userData) {
      setUser(userData);
    } else {
      setUser(null);
    }
  };

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    // Support both flat role string and roles array
    if (user.roles) {
      return user.roles.some((role) => role.name === roleName);
    }
    return user.role === roleName;
  };

  const hasAnyRole = (roleNames: string[]): boolean => {
    if (!user) return false;
    if (user.roles) {
      return user.roles.some((role) => roleNames.includes(role.name));
    }
    return user.role ? roleNames.includes(user.role) : false;
  };

  const isAdmin = (): boolean => {
    return hasAnyRole(["System Administrator", "Administrator", "admin"]);
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshSession,
    hasRole,
    hasAnyRole,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// ============================================================================
// Higher-Order Components
// ============================================================================

interface WithAuthProps {
  requireAdmin?: boolean;
  requireRoles?: string[];
  fallback?: ReactNode;
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  { requireAdmin = false, requireRoles, fallback = null }: WithAuthProps = {}
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, isAdmin, hasAnyRole } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      );
    }

    if (!isAuthenticated) {
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
      return fallback;
    }

    if (requireAdmin && !isAdmin()) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="text-muted-foreground mt-2">
              You need administrator privileges to access this page.
            </p>
          </div>
        </div>
      );
    }

    if (requireRoles && !hasAnyRole(requireRoles)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="text-muted-foreground mt-2">
              You do not have permission to access this page.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
