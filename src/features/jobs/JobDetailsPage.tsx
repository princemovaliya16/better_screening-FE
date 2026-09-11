import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { jobsApi } from '@/lib/api/jobs.api';
import { queryKeys } from '@/lib/api/queryKeys';
import type { JobStatus } from '@/lib/api/jobs.types';

const STATUS_TONE: Record<JobStatus, 'green' | 'amber' | 'slate'> = {
  open: 'green',
  draft: 'amber',
  closed: 'slate',
};

export function JobDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: queryKeys.job(organization?.id ?? '', id ?? ''),
    queryFn: () => jobsApi.get(id!),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => jobsApi.remove(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'jobs'] });
      navigate('/app/jobs');
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-ink-500">Loading…</div>;
  if (!job) return <div className="p-6 text-sm text-ink-500">Job not found.</div>;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <nav className="text-[13px] text-ink-500 mb-4">
        <Link to="/app/jobs" className="hover:text-brand-600 font-medium">
          Jobs
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-800 font-semibold">{job.title}</span>
      </nav>

      <Card className="p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-extrabold text-[22px] text-ink-900">{job.title}</h1>
              <Badge tone={STATUS_TONE[job.status]} dot>
                {job.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[13px] text-ink-500">
              <span>{job.department}</span>
              <span>{job.location ?? '—'}</span>
              <span className="capitalize">{job.employmentType.replace('_', ' ')}</span>
              <span>
                {job.positionsCount} position{job.positionsCount > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to={`/app/jobs/${job.id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <Button
              variant="secondary"
              className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
              onClick={() => {
                if (confirm(`Delete "${job.title}"? This cannot be undone.`)) {
                  removeMutation.mutate();
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5">
            <h2 className="font-bold text-ink-900 text-lg mb-3">Job description</h2>
            <p className="text-[14px] text-ink-600 leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-ink-900 text-lg mb-3">
              Required skills ({job.skills.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {job.skills.map((s) => (
                <div key={s.id} className="rounded-xl border border-ink-200 bg-white px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-[13px] text-ink-900">{s.name}</span>
                    <Badge tone={s.required ? 'brand' : 'slate'}>
                      {s.required ? 'Required' : 'Preferred'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-ink-500 capitalize">
                    <span>{s.level}</span>
                    <span>Importance: {s.importance}</span>
                  </div>
                </div>
              ))}
              {job.skills.length === 0 && (
                <p className="text-sm text-ink-400 col-span-2">No skills defined.</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-ink-900 text-lg mb-3">
              Interview process ({job.rounds.length} rounds)
            </h2>
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
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-bold text-ink-900 text-lg mb-3">Snapshot</h2>
            <dl className="space-y-3 text-[13px]">
              {[
                ['Experience', `${job.experienceMin ?? '—'}–${job.experienceMax ?? '—'} yrs`],
                ['Positions', job.positionsCount],
                ['Employment', job.employmentType.replace('_', ' ')],
                ['Posted on', new Date(job.createdAt).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="font-semibold text-ink-800 capitalize">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
