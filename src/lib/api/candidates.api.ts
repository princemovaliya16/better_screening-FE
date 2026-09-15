import { api } from './client';
import type {
  Candidate,
  CandidateInput,
  CandidateNote,
  CandidateStage,
  ParsedResumeInfo,
} from './candidates.types';
import { toQueryString } from './queryString';

export interface ListCandidatesParams {
  jobId?: string;
  stage?: CandidateStage;
  search?: string;
}

export const candidatesApi = {
  list: (params: ListCandidatesParams = {}) =>
    api.get<Candidate[]>(`/candidates${toQueryString(params)}`),
  get: (id: string) => api.get<Candidate>(`/candidates/${id}`),
  /** Short-lived signed URL — the resumes bucket is private, so `resumePath` on the
   * candidate is a storage key, not something the browser can open directly. */
  resumeUrl: (id: string) => api.get<{ url: string }>(`/candidates/${id}/resume-url`),
  create: (input: CandidateInput) => api.post<Candidate>('/candidates', input),
  update: (id: string, input: Partial<CandidateInput>) =>
    api.patch<Candidate>(`/candidates/${id}`, input),
  updateStage: (id: string, stage: CandidateStage, rejectReason?: string) =>
    api.patch<Candidate>(`/candidates/${id}/stage`, { stage, rejectReason }),
  addNote: (id: string, body: string) => api.post<CandidateNote>(`/candidates/${id}/notes`, { body }),
  remove: (id: string) => api.delete<void>(`/candidates/${id}`),
  parseResume: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.postForm<ParsedResumeInfo>('/candidates/parse-resume', formData);
  },
};
