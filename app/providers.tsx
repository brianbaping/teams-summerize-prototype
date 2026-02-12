'use client';

import { SessionProvider } from 'next-auth/react';
import { ProviderProvider } from '@/contexts/ProviderContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ProviderProvider>{children}</ProviderProvider>
    </SessionProvider>
  );
}
