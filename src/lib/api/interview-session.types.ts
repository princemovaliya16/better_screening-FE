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

/** Everything the browser needs to join the candidate's LiveKit room. The first
 * join also starts the round clock, so `deadlineAt` is always set here. */
export interface LivekitJoinResponse {
  wsUrl: string;
  token: string;
  roomName: string;
  startedAt: string;
  deadlineAt: string;
}

export type RecordingStatus =
  | 'recording'
  | 'processing'
  | 'failed'
  | 'uploaded'
  | 'transcribed'
  | 'scored';
