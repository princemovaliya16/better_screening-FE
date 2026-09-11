export interface CandidateSessionQuestion {
  id: string;
  orderIndex: number;
  questionText: string;
  questionType: string;
  answered: boolean;
}

export interface CandidateSessionResponse {
  status: 'active' | 'submitted';
  roundName: string;
  jobTitle: string;
  candidateName: string;
  durationMinutes: number;
  startedAt: string | null;
  deadlineAt: string | null;
  questions: CandidateSessionQuestion[];
}

export interface UploadUrlResponse {
  uploadUrl: string;
  storageKey: string;
}
