import { api } from './client';
import type { PublicUser, UserRole } from './types';

export const usersApi = {
  list: () => api.get<PublicUser[]>('/users'),
  updateRole: (id: string, role: UserRole) => api.patch<PublicUser>(`/users/${id}/role`, { role }),
  remove: (id: string) => api.delete<{ ok: boolean }>(`/users/${id}`),
};
