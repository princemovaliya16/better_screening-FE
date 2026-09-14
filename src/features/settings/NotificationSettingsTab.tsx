import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button, Card, Toggle } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { organizationsApi } from '@/lib/api/organizations.api';
import { queryKeys } from '@/lib/api/queryKeys';

type ToggleKey =
  | 'notifyOnNewApplication'
  | 'notifyOnInterviewScheduled'
  | 'notifyOnEvaluationReady'
  | 'notifyOnRoundDecision'
  | 'weeklyDigestEnabled'
  | 'productUpdatesEnabled';

const ACTIVITY_ROWS: { key: ToggleKey; title: string; desc: string }[] = [
  { key: 'notifyOnNewApplication', title: 'New candidate added', desc: 'When a candidate applies or is added.' },
  { key: 'notifyOnInterviewScheduled', title: 'Interview scheduled', desc: 'When an interview is scheduled.' },
  { key: 'notifyOnEvaluationReady', title: 'Interview completed', desc: 'When AI results are ready.' },
  {
    key: 'notifyOnRoundDecision',
    title: 'Round decisions',
    desc: 'When a candidate is advanced or rejected.',
  },
];

const DIGEST_ROWS: { key: ToggleKey; title: string; desc: string }[] = [
  {
    key: 'weeklyDigestEnabled',
    title: 'Weekly hiring digest',
    desc: 'A summary of pipeline activity every Monday.',
  },
  { key: 'productUpdatesEnabled', title: 'Product updates', desc: 'News about new HireAi features.' },
];

export function NotificationSettingsTab() {
  const { organization } = useOrg();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: queryKeys.organizationSettings(organization?.id ?? ''),
    queryFn: organizationsApi.getMySettings,
    enabled: !!organization,
  });

  const [values, setValues] = useState<Record<ToggleKey, boolean>>({
    notifyOnNewApplication: true,
    notifyOnInterviewScheduled: true,
    notifyOnEvaluationReady: true,
    notifyOnRoundDecision: true,
    weeklyDigestEnabled: false,
    productUpdatesEnabled: false,
  });

  useEffect(() => {
    if (settings) {
      setValues({
        notifyOnNewApplication: settings.notifyOnNewApplication,
        notifyOnInterviewScheduled: settings.notifyOnInterviewScheduled,
        notifyOnEvaluationReady: settings.notifyOnEvaluationReady,
        notifyOnRoundDecision: settings.notifyOnRoundDecision,
        weeklyDigestEnabled: settings.weeklyDigestEnabled,
        productUpdatesEnabled: settings.productUpdatesEnabled,
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () => organizationsApi.updateMySettings(values),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationSettings(organization!.id),
      }),
  });

  const set = (key: ToggleKey, v: boolean) => setValues((s) => ({ ...s, [key]: v }));

  const Row = ({ row }: { row: { key: ToggleKey; title: string; desc: string } }) => (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-ink-900">{row.title}</p>
        <p className="text-[12.5px] text-ink-500 mt-0.5">{row.desc}</p>
      </div>
      <Toggle checked={values[row.key]} onChange={(v) => set(row.key, v)} />
    </div>
  );

  return (
    <Card className="p-6">
      <h2 className="font-display font-bold text-ink-900 text-lg">Notifications</h2>
      <p className="text-[13px] text-ink-500 mt-0.5 mb-1">Choose what you're notified about.</p>

      <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide mt-5 mb-1">Activity</p>
      <div className="divide-y divide-ink-100">
        {ACTIVITY_ROWS.map((row) => (
          <Row key={row.key} row={row} />
        ))}
      </div>

      <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide mt-6 mb-1">Digests</p>
      <div className="divide-y divide-ink-100">
        {DIGEST_ROWS.map((row) => (
          <Row key={row.key} row={row} />
        ))}
      </div>

      <div className="flex justify-end mt-5">
        <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
          ✓ Save changes
        </Button>
      </div>
    </Card>
  );
}
