import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button, Card, Field, Input } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { organizationsApi } from '@/lib/api/organizations.api';
import { queryKeys } from '@/lib/api/queryKeys';

export function CompanySettingsTab() {
  const { organization } = useOrg();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: queryKeys.organizationSettings(organization?.id ?? ''),
    queryFn: organizationsApi.getMySettings,
    enabled: !!organization,
  });

  const [name, setName] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [duration, setDuration] = useState('30');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST)');

  useEffect(() => {
    if (organization) setName(organization.name);
  }, [organization]);
  useEffect(() => {
    if (settings) {
      setAiEnabled(settings.aiInterviewEnabled);
      setDuration(String(settings.defaultRoundDurationMinutes));
      setTimezone(settings.defaultTimezone);
    }
  }, [settings]);

  const nameMutation = useMutation({
    mutationFn: () => organizationsApi.updateMine({ name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.organization(organization!.id) }),
  });

  const settingsMutation = useMutation({
    mutationFn: () =>
      organizationsApi.updateMySettings({
        aiInterviewEnabled: aiEnabled,
        defaultRoundDurationMinutes: Number(duration),
        defaultTimezone: timezone,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationSettings(organization!.id),
      }),
  });

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="font-bold text-ink-900 text-lg mb-3">Company profile</h2>
        <div className="flex items-end gap-3 max-w-md">
          <div className="flex-1">
            <Field label="Organization name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <Button loading={nameMutation.isPending} onClick={() => nameMutation.mutate()}>
            Save
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold text-ink-900 text-lg mb-3">AI &amp; interview defaults</h2>
        <div className="space-y-3 max-w-md">
          <label className="flex items-center gap-2 text-[14px] text-ink-700">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="w-4 h-4 accent-brand-600"
            />
            Enable AI-conducted interview rounds
          </label>
          <Field label="Default round duration (minutes)">
            <Input type="number" min={5} max={180} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </Field>
          <Field label="Default timezone">
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </Field>
          <div className="flex justify-end">
            <Button loading={settingsMutation.isPending} onClick={() => settingsMutation.mutate()}>
              Save
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
