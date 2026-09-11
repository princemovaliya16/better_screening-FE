import { api } from './client';
import type { CandidateSessionResponse, UploadUrlResponse } from './interview-session.types';

/** Candidate portal — token-only auth (no JWT), so every call passes `auth: false`
 * to the shared client (no Authorization header, no 401-triggered token clearing). */
export const interviewSessionApi = {
  getSession: (token: string) =>
    api.get<CandidateSessionResponse>(`/interview-session/${token}`, { auth: false }),

  getUploadUrl: (token: string, questionId: string, mimeType: string) =>
    api.post<UploadUrlResponse>(
      `/interview-session/${token}/questions/${questionId}/upload-url`,
      { mimeType },
      { auth: false },
    ),

  completeQuestion: (
    token: string,
    questionId: string,
    body: { storageKey: string; mimeType: string; durationSeconds?: number; sizeBytes?: number },
  ) =>
    api.post<{ questionId: string; status: string }>(
      `/interview-session/${token}/questions/${questionId}/complete`,
      body,
      { auth: false },
    ),

  submit: (token: string) =>
    api.post<{ status: 'submitted' }>(`/interview-session/${token}/submit`, undefined, {
      auth: false,
    }),

  /** Uploads the recording directly to storage via the presigned URL — not
   * through our API, so no Authorization header and no JSON envelope. */
  uploadToPresignedUrl: async (uploadUrl: string, blob: Blob, contentType: string) => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  },
};
