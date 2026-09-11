export type EvaluationRecommendation = 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';

export const RECOMMENDATION_LABELS: Record<EvaluationRecommendation, string> = {
  strong_hire: 'Strong Hire',
  hire: 'Hire',
  no_hire: 'No Hire',
  strong_no_hire: 'Strong No Hire',
};

/** Mirrors the backend's read model — computed from interview/transcript/summary
 * state rather than stored directly. */
export type EvaluationStatus =
  | 'not_submitted'
  | 'transcribing'
  | 'transcription_failed'
  | 'evaluating'
  | 'completed';

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  not_submitted: 'Not submitted yet',
  transcribing: 'Transcribing recording…',
  transcription_failed: 'Transcription failed',
  evaluating: 'Evaluating…',
  completed: 'Completed',
};

export interface CompetencyScores {
  technicalSkills: number;
  problemSolving: number;
  communication: number;
  culturalFit: number;
  experienceRelevance: number;
}

export interface InterviewSummary {
  id: string;
  interviewId: string;
  overallScore: number;
  recommendation: EvaluationRecommendation;
  strengths: string[];
  weaknesses: string[];
  observations: string;
  communicationNote: string;
  competencyScores: CompetencyScores;
}

export interface InterviewQuestionAnalysis {
  id: string;
  interviewQuestionId: string;
  score: number;
  feedback: string;
}

export interface EvaluationView {
  status: EvaluationStatus;
  summary?: InterviewSummary;
  questionAnalyses?: InterviewQuestionAnalysis[];
}
