import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { organizationsApi } from '@/lib/api/organizations.api';
import { queryKeys } from '@/lib/api/queryKeys';
import type { Organization } from '@/lib/api/types';

interface OrgContextValue {
  organization: Organization | undefined;
  isLoading: boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: user ? queryKeys.organization(user.organizationId) : ['org', 'none'],
    queryFn: organizationsApi.getMine,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  return (
    <OrgContext.Provider value={{ organization: data, isLoading }}>{children}</OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within an OrgProvider');
  return ctx;
}
