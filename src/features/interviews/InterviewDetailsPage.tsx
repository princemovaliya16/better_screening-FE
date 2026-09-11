import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Card } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { evaluationApi } from '@/lib/api/evaluation.api';
import {
  EVALUATION_STATUS_LABELS,
  RECOMMENDATION_LABELS,
  type EvaluationRecommendation,
} from '@/lib/api/evaluation.types';
import { interviewsApi } from '@/lib/api/interviews.api';
import { INTERVIEW_STATUS_LABELS, type InterviewStatus } from '@/lib/api/interviews.types';
import { queryKeys } from '@/lib/api/queryKeys';

const RECOMMENDATION_TONE: Record<EvaluationRecommendation, 'green' | 'brand' | 'amber' | 'rose'> = {
  strong_hire: 'green',
  hire: 'brand',
  no_hire: 'amber',
  strong_no_hire: 'rose',
};

const COMPETENCY_LABELS: Record<string, string> = {
  technicalSkills: 'Technical skills',
  problemSolving: 'Problem solving',
  communication: 'Communication',
  culturalFit: 'Cultural fit',
  experienceRelevance: 'Experience relevance',
};

const STATUS_TONE: Record<InterviewStatus, 'amber' | 'brand' | 'violet' | 'green' | 'slate'> = {
  scheduled: 'amber',
  invitation_sent: 'brand',
  in_progress: 'violet',
  pending_evaluation: 'violet',
  completed: 'green',
  cancelled: 'slate',
};

export function InterviewDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const queryClient = useQueryClient();

  const { data: interview, isLoading } = useQuery({
    queryKey: queryKeys.interview(organization?.id ?? '', id ?? ''),
    queryFn: () => interviewsApi.get(id!),
    enabled: !!id,
  });

  const { data: evaluation } = useQuery({
    queryKey: queryKeys.interviewEvaluation(organization?.id ?? '', id ?? ''),
    queryFn: () => evaluationApi.get(id!),
    enabled: !!id,
    // Keep polling while the AI pipeline is still working — stop once we land on a
    // terminal state (or the round hasn't even been submitted yet).
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'transcribing' || status === 'evaluating' ? 8000 : false;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'interviews'] });
  };

  const sendInvitationMutation = useMutation({
    mutationFn: () => interviewsApi.sendInvitation(id!),
    onSuccess: invalidate,
  });
  const cancelMutation = useMutation({
    mutationFn: () => interviewsApi.cancel(id!),
    onSuccess: invalidate,
  });
  const retryEvaluationMutation = useMutation({
    mutationFn: () => interviewsApi.retryEvaluation(id!),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({
        queryKey: queryKeys.interviewEvaluation(organization?.id ?? '', id ?? ''),
      });
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-ink-500">Loading…</div>;
  if (!interview) return <div className="p-6 text-sm text-ink-500">Interview not found.</div>;

  return (
    <div className="p-6 max-w-[900px] mx-auto">
      <nav className="text-[13px] text-ink-500 mb-4">
        <Link to="/app/interviews" className="hover:text-brand-600 font-medium">
          Interviews
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-800 font-semibold">{interview.roundName}</span>
      </nav>

      <Card className="p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-extrabold text-[20px] text-ink-900">{interview.roundName}</h1>
              <Badge tone={STATUS_TONE[interview.status]} dot>
                {INTERVIEW_STATUS_LABELS[interview.status]}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[13px] text-ink-500">
              {interview.candidate && (
                <Link to={`/app/candidates/${interview.candidate.id}`} className="hover:text-brand-600">
                  {interview.candidate.name}
                </Link>
              )}
              {interview.job && (
                <Link to={`/app/jobs/${interview.job.id}`} className="hover:text-brand-600">
                  {interview.job.title}
                </Link>
              )}
              <span>{new Date(interview.scheduledAt).toLocaleString()}</span>
              <span>{interview.durationMinutes} min</span>
              <span>{interview.timezone}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {interview.status === 'scheduled' && (
              <Button
                variant="ai"
                loading={sendInvitationMutation.isPending}
                onClick={() => sendInvitationMutation.mutate()}
              >
                Send invitation
              </Button>
            )}
            {(interview.status === 'scheduled' || interview.status === 'invitation_sent') && (
              <Button
                variant="secondary"
                className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
                loading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>

      {evaluation && evaluation.status !== 'not_submitted' && (
        <Card className="p-5 mb-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-bold text-ink-900 text-lg">AI Evaluation</h2>
            {evaluation.status !== 'completed' && (
              <div className="flex items-center gap-2">
                <Badge tone={evaluation.status === 'transcription_failed' ? 'rose' : 'violet'} dot>
                  {EVALUATION_STATUS_LABELS[evaluation.status]}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={retryEvaluationMutation.isPending}
                  onClick={() => retryEvaluationMutation.mutate()}
                >
                  Retry evaluation
                </Button>
              </div>
            )}
          </div>

          {evaluation.status !== 'completed' ? (
            <p className="text-sm text-ink-400">
              {evaluation.status === 'transcription_failed'
                ? "The interview recording couldn't be transcribed. Try retrying once the issue is resolved."
                : 'This can take a few minutes — the page checks automatically.'}
            </p>
          ) : (
            evaluation.summary && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-16 h-16 rounded-full ai-gradient text-white grid place-items-center font-extrabold text-xl shrink-0">
                    {Math.round(Number(evaluation.summary.overallScore))}
                  </div>
                  <div>
                    <Badge tone={RECOMMENDATION_TONE[evaluation.summary.recommendation]}>
                      {RECOMMENDATION_LABELS[evaluation.summary.recommendation]}
                    </Badge>
                    <p className="text-[13px] text-ink-500 mt-1.5">{evaluation.summary.observations}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Object.entries(evaluation.summary.competencyScores).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-ink-100 p-2.5">
                      <p className="text-[11px] text-ink-400">{COMPETENCY_LABELS[key] ?? key}</p>
                      <p className="font-bold text-ink-800 text-[15px]">{Math.round(Number(value))}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[12px] font-semibold text-ink-500 mb-1.5">Strengths</p>
                    <ul className="space-y-1">
                      {evaluation.summary.strengths.map((s, i) => (
                        <li key={i} className="text-[13px] text-ink-700 flex gap-1.5">
                          <span className="text-emerald-500">✓</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-ink-500 mb-1.5">Weaknesses</p>
                    <ul className="space-y-1">
                      {evaluation.summary.weaknesses.map((s, i) => (
                        <li key={i} className="text-[13px] text-ink-700 flex gap-1.5">
                          <span className="text-rose-500">✕</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-ink-500 mb-1">Communication</p>
                  <p className="text-[13px] text-ink-700">{evaluation.summary.communicationNote}</p>
                </div>
              </div>
            )
          )}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-bold text-ink-900 text-lg mb-3">
          Questions ({interview.questions.length})
        </h2>
        {interview.questions.length === 0 ? (
          <p className="text-sm text-ink-400">No questions configured for this round.</p>
        ) : (
          <div className="space-y-2">
            {interview.questions.map((q, i) => {
              const analysis = evaluation?.questionAnalyses?.find((a) => a.interviewQuestionId === q.id);
              return (
                <div key={q.id} className="flex gap-2.5 text-[13px] rounded-lg border border-ink-100 p-3">
                  <span className="font-semibold text-ink-400">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-ink-700">{q.questionText}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge tone="slate">{q.questionType}</Badge>
                      {analysis && (
                        <Badge tone="violet">Score: {Math.round(Number(analysis.score))}</Badge>
                      )}
                    </div>
                    {analysis && <p className="text-[12px] text-ink-500 mt-1.5">{analysis.feedback}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
