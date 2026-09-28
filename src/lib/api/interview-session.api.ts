import { api } from './client';
import type {
  CandidateSessionResponse,
  LivekitJoinResponse,
  RecordingStatus,
} from './interview-session.types';

/** Candidate portal — token-only auth (no JWT), so every call passes `auth: false`
 * to the shared client (no Authorization header, no 401-triggered token clearing). */
export const interviewSessionApi = {
  getSession: (token: string) =>
    api.get<CandidateSessionResponse>(`/interview-session/${token}`, { auth: false }),

  /** Joins (or rejoins) the LiveKit room; the first call starts the round clock. */
  joinLivekit: (token: string) =>
    api.post<LivekitJoinResponse>(`/interview-session/${token}/livekit/join`, undefined, {
      auth: false,
    }),

  /** Recording happens server-side (LiveKit Egress) — these only start/stop it. */
  startRecording: (token: string, questionId: string) =>
    api.post<{ questionId: string; status: RecordingStatus }>(
      `/interview-session/${token}/questions/${questionId}/recording/start`,
      undefined,
      { auth: false },
    ),

  stopRecording: (token: string, questionId: string) =>
    api.post<{ questionId: string; status: RecordingStatus }>(
      `/interview-session/${token}/questions/${questionId}/recording/stop`,
      undefined,
      { auth: false },
    ),

  submit: (token: string) =>
    api.post<{ status: 'submitted' }>(`/interview-session/${token}/submit`, undefined, {
      auth: false,
    }),
};
