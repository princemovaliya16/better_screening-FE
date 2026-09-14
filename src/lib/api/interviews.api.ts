import { api } from './client';
import type {
  Interview,
  InterviewStatus,
  RescheduleInterviewInput,
  ScheduleInterviewInput,
} from './interviews.types';
import { toQueryString } from './queryString';

export interface ListInterviewsParams {
  candidateId?: string;
  jobId?: string;
  status?: InterviewStatus;
}

export const interviewsApi = {
  list: (params: ListInterviewsParams = {}) =>
    api.get<Interview[]>(`/interviews${toQueryString(params)}`),
  get: (id: string) => api.get<Interview>(`/interviews/${id}`),
  schedule: (input: ScheduleInterviewInput) => api.post<Interview>('/interviews', input),
  reschedule: (id: string, input: RescheduleInterviewInput) =>
    api.patch<Interview>(`/interviews/${id}`, input),
  sendInvitation: (id: string) => api.post<Interview>(`/interviews/${id}/send-invitation`),
  /** Mints a fresh join link for the recruiter to view/copy — does not re-send the
   * invitation email. Not available once the interview is cancelled or completed. */
  joinLink: (id: string) => api.get<{ url: string }>(`/interviews/${id}/join-link`),
  cancel: (id: string) => api.post<Interview>(`/interviews/${id}/cancel`),
  retryEvaluation: (id: string) => api.post<Interview>(`/interviews/${id}/retry-evaluation`),
};
