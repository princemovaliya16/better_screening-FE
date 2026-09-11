import { api } from './client';
import type { DashboardOverview } from './dashboard.types';

export const dashboardApi = {
  getOverview: () => api.get<DashboardOverview>('/dashboard'),
};
