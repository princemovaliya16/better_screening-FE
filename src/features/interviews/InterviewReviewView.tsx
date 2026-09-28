import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Ring } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { EmailComposerModal } from '@/features/candidates/EmailComposerModal';
import { candidatesApi } from '@/lib/api/candidates.api';
import {
  CANDIDATE_STAGE_LABELS,
  nextStageAfter,
  roundDecisionState,
  type CandidateStage,
} from '@/lib/api/candidates.types';
import type { EvaluationView } from '@/lib/api/evaluation.types';
import type { Interview, InterviewRecording } from '@/lib/api/interviews.types';
import { buildInterviewReview } from './interviewReview';
import { RecordingPlayer } from './RecordingPlayer';

/**
 * The HR review screen for a finished interview: recording, AI scoring, and the
 * accept/reject decision in one place, so a decision can be made without bouncing
 * back to the candidate profile.
 */
export function InterviewReviewView({
  interview,
  evaluation,
  recordings,
  recordingsLoading,
  onRecordingUrlExpired,
}: {
  interview: Interview;
  evaluation?: EvaluationView;
  recordings?: InterviewRecording[];
  recordingsLoading: boolean;
  onRecordingUrlExpired: () => void;
}) {
  const { organization } = useOrg();
  const queryClient = useQueryClient();
  const [emailOpen, setEmailOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  const review = buildInterviewReview(interview, evaluation, recordings);
  const recordedIds = new Set((recordings ?? []).map((r) => r.questionId));
  const candidate = interview.candidate;
  const decision = candidate ? roundDecisionState(candidate.stage, interview.type) : 'pending';
  const firstName = candidate?.name.split(' ')[0] ?? 'the candidate';

  const stageMutation = useMutation({
    mutationFn: (stage: CandidateStage) => {
      const rejectReason =
        stage === 'rejected' ? (prompt('Reason for rejection (optional):') ?? undefined) : undefined;
      return candidatesApi.updateStage(candidate!.id, stage, rejectReason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'candidates'] });
      queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'interviews'] });
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
      <div className="space-y-5">
        <RecordingPlayer
          recordings={recordings}
          isLoading={recordingsLoading}
          selectedQuestionId={selectedQuestionId}
          onSelect={setSelectedQuestionId}
          onUrlExpired={onRecordingUrlExpired}
        />

        {/* AI summary */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg ai-gradient grid place-items-center text-white text-sm">✨</div>
              <h2 className="font-display font-bold text-ink-900 text-[17px]">AI interview summary</h2>
            </div>
            <div className="flex items-center gap-2">
              {review.isSample && <Badge tone="slate">Sample data · evaluation engine coming soon</Badge>}
              <Badge tone="brand" dot>
                {review.recommendationLabel}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4">
            <div className="rounded-xl border border-ink-100 p-5 grid place-items-center">
              <div className="text-center">
                <Ring value={review.overallScore} size={92} stroke={7} />
                <p className="text-[12px] text-ink-400 mt-2">Overall score</p>
              </div>
            </div>
            <div className="rounded-xl bg-ink-50/70 p-4">
              <p className="text-[11px] font-semibold tracking-wide text-ink-400 mb-2">OBSERVATIONS</p>
              <p className="text-[13px] text-ink-700 leading-relaxed">{review.observations}</p>
              <p className="text-[13px] text-ink-700 leading-relaxed mt-3">
                <span className="font-semibold">Communication:</span> {review.communicationNote}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-5">
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-emerald-600 mb-2">⊘ STRENGTHS</p>
              <ul className="space-y-1.5">
                {review.strengths.map((s, i) => (
                  <li key={i} className="text-[13px] text-ink-700 flex gap-2">
                    <span className="text-emerald-500">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-amber-600 mb-2">⚠ AREAS TO EXPLORE</p>
              <ul className="space-y-1.5">
                {review.weaknesses.map((s, i) => (
                  <li key={i} className="text-[13px] text-ink-700 flex gap-2">
                    <span className="text-amber-500">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        {/* Per-question analysis */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h2 className="font-display font-bold text-ink-900 text-[17px]">AI question analysis</h2>
              <p className="text-[12px] text-ink-400 mt-0.5">
                {review.questions.length} question{review.questions.length === 1 ? '' : 's'} · scored individually
              </p>
            </div>
            {review.hasSampleQuestions ? (
              <Badge tone="slate">Sample questions</Badge>
            ) : (
              review.hasSampleAnswers && <Badge tone="slate">Sample answers</Badge>
            )}
          </div>
          <div className="mt-4">
            <div className="space-y-3">
              {review.questions.map((q, i) => (
                <div
                  key={q.id}
                  className={`rounded-xl border p-4 ${
                    recordedIds.has(q.id) ? 'cursor-pointer hover:border-brand-200' : ''
                  } ${selectedQuestionId === q.id ? 'border-brand-300 bg-brand-50/30' : 'border-ink-100'}`}
                  onClick={() => recordedIds.has(q.id) && setSelectedQuestionId(q.id)}
                >
                  <div className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-md bg-ink-100 text-ink-500 grid place-items-center text-[12px] font-bold">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-ink-800 mb-2">{q.questionText}</p>
                      <div className="rounded-lg bg-ink-50/70 p-3">
                        <p className="text-[11px] font-semibold tracking-wide text-ink-400 mb-1">
                          {review.hasSampleAnswers ? 'CANDIDATE ANSWER' : 'TRANSCRIPT'}
                        </p>
                        <p className="text-[13px] text-ink-700">{q.answer}</p>
                      </div>
                      <p className="text-[12.5px] text-brand-700 mt-2.5">
                        <span className="font-semibold">✨ AI feedback:</span> {q.feedback}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-extrabold text-brand-600 text-[19px] tabular-nums">{q.score}</p>
                      <p className="text-[11px] text-ink-400">/ 100</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Decision + scores */}
      <div className="space-y-5 lg:sticky lg:top-4">
        {candidate && (
          <Card className="p-5">
            <h2 className="font-display font-bold text-ink-900 text-[17px] mb-1.5">Decision</h2>
            {decision === 'pending' ? (
              <>
                <p className="text-[13px] text-ink-500 mb-4">
                  Review the AI results and decide whether {firstName} advances to the next round.
                </p>
                <Button
                  className="w-full !bg-emerald-600 hover:!bg-emerald-700 !shadow-emerald-600/20"
                  loading={stageMutation.isPending && stageMutation.variables !== 'rejected'}
                  onClick={() => stageMutation.mutate(nextStageAfter(candidate.stage))}
                >
                  ✓ Accept &amp; advance
                </Button>
                <Button
                  variant="secondary"
                  className="w-full mt-2 !text-rose-600 !border-rose-200 hover:!bg-rose-50"
                  loading={stageMutation.isPending && stageMutation.variables === 'rejected'}
                  onClick={() => stageMutation.mutate('rejected')}
                >
                  ✕ Reject candidate
                </Button>
              </>
            ) : (
              <div className="mb-4">
                <Badge tone={decision === 'rejected' ? 'rose' : 'green'} dot>
                  {decision === 'rejected' ? 'Rejected' : 'Advanced'}
                </Badge>
                <p className="text-[13px] text-ink-500 mt-2">
                  {decision === 'rejected'
                    ? `${firstName} was not moved forward after this round.`
                    : `${firstName} passed this round and is now in ${CANDIDATE_STAGE_LABELS[candidate.stage]}.`}
                </p>
              </div>
            )}
            <Button variant="ghost" className="w-full mt-2" onClick={() => setEmailOpen(true)}>
              ✉ Email candidate
            </Button>
            <Link
              to={`/app/candidates/${candidate.id}`}
              className="block text-center text-[12.5px] font-medium text-brand-600 hover:text-brand-700 mt-3"
            >
              View full profile
            </Link>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="font-display font-bold text-ink-900 text-[17px] mb-4">Competency scores</h2>
          <div className="space-y-3.5">
            {review.competencies.map((c) => (
              <div key={c.key}>
                <div className="flex items-center justify-between text-[13px] mb-1.5">
                  <span className="text-ink-600">{c.label}</span>
                  <span className="font-bold text-ink-900 tabular-nums">{c.value}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.value < 65 ? 'bg-amber-400' : 'bg-brand-500'}`}
                    style={{ width: `${c.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {candidate && (
        <EmailComposerModal
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
          candidateId={candidate.id}
          interviews={[interview]}
          defaultType={decision === 'rejected' ? 'rejected' : 'followup'}
        />
      )}
    </div>
  );
}
