import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOrg } from '@/context/OrgContext';
import { ACTIVITY_ICON, type ActivityType } from '@/lib/api/activity.types';
import { CANDIDATE_STAGE_LABELS, CANDIDATE_STAGES, type CandidateStage } from '@/lib/api/candidates.types';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { queryKeys } from '@/lib/api/queryKeys';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { organization } = useOrg();

  const { data } = useQuery({
    queryKey: queryKeys.dashboard(organization?.id ?? ''),
    queryFn: dashboardApi.getOverview,
    enabled: !!organization,
  });

  const maxStageCount = Math.max(1, ...Object.values(data?.candidatesByStage ?? {}));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <h1 className="font-extrabold text-[26px] text-ink-900">
        Welcome back, {user?.name.split(' ')[0]} 👋
      </h1>
      <p className="text-[15px] text-ink-500 mt-1 mb-6">
        Here's what's happening across your hiring pipeline.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Card className="p-5">
          <p className="text-[13px] text-ink-500">Open jobs</p>
          <p className="font-extrabold text-[28px] text-ink-900 mt-1">
            {data ? data.jobsOpen : '—'}
            <span className="text-[14px] text-ink-400 font-medium"> / {data?.jobsTotal ?? 0}</span>
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[13px] text-ink-500">Candidates</p>
          <p className="font-extrabold text-[28px] text-ink-900 mt-1">{data?.candidatesTotal ?? '—'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[13px] text-ink-500">Interviews this week</p>
          <p className="font-extrabold text-[28px] text-ink-900 mt-1">{data?.interviewsThisWeek ?? '—'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[13px] text-ink-500">Avg AI evaluation score</p>
          <p className="font-extrabold text-[28px] text-ink-900 mt-1">
            {data?.avgEvaluationScore != null ? Math.round(data.avgEvaluationScore) : '—'}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-bold text-ink-900 text-lg mb-4">Candidate pipeline</h2>
          <div className="space-y-3">
            {[...CANDIDATE_STAGES, 'rejected' as const].map((stage: CandidateStage) => {
              const count = data?.candidatesByStage[stage] ?? 0;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-24 text-[13px] text-ink-500 shrink-0">
                    {CANDIDATE_STAGE_LABELS[stage]}
                  </span>
                  <div className="flex-1 h-6 rounded-md bg-ink-100 overflow-hidden">
                    <div
                      className="h-full ai-gradient transition-all"
                      style={{ width: `${(count / maxStageCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[13px] font-semibold text-ink-800">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-bold text-ink-900 text-lg mb-4">Recent activity</h2>
          {!data || data.recentActivity.length === 0 ? (
            <p className="text-sm text-ink-400">Nothing yet — activity will show up here as your team works.</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((a) => (
                <div key={a.id} className="flex gap-2.5 text-[13px]">
                  <span className="shrink-0">{ACTIVITY_ICON[a.type as ActivityType] ?? '•'}</span>
                  <div>
                    <p className="text-ink-700">{a.message}</p>
                    <p className="text-[11px] text-ink-400">{timeAgo(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
