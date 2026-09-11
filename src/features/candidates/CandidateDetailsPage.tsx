import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, Textarea } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { candidatesApi } from '@/lib/api/candidates.api';
import { CANDIDATE_STAGE_LABELS, CANDIDATE_STAGES, type CandidateStage } from '@/lib/api/candidates.types';
import { emailComposerApi } from '@/lib/api/email-composer.api';
import { EMAIL_TYPE_LABELS } from '@/lib/api/email-composer.types';
import { interviewsApi } from '@/lib/api/interviews.api';
import { INTERVIEW_STATUS_LABELS, type InterviewStatus } from '@/lib/api/interviews.types';
import { queryKeys } from '@/lib/api/queryKeys';
import { EmailComposerModal } from './EmailComposerModal';
import { ScheduleInterviewModal } from '@/features/interviews/ScheduleInterviewModal';

const STAGE_TONE: Record<CandidateStage, 'sky' | 'amber' | 'brand' | 'violet' | 'fuchsia' | 'green' | 'rose'> = {
  applied: 'sky',
  screening: 'amber',
  interview: 'brand',
  hr_review: 'violet',
  offer: 'fuchsia',
  hired: 'green',
  rejected: 'rose',
};

const IV_STATUS_TONE: Record<InterviewStatus, 'amber' | 'brand' | 'violet' | 'green' | 'slate'> = {
  scheduled: 'amber',
  invitation_sent: 'brand',
  in_progress: 'violet',
  pending_evaluation: 'violet',
  completed: 'green',
  cancelled: 'slate',
};

export function CandidateDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  const { data: candidate, isLoading } = useQuery({
    queryKey: queryKeys.candidate(organization?.id ?? '', id ?? ''),
    queryFn: () => candidatesApi.get(id!),
    enabled: !!id,
  });

  const { data: interviews } = useQuery({
    queryKey: queryKeys.interviews(organization?.id ?? '', { candidateId: id }),
    queryFn: () => interviewsApi.list({ candidateId: id }),
    enabled: !!id,
  });

  const { data: emails } = useQuery({
    queryKey: queryKeys.candidateEmails(organization?.id ?? '', id ?? ''),
    queryFn: () => emailComposerApi.list(id!),
    enabled: !!id,
  });

  const invalidateCandidate = () =>
    queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'candidates', id] });

  const stageMutation = useMutation({
    mutationFn: (stage: CandidateStage) => {
      const rejectReason =
        stage === 'rejected' ? (prompt('Reason for rejection (optional):') ?? undefined) : undefined;
      return candidatesApi.updateStage(id!, stage, rejectReason);
    },
    onSuccess: invalidateCandidate,
  });

  const noteMutation = useMutation({
    mutationFn: (body: string) => candidatesApi.addNote(id!, body),
    onSuccess: () => {
      setNoteText('');
      invalidateCandidate();
    },
  });

  const sendInvitationMutation = useMutation({
    mutationFn: (interviewId: string) => interviewsApi.sendInvitation(interviewId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'interviews'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (interviewId: string) => interviewsApi.cancel(interviewId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'interviews'] }),
  });

  const removeMutation = useMutation({
    mutationFn: () => candidatesApi.remove(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'candidates'] });
      navigate('/app/candidates');
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-ink-500">Loading…</div>;
  if (!candidate) return <div className="p-6 text-sm text-ink-500">Candidate not found.</div>;

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <nav className="text-[13px] text-ink-500 mb-4">
        <Link to="/app/candidates" className="hover:text-brand-600 font-medium">
          Candidates
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-800 font-semibold">{candidate.name}</span>
      </nav>

      <Card className="p-5 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-extrabold text-[22px] text-ink-900">{candidate.name}</h1>
              <Badge tone={STAGE_TONE[candidate.stage]} dot>
                {CANDIDATE_STAGE_LABELS[candidate.stage]}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[13px] text-ink-500">
              <span>{candidate.email}</span>
              {candidate.phone && <span>{candidate.phone}</span>}
              {candidate.job && (
                <Link to={`/app/jobs/${candidate.job.id}`} className="hover:text-brand-600">
                  {candidate.job.title}
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="h-10 px-3 rounded-lg border border-ink-200 bg-white text-sm"
              value={candidate.stage}
              onChange={(e) => stageMutation.mutate(e.target.value as CandidateStage)}
            >
              {[...CANDIDATE_STAGES, 'rejected' as const].map((s) => (
                <option key={s} value={s}>
                  Move to: {CANDIDATE_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
            <Button variant="ai" onClick={() => setScheduleOpen(true)}>
              Schedule interview
            </Button>
            <Button variant="secondary" onClick={() => setComposeOpen(true)}>
              ✉️ Compose email
            </Button>
            <Button
              variant="secondary"
              className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
              onClick={() => confirm(`Delete ${candidate.name}?`) && removeMutation.mutate()}
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5">
            <h2 className="font-bold text-ink-900 text-lg mb-3">Interviews</h2>
            {!interviews || interviews.length === 0 ? (
              <p className="text-sm text-ink-400">No interviews scheduled yet.</p>
            ) : (
              <div className="space-y-2.5">
                {interviews.map((iv) => (
                  <div key={iv.id} className="rounded-xl border border-ink-200 p-3.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-[14px] text-ink-900">{iv.roundName}</p>
                        <p className="text-[12px] text-ink-400">
                          {new Date(iv.scheduledAt).toLocaleString()} · {iv.durationMinutes} min
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={IV_STATUS_TONE[iv.status]} dot>
                          {INTERVIEW_STATUS_LABELS[iv.status]}
                        </Badge>
                        {iv.status === 'scheduled' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={sendInvitationMutation.isPending}
                            onClick={() => sendInvitationMutation.mutate(iv.id)}
                          >
                            Send invitation
                          </Button>
                        )}
                        {(iv.status === 'scheduled' || iv.status === 'invitation_sent') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
                            loading={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(iv.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-ink-900 text-lg mb-3">Notes</h2>
            <div className="space-y-3 mb-4">
              {candidate.notes?.map((n) => (
                <div key={n.id} className="rounded-lg bg-ink-50 p-3">
                  <p className="text-[13px] text-ink-700">{n.body}</p>
                  <p className="text-[11px] text-ink-400 mt-1">
                    {n.author?.name ?? 'Someone'} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {(!candidate.notes || candidate.notes.length === 0) && (
                <p className="text-sm text-ink-400">No notes yet.</p>
              )}
            </div>
            <Textarea
              rows={2}
              placeholder="Add a note for the hiring team…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={!noteText.trim()}
                loading={noteMutation.isPending}
                onClick={() => noteMutation.mutate(noteText)}
              >
                Add note
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-ink-900 text-lg mb-3">Emails</h2>
            {!emails || emails.length === 0 ? (
              <p className="text-sm text-ink-400">No emails sent yet.</p>
            ) : (
              <div className="space-y-2.5">
                {emails.map((e) => (
                  <div key={e.id} className="rounded-lg bg-ink-50 p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-[13px] text-ink-800">{e.subject}</p>
                      <Badge tone="slate">{EMAIL_TYPE_LABELS[e.type]}</Badge>
                    </div>
                    <p className="text-[11px] text-ink-400 mt-1">
                      {e.sentBy?.name ?? 'Someone'} · {new Date(e.sentAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-bold text-ink-900 text-lg mb-3">Details</h2>
            <dl className="space-y-3 text-[13px]">
              {[
                ['Experience', candidate.experienceYears != null ? `${candidate.experienceYears} yrs` : '—'],
                ['Current company', candidate.currentCompany ?? '—'],
                ['Location', candidate.location ?? '—'],
                ['Education', candidate.education ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3">
                  <dt className="text-ink-500 shrink-0">{k}</dt>
                  <dd className="font-semibold text-ink-800 text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold text-ink-900 text-lg mb-3">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.map((s) => (
                <Badge key={s.id} tone="brand">
                  {s.name}
                </Badge>
              ))}
              {candidate.skills.length === 0 && <p className="text-sm text-ink-400">No skills listed.</p>}
            </div>
          </Card>
        </div>
      </div>

      {candidate.job && (
        <ScheduleInterviewModal
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          candidate={candidate}
        />
      )}
      <EmailComposerModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        candidateId={id!}
        interviews={interviews}
      />
    </div>
  );
}
