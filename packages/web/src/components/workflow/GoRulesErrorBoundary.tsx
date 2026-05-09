"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface GoRulesErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface GoRulesErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class GoRulesErrorBoundary extends Component<
  GoRulesErrorBoundaryProps,
  GoRulesErrorBoundaryState
> {
  constructor(props: GoRulesErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): GoRulesErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("GoRules Editor Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full flex items-center justify-center bg-background">
          <div className="text-center p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              GoRules Editor Failed to Load
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              {this.state.error?.message ||
                "An unexpected error occurred while loading the business rules editor."}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
                style={{ backgroundColor: "#FF8400" }}
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
