"use client";

/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the app.
 *
 * Generated: {{now}}
 */

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export interface User {
  sys_user_id: string;
  email: string;
  name: string;
  roles: Array<{
    sys_role_id: string;
    name: string;
  }>;
}

export interface AuthTokens {
  access_token: string;
  user: User;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  TOKEN: "auth_token",
  USER: "auth_user",
};

// ============================================================================
// Auth Provider
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        // Clear invalid data
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    }

    setIsLoading(false);
  }, []);

  // Update API client when token changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Dynamically import apiClient to avoid SSR issues
      import("@/lib/api-client").then(({ apiClient }) => {
        apiClient.setAuthToken(token);
      });
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const { apiClient } = await import("@/lib/api-client");

    const response = await apiClient.post<AuthTokens>("/auth/login", {
      email,
      password,
    });

    const { access_token, user: userData } = response;

    // Store in state
    setToken(access_token);
    setUser(userData);

    // Store in localStorage
    localStorage.setItem(STORAGE_KEYS.TOKEN, access_token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  const refreshToken = async () => {
    // Implementation depends on backend refresh token strategy
    // For now, just ensure token is still valid
    if (!token) {
      throw new Error("No token to refresh");
    }
  };

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    return user.roles.some((role) => role.name === roleName);
  };

  const hasAnyRole = (roleNames: string[]): boolean => {
    if (!user) return false;
    return user.roles.some((role) => roleNames.includes(role.name));
  };

  const isAdmin = (): boolean => {
    return hasAnyRole(["System Administrator", "Administrator"]);
  };

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    refreshToken,
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
      // Redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
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
