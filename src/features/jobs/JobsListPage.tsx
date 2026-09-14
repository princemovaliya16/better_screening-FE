import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  IconGrid,
  IconList,
  IconSearch,
  Input,
  Select,
} from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { jobsApi } from '@/lib/api/jobs.api';
import { queryKeys } from '@/lib/api/queryKeys';
import type { JobListItem, JobStatus } from '@/lib/api/jobs.types';
import { JobCard } from './JobCard';

const STATUS_TONE: Record<JobStatus, 'green' | 'amber' | 'slate'> = {
  open: 'green',
  draft: 'amber',
  closed: 'slate',
};

type StatusTab = 'all' | JobStatus;
type PostedWithin = 'any' | '7' | '30' | '90';
type SortBy = 'newest' | 'oldest' | 'title';

const TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'draft', label: 'Draft' },
  { key: 'closed', label: 'Closed' },
];

export function JobsListPage() {
  const { organization } = useOrg();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [postedWithin, setPostedWithin] = useState<PostedWithin>('any');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // Tabs/search/department/sort all operate on the same full list client-side, so
  // switching tabs is instant and every tab's count is always visible together —
  // matches the reference UI, and jobs lists are small enough this stays cheap.
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.jobs(organization?.id ?? '', {}),
    queryFn: () => jobsApi.list({}),
    enabled: !!organization,
  });
  const jobs = useMemo(() => data ?? [], [data]);

  const removeMutation = useMutation({
    mutationFn: (id: string) => jobsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'jobs'] });
    },
  });

  const departments = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.department))).sort(),
    [jobs],
  );

  const counts = useMemo(
    () => ({
      all: jobs.length,
      open: jobs.filter((j) => j.status === 'open').length,
      draft: jobs.filter((j) => j.status === 'draft').length,
      closed: jobs.filter((j) => j.status === 'closed').length,
    }),
    [jobs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoffDays = postedWithin === 'any' ? null : Number(postedWithin);
    const now = Date.now();

    let list = jobs.filter((job) => {
      if (tab !== 'all' && job.status !== tab) return false;
      if (department && job.department !== department) return false;
      if (q && !job.title.toLowerCase().includes(q) && !job.department.toLowerCase().includes(q)) {
        return false;
      }
      if (cutoffDays !== null) {
        const ageDays = (now - new Date(job.createdAt).getTime()) / 86_400_000;
        if (ageDays > cutoffDays) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortBy === 'oldest' ? -diff : diff;
    });

    return list;
  }, [jobs, tab, department, search, postedWithin, sortBy]);

  const handleDelete = (job: JobListItem) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    removeMutation.mutate(job.id);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="font-extrabold text-[26px] text-ink-900">Jobs</h1>
          <p className="text-[15px] text-ink-500 mt-1">Create and manage your open positions.</p>
        </div>
        <Link to="/app/jobs/new">
          <Button variant="ai">+ Create job</Button>
        </Link>
      </div>

      <div className="flex items-center gap-5 border-b border-ink-100 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex items-center gap-1.5 pb-2.5 pt-1 text-[14px] font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors',
              tab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-500 hover:text-ink-800',
            )}
          >
            {t.label}
            <span
              className={clsx(
                'text-[12px] font-bold rounded-full px-1.5 py-0.5',
                tab === t.key ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-500',
              )}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <div className="relative w-56">
          <IconSearch className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search jobs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-40">
          <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select value={postedWithin} onChange={(e) => setPostedWithin(e.target.value as PostedWithin)}>
            <option value="any">Any time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
        </div>
        <div className="w-44">
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-1 bg-ink-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setView('grid')}
            aria-label="Grid view"
            className={clsx(
              'w-8 h-8 grid place-items-center rounded-md transition-colors',
              view === 'grid' ? 'bg-white shadow-sm text-ink-800' : 'text-ink-400 hover:text-ink-600',
            )}
          >
            <IconGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            aria-label="List view"
            className={clsx(
              'w-8 h-8 grid place-items-center rounded-md transition-colors',
              view === 'list' ? 'bg-white shadow-sm text-ink-800' : 'text-ink-400 hover:text-ink-600',
            )}
          >
            <IconList className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-6">
          <p className="text-sm text-ink-500">Loading…</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-ink-500">
            No jobs match your filters. Try adjusting them, or create a new job.
          </p>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] font-semibold text-ink-400 border-b border-ink-100">
                  <th className="px-5 py-3">Job title</th>
                  <th className="py-3">Department</th>
                  <th className="py-3">Location</th>
                  <th className="py-3 text-center">Rounds</th>
                  <th className="py-3">Applicants</th>
                  <th className="py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {filtered.map((job) => (
                  <tr key={job.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-3 font-semibold text-ink-900">{job.title}</td>
                    <td className="py-3 text-ink-600">{job.department}</td>
                    <td className="py-3 text-ink-600">{job.location ?? '—'}</td>
                    <td className="py-3 text-center text-ink-600">{job.rounds.length}</td>
                    <td className="py-3 text-ink-600">{job.applicantsCount}</td>
                    <td className="py-3">
                      <Badge tone={STATUS_TONE[job.status]} dot>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/app/jobs/${job.id}`}>
                        <Button variant="secondary" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
