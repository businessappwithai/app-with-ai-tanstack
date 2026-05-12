"use client";

/**
 * TanStack Query Provider
 *
 * Wraps the app with TanStack Query (React Query) for server state management.
 *
 * Generated: {{now}}
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React, { type ReactNode, useState } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function QueryProvider({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors
              const apiError = error as { statusCode?: number };
              if (apiError.statusCode && apiError.statusCode >= 400 && apiError.statusCode < 500) {
                return false;
              }
              // Retry up to 3 times on 5xx errors and network failures
              return failureCount < 3;
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
