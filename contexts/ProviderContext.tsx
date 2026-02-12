'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AIProvider = 'ollama' | 'claude';

interface ProviderContextType {
  provider: AIProvider;
  setProvider: (provider: AIProvider) => void;
  isOllamaAvailable: boolean;
  isClaudeAvailable: boolean;
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined);

export function ProviderProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage or environment variable
  const [provider, setProviderState] = useState<AIProvider>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aiProvider');
      if (stored === 'ollama' || stored === 'claude') {
        return stored;
      }
    }
    // Default to environment variable
    return (process.env.NEXT_PUBLIC_AI_PROVIDER as AIProvider) || 'ollama';
  });

  // Check which providers are available based on environment
  const isOllamaAvailable = true; // Ollama can always be configured
  const isClaudeAvailable = true; // Claude can always be configured

  // Persist to localStorage when changed
  const setProvider = (newProvider: AIProvider) => {
    setProviderState(newProvider);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aiProvider', newProvider);
    }
  };

  return (
    <ProviderContext.Provider
      value={{
        provider,
        setProvider,
        isOllamaAvailable,
        isClaudeAvailable,
      }}
    >
      {children}
    </ProviderContext.Provider>
  );
}

export function useProvider() {
  const context = useContext(ProviderContext);
  if (context === undefined) {
    throw new Error('useProvider must be used within a ProviderProvider');
  }
  return context;
}
