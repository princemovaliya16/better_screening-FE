import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Select } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { interviewsApi } from '@/lib/api/interviews.api';
import { INTERVIEW_STATUS_LABELS, type InterviewStatus } from '@/lib/api/interviews.types';
import { queryKeys } from '@/lib/api/queryKeys';

const STATUS_TONE: Record<InterviewStatus, 'amber' | 'brand' | 'violet' | 'green' | 'slate'> = {
  scheduled: 'amber',
  invitation_sent: 'brand',
  in_progress: 'violet',
  pending_evaluation: 'violet',
  completed: 'green',
  cancelled: 'slate',
};

export function InterviewsListPage() {
  const { organization } = useOrg();
  const [status, setStatus] = useState<InterviewStatus | ''>('');

  const filters = { status: status || undefined };
  const { data: interviews, isLoading } = useQuery({
    queryKey: queryKeys.interviews(organization?.id ?? '', filters),
    queryFn: () => interviewsApi.list(filters),
    enabled: !!organization,
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-5">
        <h1 className="font-extrabold text-[26px] text-ink-900">Interviews</h1>
        <p className="text-[15px] text-ink-500 mt-1">Schedule, track, and review interviews.</p>
      </div>

      <div className="mb-4 w-44">
        <Select value={status} onChange={(e) => setStatus(e.target.value as InterviewStatus | '')}>
          <option value="">All statuses</option>
          {(Object.keys(INTERVIEW_STATUS_LABELS) as InterviewStatus[]).map((s) => (
            <option key={s} value={s}>
              {INTERVIEW_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-ink-500">Loading…</p>
        ) : !interviews || interviews.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-500">No interviews found for this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] font-semibold text-ink-400 border-b border-ink-100">
                  <th className="px-5 py-3">Candidate</th>
                  <th className="py-3">Job</th>
                  <th className="py-3">Round</th>
                  <th className="py-3">Scheduled</th>
                  <th className="py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {interviews.map((iv) => (
                  <tr key={iv.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-3 font-semibold text-ink-900">
                      {iv.candidate?.name ?? '—'}
                    </td>
                    <td className="py-3 text-ink-600">{iv.job?.title ?? '—'}</td>
                    <td className="py-3 text-ink-600">{iv.roundName}</td>
                    <td className="py-3 text-ink-600">
                      {new Date(iv.scheduledAt).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <Badge tone={STATUS_TONE[iv.status]} dot>
                        {INTERVIEW_STATUS_LABELS[iv.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/app/interviews/${iv.id}`}>
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
