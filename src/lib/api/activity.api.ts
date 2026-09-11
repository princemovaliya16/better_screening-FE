import { api } from './client';
import type { ActivityLogEntry } from './activity.types';

export const activityApi = {
  list: (limit = 20) => api.get<ActivityLogEntry[]>(`/activity?limit=${limit}`),
};
