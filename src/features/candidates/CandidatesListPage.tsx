import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Input, Ring, Select } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { candidatesApi } from '@/lib/api/candidates.api';
import { CANDIDATE_STAGE_LABELS, type Candidate, type CandidateStage } from '@/lib/api/candidates.types';
import { interviewsApi } from '@/lib/api/interviews.api';
import type { Interview } from '@/lib/api/interviews.types';
import { jobsApi } from '@/lib/api/jobs.api';
import { queryKeys } from '@/lib/api/queryKeys';
import { AddCandidateModal } from './AddCandidateModal';

const STAGE_TONE: Record<CandidateStage, 'sky' | 'amber' | 'brand' | 'violet' | 'fuchsia' | 'green' | 'rose'> = {
  applied: 'sky',
  screening: 'amber',
  interview: 'brand',
  hr_review: 'violet',
  offer: 'fuchsia',
  hired: 'green',
  rejected: 'rose',
};

const EXPERIENCE_BUCKETS = [
  { value: '', label: 'Any exp' },
  { value: '0-2', label: '0–2 yrs' },
  { value: '3-5', label: '3–5 yrs' },
  { value: '6-8', label: '6–8 yrs' },
  { value: '9+', label: '9+ yrs' },
] as const;

const SORTS = [
  { value: 'recent', label: 'Recent' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'score', label: 'Highest AI score' },
  { value: 'name', label: 'Name (A–Z)' },
] as const;
type SortValue = (typeof SORTS)[number]['value'];

function matchesExperience(bucket: string, years: number | null): boolean {
  if (!bucket) return true;
  if (years == null) return false;
  if (bucket === '9+') return years >= 9;
  const [min, max] = bucket.split('-').map(Number);
  return years >= min && years <= max;
}

/** Picks the most advanced (then most recent) interview round per candidate, so the
 * list can show "latest round · status" without a dedicated backend endpoint. */
function latestInterviewByCandidate(interviews: Interview[] | undefined): Map<string, Interview> {
  const map = new Map<string, Interview>();
  for (const iv of interviews ?? []) {
    const current = map.get(iv.candidateId);
    if (
      !current ||
      iv.roundIndex > current.roundIndex ||
      (iv.roundIndex === current.roundIndex && new Date(iv.scheduledAt) > new Date(current.scheduledAt))
    ) {
      map.set(iv.candidateId, iv);
    }
  }
  return map;
}

export function CandidatesListPage() {
  const { organization } = useOrg();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [stage, setStage] = useState<CandidateStage | ''>(
    (searchParams.get('stage') as CandidateStage | null) ?? '',
  );
  const [jobId, setJobId] = useState('');
  const [experience, setExperience] = useState('');
  const [sort, setSort] = useState<SortValue>('recent');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filters = { jobId: jobId || undefined, stage: stage || undefined, search: search || undefined };
  const { data: candidates, isLoading } = useQuery({
    queryKey: queryKeys.candidates(organization?.id ?? '', filters),
    queryFn: () => candidatesApi.list(filters),
    enabled: !!organization,
  });

  const { data: jobs } = useQuery({
    queryKey: queryKeys.jobs(organization?.id ?? ''),
    queryFn: () => jobsApi.list(),
    enabled: !!organization,
  });

  const { data: interviews } = useQuery({
    queryKey: queryKeys.interviews(organization?.id ?? '', {}),
    queryFn: () => interviewsApi.list(),
    enabled: !!organization,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => candidatesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'candidates'] }),
  });

  const latestInterviews = useMemo(() => latestInterviewByCandidate(interviews), [interviews]);

  const visibleCandidates = useMemo(() => {
    const filtered = (candidates ?? []).filter((c) => matchesExperience(experience, c.experienceYears));
    const sorted = [...filtered];
    switch (sort) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'score':
        sorted.sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1));
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [candidates, experience, sort]);

  const statusFor = (c: Candidate): { label: string; tone: 'violet' | 'rose' | 'green' | 'fuchsia' } =>
    c.stage === 'rejected'
      ? { label: 'Rejected', tone: 'rose' }
      : c.stage === 'hired'
        ? { label: 'Hired', tone: 'green' }
        : c.stage === 'offer'
          ? { label: 'Offer', tone: 'fuchsia' }
          : { label: 'Active', tone: 'violet' };

  const interviewCellFor = (c: Candidate) => {
    const iv = latestInterviews.get(c.id);
    if (!iv) return null;
    const decision =
      c.stage === 'rejected'
        ? ({ label: 'rejected', tone: 'rose' } as const)
        : iv.status === 'completed'
          ? ({ label: 'completed', tone: 'green' } as const)
          : ({ label: 'scheduled', tone: 'amber' } as const);
    return { roundName: iv.roundName, decision };
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-ink-900">Candidates</h1>
          <p className="text-[15px] text-ink-500 mt-1">
            {visibleCandidates.length} candidates across your pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            title="Bulk import is coming soon"
            onClick={() => alert('Bulk import is coming soon — add candidates one at a time for now.')}
          >
            ⬆ Import
          </Button>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            + Add candidate
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 mb-4">
        <div className="w-56">
          <Input
            placeholder="Search candidates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">All jobs</option>
            {jobs?.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select value={stage} onChange={(e) => setStage(e.target.value as CandidateStage | '')}>
            <option value="">All stages</option>
            {(Object.keys(CANDIDATE_STAGE_LABELS) as CandidateStage[]).map((s) => (
              <option key={s} value={s}>
                {CANDIDATE_STAGE_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-32">
          <Select value={experience} onChange={(e) => setExperience(e.target.value)}>
            {EXPERIENCE_BUCKETS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortValue)}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-ink-500">Loading…</p>
        ) : visibleCandidates.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-500">
            No candidates found. Try adjusting filters, or add a new candidate.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] font-semibold text-ink-400 border-b border-ink-100">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="py-3">Applied job</th>
                  <th className="py-3">Experience</th>
                  <th className="py-3">Stage</th>
                  <th className="py-3">Interview</th>
                  <th className="py-3">AI Score</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Added</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {visibleCandidates.map((c) => {
                  const status = statusFor(c);
                  const iv = interviewCellFor(c);
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-ink-50/60 cursor-pointer"
                      onClick={() => navigate(`/app/candidates/${c.id}`)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={c.name} size={34} />
                          <div className="min-w-0">
                            <p className="font-semibold text-ink-900 truncate">{c.name}</p>
                            <p className="text-[12px] text-ink-400 truncate">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-ink-600">{c.job?.title ?? '—'}</td>
                      <td className="py-3 text-ink-600">
                        {c.experienceYears != null ? `${c.experienceYears} yrs` : '—'}
                      </td>
                      <td className="py-3">
                        <Badge tone={STAGE_TONE[c.stage]} dot>
                          {CANDIDATE_STAGE_LABELS[c.stage]}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {iv ? (
                          <div>
                            <p className="text-[13px] text-ink-700">{iv.roundName}</p>
                            <Badge tone={iv.decision.tone} className="mt-1 capitalize">
                              {iv.decision.label}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {c.overallScore != null ? (
                          <Ring value={c.overallScore} size={38} stroke={4} />
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="py-3 text-ink-500 text-[13px]">
                        {new Date(c.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div
                          className="relative inline-block"
                          onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenMenuId(null);
                          }}
                        >
                          <button
                            type="button"
                            className="w-8 h-8 rounded-lg grid place-items-center text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                            onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                          >
                            ⋮
                          </button>
                          {openMenuId === c.id && (
                            <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-ink-200 bg-white shadow-lg py-1">
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-[13px] text-ink-700 hover:bg-ink-50"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  navigate(`/app/candidates/${c.id}`);
                                }}
                              >
                                View profile
                              </button>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-[13px] text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  if (confirm(`Delete ${c.name}?`)) removeMutation.mutate(c.id);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddCandidateModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
