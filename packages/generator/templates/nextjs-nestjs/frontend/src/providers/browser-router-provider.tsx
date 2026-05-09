"use client";

/**
 * Browser Router Provider
 *
 * Provides navigation context for client-side routing without requiring Next.js navigation.
 * Use native browser history API for simple navigation.
 *
 * Generated: {{now}}
 */

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

interface RouterContextValue {
  pathname: string;
  search: string;
  push: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
  forward: () => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

interface BrowserRouterProps {
  children: ReactNode;
}

export function BrowserRouter({ children }: BrowserRouterProps) {
  const [pathname, setPathname] = useState("/");
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Update state on mount and when URL changes
    const updateState = () => {
      setPathname(window.location.pathname);
      setSearch(window.location.search);
    };

    updateState();

    // Listen for popstate events (back/forward buttons)
    window.addEventListener("popstate", updateState);

    // Intercept pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      updateState();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      updateState();
    };

    return () => {
      window.removeEventListener("popstate", updateState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  const push = (path: string) => {
    window.history.pushState(null, "", path);
    setPathname(path);
    setSearch("");
  };

  const replace = (path: string) => {
    window.history.replaceState(null, "", path);
    setPathname(path);
    setSearch("");
  };

  const back = () => {
    window.history.back();
  };

  const forward = () => {
    window.history.forward();
  };

  return (
    <RouterContext.Provider value={{ pathname, search, push, replace, back, forward }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within BrowserRouter");
  }
  return context;
}
