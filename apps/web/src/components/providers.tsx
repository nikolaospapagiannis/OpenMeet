'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { SearchProvider } from '@/contexts/SearchContext';
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SearchProvider>
        {children}
        <GlobalSearchModal />
      </SearchProvider>
    </AuthProvider>
  );
}
