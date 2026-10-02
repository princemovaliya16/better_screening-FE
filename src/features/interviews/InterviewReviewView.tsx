import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card } from '@/components/ui';
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
import { AiAnalysisPanel, QuestionScoreChips } from './AiAnalysisPanel';
import { buildReviewQuestions } from './interviewReview';
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

  const questions = buildReviewQuestions(interview, evaluation, recordings);
  const summary = evaluation?.status === 'completed' ? evaluation.summary : undefined;
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

        {/* AI analysis — only ever the real evaluation */}
        <Card className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg ai-gradient grid place-items-center text-white text-sm">✨</div>
            <h2 className="font-display font-bold text-ink-900 text-[17px]">AI interview analysis</h2>
          </div>
          {summary ? (
            <AiAnalysisPanel summary={summary} />
          ) : (
            <p className="text-[13px] text-ink-500">
              The AI analysis isn't available for this interview yet.
            </p>
          )}
        </Card>

        {/* Per-question analysis */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h2 className="font-display font-bold text-ink-900 text-[17px]">AI question analysis</h2>
              <p className="text-[12px] text-ink-400 mt-0.5">
                {questions.length} question{questions.length === 1 ? '' : 's'} · scored individually
              </p>
            </div>
          </div>
          <div className="mt-4">
            {questions.length === 0 && (
              <p className="text-[13px] text-ink-500">No questions were configured for this round.</p>
            )}
            <div className="space-y-3">
              {questions.map((q, i) => (
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
                        <p className="text-[11px] font-semibold tracking-wide text-ink-400 mb-1">TRANSCRIPT</p>
                        <p className="text-[13px] text-ink-700">{q.answer}</p>
                      </div>
                      {q.dimensionScores && (
                        <div className="mt-2.5">
                          <QuestionScoreChips dimensionScores={q.dimensionScores} />
                        </div>
                      )}
                      {q.feedback && (
                        <p className="text-[12.5px] text-brand-700 mt-2.5">
                          <span className="font-semibold">✨ AI feedback:</span> {q.feedback}
                        </p>
                      )}
                    </div>
                    {q.score != null && (
                      <div className="text-right shrink-0">
                        <p className="font-display font-extrabold text-brand-600 text-[19px] tabular-nums">{q.score}%</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Decision */}
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
