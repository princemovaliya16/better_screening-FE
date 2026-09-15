import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Card,
  IconAward,
  IconMail,
  IconSparkle,
  IconXCircle,
  Ring,
  Textarea,
} from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { candidatesApi } from '@/lib/api/candidates.api';
import {
  CANDIDATE_STAGE_LABELS,
  CANDIDATE_STAGES,
  nextStageAfter,
  ROUND_TYPE_STAGE,
  STAGE_RANK,
  type Candidate,
  type CandidateStage,
} from '@/lib/api/candidates.types';
import { emailComposerApi } from '@/lib/api/email-composer.api';
import { EMAIL_TYPE_LABELS, type EmailType } from '@/lib/api/email-composer.types';
import { interviewsApi } from '@/lib/api/interviews.api';
import { INTERVIEW_STATUS_LABELS, type Interview } from '@/lib/api/interviews.types';
import type { RoundTemplate } from '@/lib/api/jobs.types';
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

const TABS = ['overview', 'timeline', 'interviews', 'evaluation', 'resume'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  timeline: 'Timeline',
  interviews: 'Interviews',
  evaluation: 'AI Evaluation',
  resume: 'Resume',
};

/**
 * Placeholder AI evaluation breakdown, shown as static frontend data until the real
 * AI evaluation engine is wired up — then this should be replaced with data fetched
 * from the backend (per-candidate, per-round).
 */
const STATIC_AI_EVALUATION = {
  recommendation: 'Hire',
  competencies: [
    { label: 'Technical skills', value: 82 },
    { label: 'Problem solving', value: 81 },
    { label: 'Communication', value: 69 },
    { label: 'Confidence', value: 69 },
    { label: 'Job fit', value: 73 },
  ],
};

const shortRoundName = (name: string) => name.replace(' Interview', '').replace(' / Culture', '');
const fmtDate = (d: string) =>
  new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

type StepStatus = 'passed' | 'review' | 'scheduled' | 'rejected' | 'current' | 'todo';
interface RoundStep {
  round: RoundTemplate;
  idx: number;
  status: StepStatus;
  interview?: Interview;
}

/** Derives a per-round tracker status purely from real data (job round templates +
 * the candidate's interview records + their current stage) — there's no separate
 * "round outcome" stored on the backend, so this infers it the same way the backend's
 * own forward-only stage rules would. */
function computeRoundSteps(candidate: Candidate, interviews: Interview[] | undefined): RoundStep[] {
  const rounds = candidate.job?.rounds ?? [];
  const byRound = new Map<number, Interview[]>();
  for (const iv of interviews ?? []) {
    if (iv.status === 'cancelled') continue;
    const arr = byRound.get(iv.roundIndex) ?? [];
    arr.push(iv);
    byRound.set(iv.roundIndex, arr);
  }
  let lastCompletedIdx = -1;
  rounds.forEach((_, idx) => {
    if ((byRound.get(idx) ?? []).some((iv) => iv.status === 'completed')) lastCompletedIdx = idx;
  });

  let firstUnscheduledClaimed = false;
  return rounds.map((round, idx) => {
    const ivs = byRound.get(idx) ?? [];
    const latest = ivs.slice().sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
    let status: StepStatus;
    if (!latest) {
      if (candidate.stage === 'rejected') status = 'todo';
      else if (!firstUnscheduledClaimed) {
        status = 'current';
        firstUnscheduledClaimed = true;
      } else status = 'todo';
    } else if (latest.status === 'completed') {
      const roundStage = ROUND_TYPE_STAGE[round.type];
      if (candidate.stage === 'rejected') status = idx === lastCompletedIdx ? 'rejected' : 'passed';
      else if (STAGE_RANK[candidate.stage] > STAGE_RANK[roundStage]) status = 'passed';
      else status = 'review';
    } else {
      status = 'scheduled';
    }
    return { round, idx, status, interview: latest };
  });
}

function nodeStyle(status: StepStatus | 'done') {
  switch (status) {
    case 'done':
      return { cls: 'ai-gradient text-white', glyph: '✓' };
    case 'passed':
      return { cls: 'bg-emerald-500 text-white', glyph: '✓' };
    case 'review':
      return { cls: 'bg-brand-500 text-white ring-4 ring-brand-100', glyph: '●' };
    case 'scheduled':
      return { cls: 'bg-amber-400 text-white', glyph: '⏱' };
    case 'rejected':
      return { cls: 'bg-rose-500 text-white', glyph: '✕' };
    case 'current':
      return { cls: 'bg-white text-brand-600 border-2 border-brand-400', glyph: '●' };
    default:
      return { cls: 'bg-white text-ink-300 border-2 border-ink-200', glyph: '' };
  }
}

/** The one-line outcome under a round's node — score included once a round is passed,
 * so the tracker carries the result and not just the position. */
function subLabel(status: StepStatus | 'done', score: number | null) {
  switch (status) {
    case 'passed':
      return { text: score != null ? `Passed ${Math.round(score)}%` : 'Passed', cls: 'text-emerald-600' };
    case 'review':
      return { text: 'Review', cls: 'text-brand-600' };
    case 'scheduled':
      return { text: 'Scheduled', cls: 'text-amber-600' };
    case 'rejected':
      return { text: 'Not selected', cls: 'text-rose-600' };
    default:
      return null;
  }
}

function RoundTracker({
  candidate,
  steps,
  onScheduleRound,
  onOpenRound,
}: {
  candidate: Candidate;
  steps: RoundStep[];
  onScheduleRound: (idx: number) => void;
  onOpenRound: (interview: Interview) => void;
}) {
  const trail: { key: string; label: string; status: StepStatus | 'done'; step?: RoundStep }[] = [
    { key: 'applied', label: 'Applied', status: 'done' },
    ...steps.map((s) => ({ key: `r${s.idx}`, label: shortRoundName(s.round.name), status: s.status, step: s })),
    {
      key: 'offer',
      label: 'Offer',
      status: candidate.stage === 'hired' ? 'done' : candidate.stage === 'offer' ? 'current' : 'todo',
    },
    { key: 'hired', label: 'Hired', status: candidate.stage === 'hired' ? 'done' : 'todo' },
  ];

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-start min-w-max px-1">
        {trail.map((s, i) => {
          const n = nodeStyle(s.status);
          const clickable = !!s.step?.interview || s.status === 'current';
          return (
            <Fragment key={s.key}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => {
                  if (s.step?.interview) onOpenRound(s.step.interview);
                  else if (s.status === 'current' && s.step) onScheduleRound(s.step.idx);
                }}
                className={`flex flex-col items-center gap-1 w-20 shrink-0 ${clickable ? 'cursor-pointer group' : ''}`}
              >
                <div
                  className={`w-9 h-9 mb-0.5 rounded-full grid place-items-center transition-all text-[13px] ${n.cls} ${clickable ? 'group-hover:scale-110' : ''}`}
                >
                  {n.glyph}
                </div>
                <span
                  className={`text-[11px] font-medium text-center leading-tight ${s.status === 'todo' ? 'text-ink-400' : 'text-ink-700'}`}
                >
                  {s.label}
                </span>
                {(() => {
                  const sub = subLabel(s.status, s.step?.interview?.overallScore ?? null);
                  return sub ? (
                    <span className={`text-[10.5px] font-semibold leading-tight ${sub.cls}`}>{sub.text}</span>
                  ) : null;
                })()}
              </button>
              {i < trail.length - 1 && (
                <div
                  className={`h-0.5 w-6 mt-4 rounded-full shrink-0 ${
                    s.status === 'done' || s.status === 'passed' ? 'ai-gradient' : 'bg-ink-200'
                  }`}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function CandidateDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleRoundIndex, setScheduleRoundIndex] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<EmailType>('followup');
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

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

  // Signed URLs are short-lived, so this is fetched on demand (Resume tab only) and
  // refreshed rather than cached for the session.
  const { data: resumeUrl, isError: resumeUrlError } = useQuery({
    queryKey: [...queryKeys.candidate(organization?.id ?? '', id ?? ''), 'resume-url'],
    queryFn: () => candidatesApi.resumeUrl(id!),
    enabled: !!id && tab === 'resume' && !!candidate?.resumePath,
    staleTime: 10 * 60 * 1000,
    retry: false,
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

  const openCompose = (type: EmailType) => {
    setComposeType(type);
    setComposeOpen(true);
    setMenuOpen(false);
  };
  const openSchedule = (roundIndex: number) => {
    setScheduleRoundIndex(roundIndex);
    setScheduleOpen(true);
  };

  const steps = computeRoundSteps(candidate, interviews);
  const passedCount = steps.filter((s) => s.status === 'passed').length;
  const decisionStep = steps.find((s) => s.status === 'review');
  const scheduledStep = steps.find((s) => s.status === 'scheduled');
  const currentStep = steps.find((s) => s.status === 'current');

  const completedInterviews = (interviews ?? []).filter((iv) => iv.status === 'completed');
  const timelineEvents = [
    { label: 'Application received', at: candidate.createdAt, ai: false },
    ...(candidate.overallScore != null
      ? [{ label: 'Resume screened by AI', at: candidate.updatedAt, ai: true }]
      : []),
    ...completedInterviews.map((iv) => ({
      label: steps.find((s) => s.interview?.id === iv.id)?.status === 'rejected'
        ? `${iv.roundName} — not selected`
        : `${iv.roundName} completed`,
      at: iv.scheduledAt,
      ai: iv.type === 'ai_interview',
    })),
    ...(candidate.stage === 'offer' || candidate.stage === 'hired'
      ? [{ label: 'Offer extended', at: candidate.updatedAt, ai: false }]
      : []),
    ...(candidate.stage === 'hired' ? [{ label: 'Offer accepted 🎉', at: candidate.updatedAt, ai: false }] : []),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  // Plain function (not a component) so it doesn't get remounted — and lose no state
  // it doesn't have — on every render; it's called once below and returns a node.
  const renderNextAction = () => {
    if (candidate.stage === 'hired')
      return (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 grid place-items-center shrink-0">🏆</div>
          <div className="flex-1 min-w-[180px]">
            <p className="font-semibold text-[14px] text-ink-900">Candidate hired 🎉</p>
            <p className="text-[12px] text-ink-500">Offer accepted. Welcome them aboard.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => openCompose('offer')}>
            Onboarding email
          </Button>
        </div>
      );
    if (candidate.stage === 'rejected')
      return (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-rose-50 grid place-items-center shrink-0 text-rose-500">✕</div>
          <div className="flex-1 min-w-[180px]">
            <p className="font-semibold text-[14px] text-ink-900">Candidate rejected</p>
            <p className="text-[12px] text-ink-500">{candidate.rejectReason || 'Not selected to move forward.'}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => openCompose('rejected')}>
            Send notice
          </Button>
        </div>
      );
    if (decisionStep)
      return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center shrink-0 text-brand-600">◎</div>
          <div className="flex-1">
            <p className="font-semibold text-[14px] text-ink-900">Decision needed · {decisionStep.round.name}</p>
            <p className="text-[12px] text-ink-500">
              Interview completed
              {decisionStep.interview?.overallScore != null ? ` · AI score ${decisionStep.interview.overallScore}%` : ''}
              . Advance or reject.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => decisionStep.interview && navigate(`/app/interviews/${decisionStep.interview.id}`)}
            >
              Review
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
              onClick={() => stageMutation.mutate('rejected')}
            >
              Reject
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="!text-emerald-700 !border-emerald-200 hover:!bg-emerald-50"
              onClick={() => stageMutation.mutate(nextStageAfter(candidate.stage))}
            >
              Accept
            </Button>
          </div>
        </div>
      );
    if (scheduledStep)
      return (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-amber-50 grid place-items-center shrink-0 text-amber-500">🗓</div>
          <div className="flex-1 min-w-[180px]">
            <p className="font-semibold text-[14px] text-ink-900">{scheduledStep.round.name} scheduled</p>
            <p className="text-[12px] text-ink-500">
              {scheduledStep.interview && fmtDate(scheduledStep.interview.scheduledAt)}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => scheduledStep.interview && navigate(`/app/interviews/${scheduledStep.interview.id}`)}
          >
            View interview
          </Button>
        </div>
      );
    if (candidate.stage === 'offer')
      return (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl ai-gradient grid place-items-center shrink-0 text-white">✦</div>
          <div className="flex-1 min-w-[180px]">
            <p className="font-semibold text-[14px] text-ink-900">Ready for offer</p>
            <p className="text-[12px] text-ink-500">Candidate cleared all rounds. Extend an offer.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => stageMutation.mutate('hired')}>
              Mark hired
            </Button>
            <Button variant="ai" size="sm" onClick={() => openCompose('offer')}>
              Send offer
            </Button>
          </div>
        </div>
      );
    if (currentStep)
      return (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl ai-gradient grid place-items-center shrink-0 text-white">✨</div>
          <div className="flex-1 min-w-[180px]">
            <p className="font-semibold text-[14px] text-ink-900">Schedule {currentStep.round.name}</p>
            <p className="text-[12px] text-ink-500">Set up the next interview for this candidate.</p>
          </div>
          <Button variant="ai" size="sm" onClick={() => openSchedule(currentStep.idx)}>
            Schedule
          </Button>
        </div>
      );
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ink-100 grid place-items-center text-ink-400 shrink-0">✓</div>
        <p className="text-[13px] text-ink-500">All rounds complete.</p>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <nav className="text-[13px] text-ink-500 mb-4">
        <Link to="/app/candidates" className="hover:text-brand-600 font-medium">
          Candidates
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-800 font-semibold">{candidate.name}</span>
      </nav>

      {/* Header */}
      <Card className="p-5 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={candidate.name} size={64} />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-display font-extrabold text-[22px] text-ink-900">{candidate.name}</h1>
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
          </div>
          <div className="flex items-center gap-3">
            {candidate.overallScore != null && (
              <div className="text-center hidden sm:block">
                <Ring value={candidate.overallScore} size={58} stroke={5} />
                <p className="text-[10px] text-ink-400 mt-1">AI Score</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button variant="ai" onClick={() => openSchedule(currentStep?.idx ?? 0)}>
                Schedule AI Interview
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 justify-center"
                  onClick={() => openCompose('followup')}
                >
                  Email
                </Button>
                <div
                  className="relative"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setMenuOpen(false);
                  }}
                >
                  <button
                    type="button"
                    className="w-9 h-9 grid place-items-center rounded-lg border border-ink-200 bg-white hover:bg-ink-50 text-ink-500"
                    onClick={() => setMenuOpen((o) => !o)}
                  >
                    ⋮
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 z-10 mt-1 w-52 rounded-lg border border-ink-200 bg-white shadow-lg py-1">
                      <button
                        type="button"
                        className="w-full flex items-center gap-2.5 text-left px-3 py-2 text-[13px] text-ink-700 hover:bg-ink-50"
                        onClick={() => openCompose('invitation')}
                      >
                        <IconSparkle className="w-4 h-4 text-violet-500" /> Send invitation
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2.5 text-left px-3 py-2 text-[13px] text-ink-700 hover:bg-ink-50"
                        onClick={() => openCompose('offer')}
                      >
                        <IconAward className="w-4 h-4 text-ink-400" /> Send offer email
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2.5 text-left px-3 py-2 text-[13px] text-ink-700 hover:bg-ink-50"
                        onClick={() => openCompose('rejected')}
                      >
                        <IconMail className="w-4 h-4 text-ink-400" /> Send rejection
                      </button>
                      <div className="my-1 border-t border-ink-100" />
                      <button
                        type="button"
                        className="w-full flex items-center gap-2.5 text-left px-3 py-2 text-[13px] text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          setMenuOpen(false);
                          stageMutation.mutate('rejected');
                        }}
                      >
                        <IconXCircle className="w-4 h-4" /> Reject candidate
                      </button>
                      <div className="my-1 border-t border-ink-100" />
                      <div className="px-3 py-1.5">
                        <label className="block text-[11px] font-medium text-ink-400 mb-1">Move to stage</label>
                        <select
                          className="w-full h-8 px-2 rounded-md border border-ink-200 bg-white text-[12px]"
                          value={candidate.stage}
                          onChange={(e) => {
                            stageMutation.mutate(e.target.value as CandidateStage);
                            setMenuOpen(false);
                          }}
                        >
                          {[...CANDIDATE_STAGES, 'rejected' as const].map((s) => (
                            <option key={s} value={s}>
                              {CANDIDATE_STAGE_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="my-1 border-t border-ink-100" />
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-[13px] text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          setMenuOpen(false);
                          if (confirm(`Delete ${candidate.name}?`)) removeMutation.mutate();
                        }}
                      >
                        Delete candidate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Hiring progress */}
      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-ink-900 text-[15px]">Hiring progress</h2>
          <span className="text-[12px] text-ink-400">
            {passedCount} of {candidate.job?.rounds.length ?? 0} rounds passed
          </span>
        </div>
        <RoundTracker
          candidate={candidate}
          steps={steps}
          onScheduleRound={openSchedule}
          onOpenRound={(iv) => navigate(`/app/interviews/${iv.id}`)}
        />
        <div className="mt-4 pt-4 border-t border-ink-100">
          {renderNextAction()}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-ink-200 mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-3.5 py-2.5 text-sm font-medium whitespace-nowrap -mb-px transition-colors ${
              tab === t ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            {TAB_LABELS[t]}
            {tab === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full ai-gradient" />}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-5">
              <h2 className="font-display font-bold text-ink-900 text-lg mb-3">Candidate summary</h2>
              <p className="text-[14px] text-ink-600 leading-relaxed">
                {candidate.resumeSummary || 'No summary available yet.'}
              </p>
            </Card>

            <Card className="p-5">
              <h2 className="font-display font-bold text-ink-900 text-lg mb-3">Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((s) => (
                  <Badge key={s.id} tone="brand">
                    {s.name}
                  </Badge>
                ))}
                {candidate.skills.length === 0 && <p className="text-sm text-ink-400">No skills listed.</p>}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-display font-bold text-ink-900 text-lg mb-3">Notes</h2>
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
          </div>

          <div className="space-y-5">
            <Card className="p-5">
              <h2 className="font-display font-bold text-ink-900 text-lg mb-3">Details</h2>
              <dl className="space-y-3 text-[13px]">
                {[
                  ['Experience', candidate.experienceYears != null ? `${candidate.experienceYears} yrs` : '—'],
                  ['Current company', candidate.currentCompany ?? '—'],
                  ['Location', candidate.location ?? '—'],
                  ['Education', candidate.education ?? '—'],
                  ['Applied on', fmtDate(candidate.createdAt)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-3">
                    <dt className="text-ink-500 shrink-0">{k}</dt>
                    <dd className="font-semibold text-ink-800 text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            {candidate.overallScore != null && (
              <Card className="p-5">
                <h2 className="font-display font-bold text-ink-900 text-lg mb-3">AI snapshot</h2>
                <div className="flex items-center gap-4 mb-3">
                  <Ring value={candidate.overallScore} size={56} stroke={5} />
                  <div>
                    <p className="text-[13px] font-semibold text-ink-900">
                      {candidate.overallScore >= 80
                        ? 'Strong candidate'
                        : candidate.overallScore >= 65
                          ? 'Solid candidate'
                          : 'Needs review'}
                    </p>
                    <p className="text-[12px] text-ink-500">Overall AI fit score</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="w-full justify-center" onClick={() => setTab('evaluation')}>
                  View full evaluation
                </Button>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === 'timeline' && (
        <Card className="p-6 max-w-2xl">
          <h2 className="font-display font-bold text-ink-900 text-lg mb-4">Hiring timeline</h2>
          <div className="relative pl-2">
            {timelineEvents.map((ev, i) => (
              <div key={i} className="relative flex gap-4 pb-5 last:pb-0">
                {i < timelineEvents.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-ink-100" />
                )}
                <div className="w-6 h-6 rounded-full grid place-items-center shrink-0 z-10 ai-gradient text-white text-[11px]">
                  ✓
                </div>
                <div className="pt-0.5">
                  <p className="text-[13.5px] font-semibold text-ink-800 flex items-center gap-1.5">
                    {ev.label}
                    {ev.ai && <Badge tone="violet">AI</Badge>}
                  </p>
                  <p className="text-[12px] text-ink-400 mt-0.5">{fmtDate(ev.at)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'interviews' && (
        <div className="space-y-3">
          {steps.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-ink-400">This job has no interview rounds configured.</p>
            </Card>
          ) : (
            steps.map((s) => (
              <Card key={s.idx} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 grid place-items-center font-bold shrink-0">
                      {s.idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-[14px] text-ink-900">{s.round.name}</p>
                      <p className="text-[12px] text-ink-400">
                        {s.round.durationMinutes} min
                        {s.interview ? ` · ${new Date(s.interview.scheduledAt).toLocaleString()}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {s.interview?.overallScore != null && <Ring value={s.interview.overallScore} size={40} stroke={4} />}
                    <Badge
                      tone={
                        s.status === 'passed'
                          ? 'green'
                          : s.status === 'review'
                            ? 'brand'
                            : s.status === 'scheduled'
                              ? 'amber'
                              : s.status === 'rejected'
                                ? 'rose'
                                : 'slate'
                      }
                      dot
                    >
                      {s.status === 'review'
                        ? 'Awaiting decision'
                        : s.status === 'passed'
                          ? 'Passed'
                          : s.status === 'rejected'
                            ? 'Rejected'
                            : s.status === 'scheduled'
                              ? (s.interview ? INTERVIEW_STATUS_LABELS[s.interview.status] : 'Scheduled')
                              : s.status === 'current'
                                ? 'Up next'
                                : 'Not started'}
                    </Badge>
                    {s.interview && s.status === 'scheduled' && (
                      <>
                        {(s.interview.status === 'scheduled') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={sendInvitationMutation.isPending}
                            onClick={() => sendInvitationMutation.mutate(s.interview!.id)}
                          >
                            Send invitation
                          </Button>
                        )}
                        {(s.interview.status === 'scheduled' || s.interview.status === 'invitation_sent') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
                            loading={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(s.interview!.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </>
                    )}
                    {s.interview && (
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/app/interviews/${s.interview!.id}`)}>
                        Open
                      </Button>
                    )}
                    {!s.interview && s.status === 'current' && (
                      <Button size="sm" variant="ai" onClick={() => openSchedule(s.idx)}>
                        Schedule
                      </Button>
                    )}
                  </div>
                </div>
                {s.status === 'review' && (
                  <div className="mt-3 pt-3 border-t border-ink-100 flex items-center justify-between flex-wrap gap-2">
                    <p className="text-[12px] text-ink-500">This interview is complete. Make a decision to proceed.</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
                        onClick={() => stageMutation.mutate('rejected')}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="!text-emerald-700 !border-emerald-200 hover:!bg-emerald-50"
                        onClick={() => stageMutation.mutate(nextStageAfter(candidate.stage))}
                      >
                        Accept & advance
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'evaluation' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-display font-bold text-ink-900 text-lg">AI Evaluation</h2>
            <Badge tone="slate">Sample data · evaluation engine coming soon</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8">
            <div className="flex flex-col items-center gap-2 md:pr-8 md:border-r md:border-ink-100">
              <Ring value={candidate.overallScore ?? 74} size={120} stroke={9} />
              <p className="font-display font-bold text-ink-900">{STATIC_AI_EVALUATION.recommendation}</p>
              <p className="text-[12px] text-ink-400 text-center">Overall AI fit score</p>
              <Badge tone="violet">AI evaluated across 1 round</Badge>
            </div>
            <div>
              <h3 className="font-display font-bold text-ink-900 mb-1">Competency breakdown</h3>
              <p className="text-[12px] text-ink-400 mb-4">How the candidate scored across key dimensions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {STATIC_AI_EVALUATION.competencies.map((c) => (
                  <div key={c.label}>
                    <div className="flex items-center justify-between text-[13px] mb-1.5">
                      <span className="text-ink-600">{c.label}</span>
                      <span className="font-bold text-ink-900">{c.value}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${c.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'resume' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                <h2 className="font-display font-bold text-ink-900 text-lg">Resume</h2>
                {candidate.resumePath && (
                  <a
                    href={resumeUrl?.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${
                      resumeUrl ? 'text-brand-600 hover:text-brand-700' : 'text-ink-300 pointer-events-none'
                    }`}
                  >
                    📄 Open original
                  </a>
                )}
              </div>
              {candidate.resumePath ? (
                resumeUrlError ? (
                  <p className="text-sm text-rose-600 mb-4">
                    Couldn't load the resume file. It may have been removed from storage.
                  </p>
                ) : (
                  // Signed URL, so the embed has to wait for the fetch rather than
                  // pointing straight at the (private) storage key.
                  <div className="rounded-lg border border-ink-100 overflow-hidden mb-4 bg-ink-50 h-[520px]">
                    {resumeUrl ? (
                      <iframe src={resumeUrl.url} title="Resume" className="w-full h-full" />
                    ) : (
                      <div className="h-full grid place-items-center text-sm text-ink-400">Loading resume…</div>
                    )}
                  </div>
                )
              ) : (
                <p className="text-sm text-ink-400 mb-4">
                  No resume file uploaded. Resumes are stored when a candidate is added via
                  "Auto-fill from resume".
                </p>
              )}
              {candidate.resumeText ? (
                <details className="group">
                  <summary className="cursor-pointer text-[13px] font-semibold text-ink-600 hover:text-ink-800">
                    Parsed text
                  </summary>
                  <pre className="whitespace-pre-wrap text-[12.5px] text-ink-600 bg-ink-50 rounded-lg p-3 mt-2 max-h-[420px] overflow-y-auto font-sans">
                    {candidate.resumeText}
                  </pre>
                </details>
              ) : (
                <p className="text-sm text-ink-400">No parsed resume text available.</p>
              )}
            </Card>
          </div>
          <div className="space-y-5">
            <Card className="p-5">
              <h2 className="font-display font-bold text-ink-900 text-lg mb-3">Emails</h2>
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
        </div>
      )}

      {candidate.job && (
        <ScheduleInterviewModal
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          candidate={candidate}
          defaultRoundIndex={scheduleRoundIndex}
        />
      )}
      <EmailComposerModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        candidateId={id!}
        interviews={interviews}
        defaultType={composeType}
      />
    </div>
  );
}
