export type ActivityType =
  | 'job_created'
  | 'candidate_created'
  | 'candidate_stage_changed'
  | 'interview_scheduled'
  | 'evaluation_completed';

export const ACTIVITY_ICON: Record<ActivityType, string> = {
  job_created: '💼',
  candidate_created: '🧑',
  candidate_stage_changed: '🔀',
  interview_scheduled: '🗓️',
  evaluation_completed: '✨',
};

export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  message: string;
  actorUserId: string | null;
  createdAt: string;
}
