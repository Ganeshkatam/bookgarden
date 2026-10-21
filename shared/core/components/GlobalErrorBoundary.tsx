"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export default class GlobalErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Global Error Boundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--surface-canvas)] flex flex-col items-center justify-center p-4 text-center">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl text-red-500 font-bold">!</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-50 mb-4">
            Something went wrong
          </h1>
          <p className="text-slate-400 max-w-md mb-8">
            We&apos;re sorry, but BookGarden encountered an unexpected error.
            Please try refreshing the page.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => (window.location.href = "/")}
              className="px-6 py-3 bg-[var(--surface-default)] hover:bg-[var(--surface-overlay)] border border-[var(--border-default)] text-slate-50 rounded-xl transition-colors font-medium"
            >
              Go Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium shadow-lg shadow-indigo-500/25"
            >
              Refresh Application
            </button>
          </div>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <div className="mt-8 p-4 bg-[var(--surface-raised)] rounded-xl text-left overflow-auto max-w-2xl w-full border border-red-500/20">
              <p className="text-red-400 font-mono text-sm mb-2">
                {this.state.error.toString()}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
