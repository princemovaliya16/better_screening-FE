import type { Candidate } from './candidates.types';
import type { InterviewRoundType, Job, QuestionType } from './jobs.types';

export type InterviewStatus =
  | 'scheduled'
  | 'invitation_sent'
  | 'in_progress'
  | 'pending_evaluation'
  | 'completed'
  | 'cancelled';

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: 'Scheduled',
  invitation_sent: 'Invitation Sent',
  in_progress: 'In Progress',
  pending_evaluation: 'Processing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export interface InterviewQuestion {
  id: string;
  orderIndex: number;
  questionText: string;
  questionType: QuestionType;
}

export interface Interview {
  id: string;
  organizationId: string;
  candidateId: string;
  candidate?: Candidate;
  jobId: string;
  job?: Job;
  roundTemplateId: string | null;
  roundIndex: number;
  roundName: string;
  type: InterviewRoundType;
  scheduledAt: string;
  durationMinutes: number;
  interviewerUserId: string | null;
  interviewer?: { id: string; name: string } | null;
  timezone: string;
  status: InterviewStatus;
  overallScore: number | null;
  questions: InterviewQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleInterviewInput {
  candidateId: string;
  roundIndex: number;
  scheduledAt: string;
  durationMinutes?: number;
  interviewerUserId?: string;
  timezone?: string;
}

export interface RescheduleInterviewInput {
  scheduledAt?: string;
  durationMinutes?: number;
  interviewerUserId?: string;
  timezone?: string;
}
