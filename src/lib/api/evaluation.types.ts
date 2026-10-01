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

/** The six analysis categories — each scored 0–100 on its own (they don't add up to
 * 100). Order here is display order. */
export const SCORE_DIMENSIONS = [
  { key: 'knowledge', label: 'Knowledge', hint: 'Correctness and depth on the role’s skills' },
  { key: 'communication', label: 'Communication & speech', hint: 'Clarity, structure, fluency and pace' },
  { key: 'relevance', label: 'Answer relevance', hint: 'How directly answers addressed the questions' },
  { key: 'jobFit', label: 'Job fit', hint: 'Resume and answers vs. the job description' },
  { key: 'problemSolving', label: 'Problem solving', hint: 'Reasoning, examples and trade-offs' },
  { key: 'confidence', label: 'Confidence', hint: 'Inferred from speech pace and wording' },
] as const;

/** Labels for every category key, including ones used by evaluations stored before
 * the six categories existed. */
export const SCORE_LABELS: Record<string, string> = {
  ...Object.fromEntries(SCORE_DIMENSIONS.map((d) => [d.key, d.label])),
  technicalSkills: 'Technical skills',
  culturalFit: 'Cultural fit',
  experienceRelevance: 'Experience relevance',
};

/** Category key → 0–100. */
export type CompetencyScores = Record<string, number>;

/** Measured delivery, computed from the transcript timings (not judged by the AI). */
export interface SpeechMetricsValues {
  wordCount: number;
  speakingSeconds: number;
  recordingSeconds: number | null;
  wordsPerMinute: number | null;
  talkRatio: number | null;
  longPauses: number;
  responseDelaySeconds: number | null;
}

export interface SpeechMetrics {
  overall: SpeechMetricsValues;
  perQuestion: Record<string, SpeechMetricsValues>;
}

export interface QuestionDimensionScores {
  knowledge: number;
  communication: number;
  relevance: number;
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
  /** One-line reason per category; null on evaluations made before the six categories. */
  scoreReasons?: Record<string, string> | null;
  speechMetrics?: SpeechMetrics | null;
}

export interface InterviewQuestionAnalysis {
  id: string;
  interviewQuestionId: string;
  score: number;
  feedback: string;
  dimensionScores?: QuestionDimensionScores | null;
}

export interface EvaluationView {
  status: EvaluationStatus;
  summary?: InterviewSummary;
  questionAnalyses?: InterviewQuestionAnalysis[];
}
