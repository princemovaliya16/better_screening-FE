import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Input, Select } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { jobsApi } from '@/lib/api/jobs.api';
import { queryKeys } from '@/lib/api/queryKeys';
import type { JobStatus } from '@/lib/api/jobs.types';

const STATUS_TONE: Record<JobStatus, 'green' | 'amber' | 'slate'> = {
  open: 'green',
  draft: 'amber',
  closed: 'slate',
};

export function JobsListPage() {
  const { organization } = useOrg();
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [search, setSearch] = useState('');

  const filters = { status: status || undefined, search: search || undefined };
  const { data: jobs, isLoading } = useQuery({
    queryKey: queryKeys.jobs(organization?.id ?? '', filters),
    queryFn: () => jobsApi.list(filters),
    enabled: !!organization,
  });

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

      <div className="flex flex-wrap gap-2.5 mb-4">
        <div className="w-56">
          <Input placeholder="Search jobs…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => setStatus(e.target.value as JobStatus | '')}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-ink-500">Loading…</p>
        ) : !jobs || jobs.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-500">
            No jobs match your filters. Try adjusting them, or create a new job.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] font-semibold text-ink-400 border-b border-ink-100">
                  <th className="px-5 py-3">Job title</th>
                  <th className="py-3">Department</th>
                  <th className="py-3">Location</th>
                  <th className="py-3 text-center">Rounds</th>
                  <th className="py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-3 font-semibold text-ink-900">{job.title}</td>
                    <td className="py-3 text-ink-600">{job.department}</td>
                    <td className="py-3 text-ink-600">{job.location ?? '—'}</td>
                    <td className="py-3 text-center text-ink-600">{job.rounds.length}</td>
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
        )}
      </Card>
    </div>
  );
}
