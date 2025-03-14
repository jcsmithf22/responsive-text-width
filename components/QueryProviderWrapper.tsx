"use client";

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface QueryProviderWrapperProps {
  children: React.ReactNode;
}

export default function QueryProviderWrapper({ children }: QueryProviderWrapperProps) {
  // Initialize the QueryClient on the client side
  // const [queryClient] = useState(() => new QueryClient());
  const queryClient = new QueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
