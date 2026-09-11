export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship';
export type JobStatus = 'draft' | 'open' | 'closed';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SkillImportance = 'low' | 'medium' | 'high';
export type InterviewRoundType = 'ai_interview' | 'technical' | 'hr';
export type QuestionType = 'technical' | 'behavioral' | 'situational' | 'experience' | 'culture';

export interface JobSkill {
  id: string;
  name: string;
  level: SkillLevel;
  required: boolean;
  importance: SkillImportance;
  orderIndex: number;
}

export interface RoundQuestion {
  id: string;
  questionText: string;
  questionType: QuestionType;
  orderIndex: number;
}

export interface RoundTemplate {
  id: string;
  name: string;
  type: InterviewRoundType;
  orderIndex: number;
  durationMinutes: number;
  defaultInterviewerUserId: string | null;
  questions: RoundQuestion[];
}

export interface Job {
  id: string;
  organizationId: string;
  title: string;
  department: string;
  location: string | null;
  employmentType: EmploymentType;
  experienceMin: number | null;
  experienceMax: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  positionsCount: number;
  status: JobStatus;
  description: string;
  createdByUserId: string | null;
  skills: JobSkill[];
  rounds: RoundTemplate[];
  createdAt: string;
  updatedAt: string;
}

export interface JobSkillInput {
  name: string;
  level?: SkillLevel;
  required?: boolean;
  importance?: SkillImportance;
  orderIndex?: number;
}

export interface RoundQuestionInput {
  questionText: string;
  questionType?: QuestionType;
  orderIndex?: number;
}

export interface RoundTemplateInput {
  name: string;
  type?: InterviewRoundType;
  orderIndex?: number;
  durationMinutes?: number;
  defaultInterviewerUserId?: string;
  questions?: RoundQuestionInput[];
}

/** A suggestion only — not persisted until the recruiter keeps it and saves the
 * round via the normal job-update endpoint. */
export interface GeneratedQuestion {
  questionText: string;
  questionType: QuestionType;
}

export interface GenerateQuestionsInput {
  count?: number;
  additionalContext?: string;
}

export interface JobInput {
  title: string;
  department: string;
  location?: string;
  employmentType?: EmploymentType;
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  positionsCount?: number;
  status?: JobStatus;
  description: string;
  skills?: JobSkillInput[];
  rounds?: RoundTemplateInput[];
}
