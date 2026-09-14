import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button, Card, Select, Toggle } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { EMAIL_TONE_LABELS, type EmailTone } from '@/lib/api/types';
import { organizationsApi } from '@/lib/api/organizations.api';
import { queryKeys } from '@/lib/api/queryKeys';

type ToggleKey =
  | 'aiQuestionGenEnabled'
  | 'aiResumeParseEnabled'
  | 'aiScoringEnabled'
  | 'aiSummaryEnabled'
  | 'aiEmailDraftingEnabled';

const ROWS: { key: ToggleKey; title: string; desc: string }[] = [
  {
    key: 'aiQuestionGenEnabled',
    title: 'AI question generation',
    desc: 'Auto-generate tailored interview questions for each round.',
  },
  {
    key: 'aiResumeParseEnabled',
    title: 'AI resume parsing',
    desc: 'Extract candidate details automatically from uploaded resumes.',
  },
  {
    key: 'aiScoringEnabled',
    title: 'AI interview scoring',
    desc: 'Score candidate responses and generate an overall fit score.',
  },
  {
    key: 'aiSummaryEnabled',
    title: 'AI interview summaries',
    desc: 'Produce strengths, weaknesses, and recommendations after interviews.',
  },
  {
    key: 'aiEmailDraftingEnabled',
    title: 'AI email drafting',
    desc: 'Draft invitations and candidate emails automatically.',
  },
];

const EMAIL_TONES: EmailTone[] = ['professional', 'friendly', 'concise', 'warm'];

export function AiSettingsTab() {
  const { organization } = useOrg();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: queryKeys.organizationSettings(organization?.id ?? ''),
    queryFn: organizationsApi.getMySettings,
    enabled: !!organization,
  });

  const [values, setValues] = useState<Record<ToggleKey, boolean>>({
    aiQuestionGenEnabled: true,
    aiResumeParseEnabled: true,
    aiScoringEnabled: true,
    aiSummaryEnabled: true,
    aiEmailDraftingEnabled: true,
  });
  const [emailTone, setEmailTone] = useState<EmailTone>('professional');

  useEffect(() => {
    if (settings) {
      setValues({
        aiQuestionGenEnabled: settings.aiQuestionGenEnabled,
        aiResumeParseEnabled: settings.aiResumeParseEnabled,
        aiScoringEnabled: settings.aiScoringEnabled,
        aiSummaryEnabled: settings.aiSummaryEnabled,
        aiEmailDraftingEnabled: settings.aiEmailDraftingEnabled,
      });
      setEmailTone(settings.emailTone);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () => organizationsApi.updateMySettings({ ...values, emailTone }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationSettings(organization!.id),
      }),
  });

  const set = (key: ToggleKey, v: boolean) => setValues((s) => ({ ...s, [key]: v }));

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl ai-gradient grid place-items-center text-white shrink-0">✨</div>
        <div>
          <h2 className="font-display font-bold text-ink-900 text-lg">AI settings</h2>
          <p className="text-[13px] text-ink-500">Control how HireAi's AI assists your hiring.</p>
        </div>
      </div>

      <div className="divide-y divide-ink-100">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-ink-900">{row.title}</p>
              <p className="text-[12.5px] text-ink-500 mt-0.5">{row.desc}</p>
            </div>
            <Toggle checked={values[row.key]} onChange={(v) => set(row.key, v)} />
          </div>
        ))}

        <div className="flex items-center justify-between gap-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-ink-900">Email tone</p>
            <p className="text-[12.5px] text-ink-500 mt-0.5">Default voice for AI-generated emails.</p>
          </div>
          <div className="w-40 shrink-0">
            <Select value={emailTone} onChange={(e) => setEmailTone(e.target.value as EmailTone)}>
              {EMAIL_TONES.map((t) => (
                <option key={t} value={t}>
                  {EMAIL_TONE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-brand-50/70 border border-brand-100 px-3.5 py-3 flex items-start gap-2">
        <span className="text-brand-500 shrink-0">ⓘ</span>
        <p className="text-[12.5px] text-brand-700 leading-snug">
          Changes apply immediately across the app — try toggling <b>AI resume parsing</b> off, then add a
          candidate.
        </p>
      </div>

      <div className="flex justify-end mt-5">
        <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
          ✓ Save changes
        </Button>
      </div>
    </Card>
  );
}
