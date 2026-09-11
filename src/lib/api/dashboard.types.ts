import type { ActivityLogEntry } from './activity.types';

export interface DashboardOverview {
  jobsTotal: number;
  jobsOpen: number;
  candidatesTotal: number;
  candidatesByStage: Record<string, number>;
  interviewsThisWeek: number;
  avgEvaluationScore: number | null;
  recentActivity: ActivityLogEntry[];
}
