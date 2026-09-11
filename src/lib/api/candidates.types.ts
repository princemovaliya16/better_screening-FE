import type { Job } from './jobs.types';

export type CandidateStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'hr_review'
  | 'offer'
  | 'hired'
  | 'rejected';

export const CANDIDATE_STAGES: CandidateStage[] = [
  'applied',
  'screening',
  'interview',
  'hr_review',
  'offer',
  'hired',
];

export const CANDIDATE_STAGE_LABELS: Record<CandidateStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  hr_review: 'HR Review',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

export interface CandidateSkill {
  id: string;
  name: string;
}

export interface CandidateNote {
  id: string;
  body: string;
  authorUserId: string | null;
  author?: { name: string } | null;
  createdAt: string;
}

export interface Candidate {
  id: string;
  organizationId: string;
  jobId: string;
  job?: Job;
  name: string;
  email: string;
  phone: string | null;
  experienceYears: number | null;
  currentCompany: string | null;
  location: string | null;
  stage: CandidateStage;
  overallScore: number | null;
  resumePath: string | null;
  resumeText: string | null;
  resumeSummary: string | null;
  education: string | null;
  rejectReason: string | null;
  skills: CandidateSkill[];
  notes?: CandidateNote[];
  createdAt: string;
  updatedAt: string;
}

export interface CandidateInput {
  name: string;
  email: string;
  phone?: string;
  jobId: string;
  experienceYears?: number;
  currentCompany?: string;
  location?: string;
  education?: string;
  skills?: string[];
  resumeSummary?: string;
}
