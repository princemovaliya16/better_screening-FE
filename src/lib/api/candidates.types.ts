import type { InterviewRoundType, Job } from './jobs.types';

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

/** Position of each stage in the forward-only pipeline (rejected sits outside it). */
export const STAGE_RANK: Record<CandidateStage, number> = {
  applied: 0,
  screening: 1,
  interview: 2,
  hr_review: 3,
  offer: 4,
  hired: 5,
  rejected: 99,
};

/** Mirrors the backend's own `stageForRoundType` (interviews.service.ts): the stage a
 * candidate sits in while a round of this type is awaiting a decision. */
export const ROUND_TYPE_STAGE: Record<InterviewRoundType, CandidateStage> = {
  ai_interview: 'screening',
  hr: 'hr_review',
  technical: 'interview',
};

/** Whether a completed round of `roundType` still needs a decision, given where the
 * candidate currently sits — there's no stored per-round outcome, so it's inferred. */
export function roundDecisionState(
  stage: CandidateStage,
  roundType: InterviewRoundType,
): 'pending' | 'advanced' | 'rejected' {
  if (stage === 'rejected') return 'rejected';
  return STAGE_RANK[stage] > STAGE_RANK[ROUND_TYPE_STAGE[roundType]] ? 'advanced' : 'pending';
}

/** Next stage in the forward-only pipeline — what "Accept & advance" moves a candidate to. */
export function nextStageAfter(stage: CandidateStage): CandidateStage {
  const idx = CANDIDATE_STAGES.indexOf(stage);
  return CANDIDATE_STAGES[idx + 1] ?? 'hired';
}

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
  /** Storage key + extracted text returned by `parseResume` — passing them through
   * on create is what attaches the uploaded file to the candidate record. */
  resumePath?: string;
  resumeText?: string;
}

/** A best-effort extraction from an uploaded resume, used to pre-fill the Add
 * Candidate form for the recruiter to review/edit. The file itself is already stored
 * by then — `resumePath`/`resumeText` are carried through to `create`. */
export interface ParsedResumeInfo {
  name?: string;
  email?: string;
  phone?: string;
  experienceYears?: number;
  currentCompany?: string;
  location?: string;
  education?: string;
  skills?: string[];
  resumePath?: string;
  resumeText?: string;
}
