import { api } from './client';
import type {
  CandidateEmail,
  ComposedEmail,
  ComposeEmailInput,
  SendEmailInput,
} from './email-composer.types';

export const emailComposerApi = {
  compose: (candidateId: string, input: ComposeEmailInput) =>
    api.post<ComposedEmail>(`/candidates/${candidateId}/emails/compose`, input),
  send: (candidateId: string, input: SendEmailInput) =>
    api.post<CandidateEmail>(`/candidates/${candidateId}/emails/send`, input),
  list: (candidateId: string) => api.get<CandidateEmail[]>(`/candidates/${candidateId}/emails`),
};
