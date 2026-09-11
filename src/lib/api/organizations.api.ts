import { api } from './client';
import type { Organization, OrganizationSettings } from './types';

export const organizationsApi = {
  getMine: () => api.get<Organization>('/organizations/me'),
  updateMine: (input: { name?: string }) => api.patch<Organization>('/organizations/me', input),
  getMySettings: () => api.get<OrganizationSettings>('/organizations/me/settings'),
  updateMySettings: (input: Partial<OrganizationSettings>) =>
    api.patch<OrganizationSettings>('/organizations/me/settings', input),
};
