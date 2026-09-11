import { api } from './client';
import type { Candidate, CandidateInput, CandidateNote, CandidateStage } from './candidates.types';
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
  create: (input: CandidateInput) => api.post<Candidate>('/candidates', input),
  update: (id: string, input: Partial<CandidateInput>) =>
    api.patch<Candidate>(`/candidates/${id}`, input),
  updateStage: (id: string, stage: CandidateStage, rejectReason?: string) =>
    api.patch<Candidate>(`/candidates/${id}/stage`, { stage, rejectReason }),
  addNote: (id: string, body: string) => api.post<CandidateNote>(`/candidates/${id}/notes`, { body }),
  remove: (id: string) => api.delete<void>(`/candidates/${id}`),
};
