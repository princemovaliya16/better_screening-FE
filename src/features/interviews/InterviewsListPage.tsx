import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Card, Input, Select } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { interviewsApi } from '@/lib/api/interviews.api';
import { INTERVIEW_STATUS_LABELS, type Interview, type InterviewStatus } from '@/lib/api/interviews.types';
import type { InterviewRoundType } from '@/lib/api/jobs.types';
import { jobsApi } from '@/lib/api/jobs.api';
import { queryKeys } from '@/lib/api/queryKeys';

const STATUS_TONE: Record<InterviewStatus, 'amber' | 'brand' | 'violet' | 'green' | 'slate'> = {
  scheduled: 'amber',
  invitation_sent: 'brand',
  in_progress: 'violet',
  pending_evaluation: 'violet',
  completed: 'green',
  cancelled: 'slate',
};

const ROUND_TYPE_LABELS: Record<InterviewRoundType, string> = {
  ai_interview: 'AI Interview',
  technical: 'Technical',
  hr: 'HR',
};

const BUCKETS = ['Upcoming', 'Pending', 'Completed', 'Cancelled', 'All'] as const;
type Bucket = (typeof BUCKETS)[number];

/** Buckets the backend's finer-grained statuses into the four tabs recruiters scan:
 * "Pending" = scheduled but not yet invited; "Upcoming" = invited/in progress/being
 * evaluated (still active); "Completed"/"Cancelled" as-is. */
function bucketOf(status: InterviewStatus): Exclude<Bucket, 'All'> {
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'scheduled') return 'Pending';
  return 'Upcoming';
}

export function InterviewsListPage() {
  const { organization } = useOrg();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Bucket>('Upcoming');
  const [search, setSearch] = useState('');
  const [jobId, setJobId] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data: interviews, isLoading } = useQuery({
    queryKey: queryKeys.interviews(organization?.id ?? '', {}),
    queryFn: () => interviewsApi.list(),
    enabled: !!organization,
  });

  const { data: jobs } = useQuery({
    queryKey: queryKeys.jobs(organization?.id ?? ''),
    queryFn: () => jobsApi.list(),
    enabled: !!organization,
  });

  const sendInvitationMutation = useMutation({
    mutationFn: (id: string) => interviewsApi.sendInvitation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'interviews'] }),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => interviewsApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'interviews'] }),
  });

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = { Upcoming: 0, Pending: 0, Completed: 0, Cancelled: 0, All: interviews?.length ?? 0 };
    for (const iv of interviews ?? []) c[bucketOf(iv.status)]++;
    return c;
  }, [interviews]);

  const filtered = useMemo(() => {
    let list = [...(interviews ?? [])].sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
    );
    if (tab !== 'All') list = list.filter((iv) => bucketOf(iv.status) === tab);
    if (jobId) list = list.filter((iv) => iv.jobId === jobId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (iv) => (iv.candidate?.name ?? '').toLowerCase().includes(q) || (iv.job?.title ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [interviews, tab, jobId, search]);

  const emptyMessage = (b: Bucket) =>
    b === 'Pending'
      ? 'Scheduled interviews awaiting invitation appear here.'
      : b === 'Upcoming'
        ? 'Interviews with a sent invitation, or in progress, appear here.'
        : `No ${b.toLowerCase()} interviews.`;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-5">
        <h1 className="font-display font-extrabold text-[26px] text-ink-900">Interviews</h1>
        <p className="text-[15px] text-ink-500 mt-1">Schedule, track, and review AI-powered interviews.</p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <div className="flex items-center gap-1 flex-wrap">
          {BUCKETS.map((b) => (
            <button
              key={b}
              onClick={() => setTab(b)}
              className={`relative px-3.5 py-2.5 text-sm font-medium whitespace-nowrap flex items-center gap-2 ${
                tab === b ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800'
              }`}
            >
              {b}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] tabular-nums ${
                  tab === b ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'
                }`}
              >
                {counts[b]}
              </span>
              {tab === b && <span className="absolute left-0 right-0 -bottom-1 h-0.5 rounded-full ai-gradient" />}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="w-56">
            <Input placeholder="Search interviews…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="w-44">
            <Select value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">All jobs</option>
              {jobs?.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-ink-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-500">{emptyMessage(tab)}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] font-semibold text-ink-400 border-b border-ink-100">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="py-3">Job</th>
                  <th className="py-3">Round</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Scheduled</th>
                  <th className="py-3">Duration</th>
                  <th className="py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {filtered.map((iv: Interview) => (
                  <tr
                    key={iv.id}
                    className="hover:bg-ink-50/60 cursor-pointer"
                    onClick={() => navigate(`/app/interviews/${iv.id}`)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={iv.candidate?.name ?? '?'} size={32} />
                        <span className="font-semibold text-ink-900">{iv.candidate?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 text-[13px] text-ink-600 max-w-[180px] truncate">{iv.job?.title ?? '—'}</td>
                    <td className="py-3 text-[13px] text-ink-700">{iv.roundName}</td>
                    <td className="py-3">
                      <Badge tone={iv.type === 'ai_interview' ? 'violet' : iv.type === 'hr' ? 'sky' : 'brand'}>
                        {ROUND_TYPE_LABELS[iv.type]}
                      </Badge>
                    </td>
                    <td className="py-3 text-[13px] text-ink-600">
                      {new Date(iv.scheduledAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 text-[13px] text-ink-600 tabular-nums">{iv.durationMinutes}m</td>
                    <td className="py-3">
                      <Badge tone={STATUS_TONE[iv.status]} dot>
                        {INTERVIEW_STATUS_LABELS[iv.status]}
                      </Badge>
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
                          onClick={() => setOpenMenuId(openMenuId === iv.id ? null : iv.id)}
                        >
                          ⋮
                        </button>
                        {openMenuId === iv.id && (
                          <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-ink-200 bg-white shadow-lg py-1">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-[13px] text-ink-700 hover:bg-ink-50"
                              onClick={() => {
                                setOpenMenuId(null);
                                navigate(`/app/interviews/${iv.id}`);
                              }}
                            >
                              View details
                            </button>
                            {iv.status === 'scheduled' && (
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-[13px] text-ink-700 hover:bg-ink-50"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  sendInvitationMutation.mutate(iv.id);
                                }}
                              >
                                Send invitation
                              </button>
                            )}
                            {(iv.status === 'scheduled' || iv.status === 'invitation_sent') && (
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-[13px] text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  cancelMutation.mutate(iv.id);
                                }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
