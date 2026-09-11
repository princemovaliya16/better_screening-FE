import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { organizationsApi } from '@/lib/api/organizations.api';
import { queryKeys } from '@/lib/api/queryKeys';

export function NotificationSettingsTab() {
  const { organization } = useOrg();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: queryKeys.organizationSettings(organization?.id ?? ''),
    queryFn: organizationsApi.getMySettings,
    enabled: !!organization,
  });

  const [evaluationReady, setEvaluationReady] = useState(true);
  const [newApplication, setNewApplication] = useState(true);

  useEffect(() => {
    if (settings) {
      setEvaluationReady(settings.notifyOnEvaluationReady);
      setNewApplication(settings.notifyOnNewApplication);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () =>
      organizationsApi.updateMySettings({
        notifyOnEvaluationReady: evaluationReady,
        notifyOnNewApplication: newApplication,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationSettings(organization!.id),
      }),
  });

  return (
    <Card className="p-5">
      <h2 className="font-bold text-ink-900 text-lg mb-3">Notifications</h2>
      <div className="space-y-3 max-w-md">
        <label className="flex items-center gap-2 text-[14px] text-ink-700">
          <input
            type="checkbox"
            checked={evaluationReady}
            onChange={(e) => setEvaluationReady(e.target.checked)}
            className="w-4 h-4 accent-brand-600"
          />
          Notify me when an AI evaluation is ready
        </label>
        <label className="flex items-center gap-2 text-[14px] text-ink-700">
          <input
            type="checkbox"
            checked={newApplication}
            onChange={(e) => setNewApplication(e.target.checked)}
            className="w-4 h-4 accent-brand-600"
          />
          Notify me on new applications
        </label>
        <div className="flex justify-end">
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}
