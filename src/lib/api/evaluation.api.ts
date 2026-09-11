import { api } from './client';
import type { EvaluationView } from './evaluation.types';

export const evaluationApi = {
  get: (interviewId: string) => api.get<EvaluationView>(`/interviews/${interviewId}/evaluation`),
};
