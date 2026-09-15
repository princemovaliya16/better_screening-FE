import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Card,
  IconBriefcase,
  IconClock,
  IconDotsVertical,
  IconMapPin,
  IconLayers,
  IconPeople,
  Ring,
} from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { AddCandidateModal } from '@/features/candidates/AddCandidateModal';
import { candidatesApi } from '@/lib/api/candidates.api';
import {
  CANDIDATE_STAGES,
  CANDIDATE_STAGE_LABELS,
  type Candidate,
  type CandidateStage,
} from '@/lib/api/candidates.types';
import type { Job, JobStatus, SkillImportance } from '@/lib/api/jobs.types';
import { jobsApi } from '@/lib/api/jobs.api';
import { queryKeys } from '@/lib/api/queryKeys';
import { paletteFor } from '@/lib/avatar';

const STATUS_TONE: Record<JobStatus, 'green' | 'amber' | 'slate'> = {
  open: 'green',
  draft: 'amber',
  closed: 'slate',
};

/** High-importance skills should read as "must have" at a glance, so importance is
 * colour-coded rather than plain grey text. */
const IMPORTANCE_CLS: Record<SkillImportance, string> = {
  high: 'bg-rose-50 text-rose-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-ink-100 text-ink-500',
};
const IMPORTANCE_DOT: Record<SkillImportance, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-ink-400',
};

const EMPLOYMENT_LABEL: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};

const STAGE_TONE: Record<CandidateStage, 'sky' | 'amber' | 'brand' | 'violet' | 'fuchsia' | 'green' | 'rose'> = {
  applied: 'sky',
  screening: 'amber',
  interview: 'brand',
  hr_review: 'violet',
  offer: 'fuchsia',
  hired: 'green',
  rejected: 'rose',
};

/** Reads naturally whichever end of the range was filled in — an open-ended minimum
 * ("5+ yrs") is as common on a job as a full range. */
function formatExperience(job: Job): string | null {
  const { experienceMin: min, experienceMax: max } = job;
  if (min != null && max != null) return `${min}–${max} yrs`;
  if (min != null) return `${min}+ yrs`;
  if (max != null) return `Up to ${max} yrs`;
  return null;
}

const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

function formatSalary(job: Job): string {
  if (job.salaryMin == null && job.salaryMax == null) return '—';
  const symbol = CURRENCY_SYMBOLS[job.salaryCurrency] ?? `${job.salaryCurrency} `;
  if (job.salaryCurrency === 'INR') {
    const toLPA = (v: number) => {
      const lpa = v / 100000;
      return Number.isInteger(lpa) ? String(lpa) : lpa.toFixed(1);
    };
    if (job.salaryMin != null && job.salaryMax != null) {
      return `${symbol}${toLPA(job.salaryMin)}–${toLPA(job.salaryMax)} LPA`;
    }
    return `${symbol}${toLPA(job.salaryMin ?? job.salaryMax!)} LPA`;
  }
  const fmt = (v: number) => v.toLocaleString();
  if (job.salaryMin != null && job.salaryMax != null) {
    return `${symbol}${fmt(job.salaryMin)}–${fmt(job.salaryMax)}`;
  }
  return `${symbol}${fmt(job.salaryMin ?? job.salaryMax!)}`;
}

const TABS = ['overview', 'applicants'] as const;
type Tab = (typeof TABS)[number];

export function JobDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: queryKeys.job(organization?.id ?? '', id ?? ''),
    queryFn: () => jobsApi.get(id!),
    enabled: !!id,
  });

  const { data: candidates } = useQuery({
    queryKey: queryKeys.candidates(organization?.id ?? '', { jobId: id }),
    queryFn: () => candidatesApi.list({ jobId: id }),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => jobsApi.remove(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'jobs'] });
      navigate('/app/jobs');
    },
  });

  const postMutation = useMutation({
    mutationFn: () => jobsApi.update(id!, { status: 'open' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'jobs'] });
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-ink-500">Loading…</div>;
  if (!job) return <div className="p-6 text-sm text-ink-500">Job not found.</div>;

  const iconTone = paletteFor(job.department);
  const applicants = candidates ?? [];

  const stageCounts = Object.fromEntries(CANDIDATE_STAGES.map((s) => [s, 0])) as Record<
    CandidateStage,
    number
  >;
  for (const c of applicants) {
    if (c.stage !== 'rejected') stageCounts[c.stage] += 1;
  }

  const topCandidates = applicants
    .filter((c): c is Candidate & { overallScore: number } => c.overallScore != null)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 3);

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      <nav className="text-[13px] text-ink-500 mb-4">
        <Link to="/app/jobs" className="hover:text-brand-600 font-medium">
          Jobs
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-800 font-semibold">{job.title}</span>
      </nav>

      {/* Header */}
      <Card className="p-5 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl grid place-items-center text-white shrink-0 ${iconTone.bg}`}
            >
              <IconBriefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-display font-extrabold text-[22px] text-ink-900">{job.title}</h1>
                <Badge tone={STATUS_TONE[job.status]} dot>
                  {job.status === 'open' ? 'Open' : job.status === 'draft' ? 'Draft' : 'Closed'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[13px] text-ink-500">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${iconTone.tint}`}
                >
                  {job.department}
                </span>
                <span className="inline-flex items-center gap-1">
                  <IconMapPin className="w-3.5 h-3.5 text-ink-400" />
                  {job.location ?? 'Remote'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <IconClock className="w-3.5 h-3.5 text-ink-400" />
                  {EMPLOYMENT_LABEL[job.employmentType] ?? job.employmentType}
                </span>
                <span className="inline-flex items-center gap-1">
                  <IconLayers className="w-3.5 h-3.5 text-ink-400" />
                  {formatExperience(job) ?? 'Experience not specified'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <IconPeople className="w-3.5 h-3.5 text-ink-400" />
                  {job.positionsCount} position{job.positionsCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {job.status === 'draft' && (
              <Button
                loading={postMutation.isPending}
                onClick={() => {
                  if (!confirm(`Post "${job.title}"? It will move from draft to open.`)) return;
                  postMutation.mutate();
                }}
              >
                Post job
              </Button>
            )}
            <Link to={`/app/jobs/${job.id}/edit`}>
              <Button variant="secondary">
                <span className="mr-1">✎</span> Edit
              </Button>
            </Link>
            <Button variant="ai" onClick={() => setAddOpen(true)}>
              + Add candidate
            </Button>
            <div
              className="relative"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setMenuOpen(false);
              }}
            >
              <button
                type="button"
                className="w-10 h-10 grid place-items-center rounded-lg border border-ink-200 bg-white hover:bg-ink-50 text-ink-500"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <IconDotsVertical className="w-4.5 h-4.5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-ink-200 bg-white shadow-lg py-1">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-[13px] text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      setMenuOpen(false);
                      if (confirm(`Delete "${job.title}"? This cannot be undone.`)) {
                        removeMutation.mutate();
                      }
                    }}
                  >
                    Delete job
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Pipeline stats */}
      <Card className="p-5 mb-5">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
          {CANDIDATE_STAGES.map((s) => (
            <div key={s}>
              <p className="font-display font-extrabold text-[22px] text-ink-900 tabular-nums">
                {stageCounts[s]}
              </p>
              <p className="text-[12px] text-ink-400 mt-0.5">{CANDIDATE_STAGE_LABELS[s]}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-ink-200 mb-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-3.5 py-2.5 text-sm font-medium whitespace-nowrap -mb-px transition-colors capitalize ${
              tab === t ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            {t}
            {t === 'applicants' && (
              <span className="ml-1.5 text-[11px] font-semibold text-ink-400">{applicants.length}</span>
            )}
            {tab === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full ai-gradient" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {tab === 'overview' ? (
            <>
              <Card className="p-5">
                <h2 className="font-display font-bold text-ink-900 text-lg mb-3">Job description</h2>
                <p className="text-[14px] text-ink-600 leading-relaxed whitespace-pre-line">
                  {job.description || 'No description provided.'}
                </p>
              </Card>

              <Card className="p-5">
                <h2 className="font-display font-bold text-ink-900 text-lg">Required skills</h2>
                <p className="text-[12.5px] text-ink-400 mb-3.5">{job.skills.length} skills defined</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {job.skills.map((s) => (
                    <div key={s.id} className="rounded-xl border border-ink-200 bg-white px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-[13px] text-ink-900">{s.name}</span>
                        <Badge tone={s.required ? 'brand' : 'slate'}>
                          {s.required ? 'Required' : 'Preferred'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-ink-500">
                        <span className="capitalize">{s.level}</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${
                            IMPORTANCE_CLS[s.importance]
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${IMPORTANCE_DOT[s.importance]}`} />
                          {s.importance} importance
                        </span>
                      </div>
                    </div>
                  ))}
                  {job.skills.length === 0 && (
                    <p className="text-sm text-ink-400 col-span-2">No skills defined.</p>
                  )}
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="font-display font-bold text-ink-900 text-lg">Interview process</h2>
                <p className="text-[12.5px] text-ink-400 mb-3.5">{job.rounds.length} rounds configured</p>
                <div className="space-y-2.5">
                  {job.rounds.map((r, i) => (
                    <div key={r.id} className="rounded-xl border border-ink-200 bg-white p-3.5">
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="w-7 h-7 rounded-lg bg-brand-50 text-brand-700 grid place-items-center font-bold text-[13px] shrink-0">
                          {i + 1}
                        </span>
                        <p className="font-semibold text-[14px] text-ink-900">{r.name}</p>
                        <Badge tone="slate">{r.type.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-[12px] text-ink-400 ml-9.5">
                        {r.durationMinutes} min · {r.questions.length} question
                        {r.questions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ))}
                  {job.rounds.length === 0 && (
                    <p className="text-sm text-ink-400">No interview rounds configured.</p>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card className="overflow-hidden">
              {applicants.length === 0 ? (
                <p className="p-10 text-center text-sm text-ink-500">No applicants yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[12px] font-semibold text-ink-400 border-b border-ink-100">
                        <th className="px-5 py-3">Candidate</th>
                        <th className="py-3">Stage</th>
                        <th className="py-3">AI Score</th>
                        <th className="py-3">Applied</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-50">
                      {applicants.map((c) => (
                        <tr
                          key={c.id}
                          className="hover:bg-ink-50/60 cursor-pointer"
                          onClick={() => navigate(`/app/candidates/${c.id}`)}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={c.name} size={32} />
                              <div className="min-w-0">
                                <p className="font-semibold text-ink-900 truncate">{c.name}</p>
                                <p className="text-[12px] text-ink-400 truncate">{c.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge tone={STAGE_TONE[c.stage]} dot>
                              {CANDIDATE_STAGE_LABELS[c.stage]}
                            </Badge>
                          </td>
                          <td className="py-3">
                            {c.overallScore != null ? (
                              <Ring value={c.overallScore} size={36} stroke={4} />
                            ) : (
                              <span className="text-ink-300">—</span>
                            )}
                          </td>
                          <td className="py-3 text-[13px] text-ink-500">
                            {new Date(c.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-display font-bold text-ink-900 text-lg mb-3">Snapshot</h2>
            <dl className="space-y-3 text-[13px]">
              {[
                ['Salary range', formatSalary(job)],
                ['Experience', formatExperience(job) ?? '—'],
                ['Positions', job.positionsCount],
                ['Employment', EMPLOYMENT_LABEL[job.employmentType] ?? job.employmentType],
                ['Posted on', new Date(job.createdAt).toLocaleDateString()],
                ['Created by', job.createdBy?.name ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="font-semibold text-ink-800 text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="font-display font-bold text-ink-900 text-lg mb-3">Top candidates</h2>
            {topCandidates.length === 0 ? (
              <p className="text-sm text-ink-400">No scored candidates yet.</p>
            ) : (
              <div className="space-y-3">
                {topCandidates.map((c) => (
                  <Link
                    key={c.id}
                    to={`/app/candidates/${c.id}`}
                    className="flex items-center gap-3 hover:bg-ink-50 -mx-2 px-2 py-1.5 rounded-lg"
                  >
                    <Avatar name={c.name} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[13.5px] text-ink-900 truncate">{c.name}</p>
                      <p className="text-[12px] text-ink-400">{CANDIDATE_STAGE_LABELS[c.stage]}</p>
                    </div>
                    <Ring value={c.overallScore} size={36} stroke={4} />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <AddCandidateModal open={addOpen} onClose={() => setAddOpen(false)} preselectJobId={job.id} />
    </div>
  );
}
