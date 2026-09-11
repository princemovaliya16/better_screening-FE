import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { ApiError } from '@/lib/api/client';
import { emailComposerApi } from '@/lib/api/email-composer.api';
import { EMAIL_TYPE_LABELS, type EmailType } from '@/lib/api/email-composer.types';
import type { Interview } from '@/lib/api/interviews.types';
import { queryKeys } from '@/lib/api/queryKeys';

const EMAIL_TYPES: EmailType[] = ['invitation', 'reminder', 'passed', 'rejected', 'offer', 'followup'];

export function EmailComposerModal({
  open,
  onClose,
  candidateId,
  interviews,
}: {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  interviews?: Interview[];
}) {
  const { organization } = useOrg();
  const queryClient = useQueryClient();

  const [type, setType] = useState<EmailType>('followup');
  const [interviewId, setInterviewId] = useState('');
  const [guidance, setGuidance] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [drafted, setDrafted] = useState(false);

  const reset = () => {
    setType('followup');
    setInterviewId('');
    setGuidance('');
    setSubject('');
    setBody('');
    setDrafted(false);
  };

  const composeMutation = useMutation({
    mutationFn: () =>
      emailComposerApi.compose(candidateId, {
        type,
        interviewId: interviewId || undefined,
        additionalContext: guidance || undefined,
      }),
    onSuccess: (draft) => {
      setSubject(draft.subject);
      setBody(draft.body);
      setDrafted(true);
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => emailComposerApi.send(candidateId, { type, subject, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.candidateEmails(organization?.id ?? '', candidateId) });
      reset();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Compose email"
      subtitle="Drafted with AI — review and edit before sending."
      size="lg"
    >
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email type">
            <Select value={type} onChange={(e) => setType(e.target.value as EmailType)}>
              {EMAIL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EMAIL_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          {interviews && interviews.length > 0 && (
            <Field label="Related interview (optional)">
              <Select value={interviewId} onChange={(e) => setInterviewId(e.target.value)}>
                <option value="">None</option>
                {interviews.map((iv) => (
                  <option key={iv.id} value={iv.id}>
                    {iv.roundName}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        <Field label="Guidance for the AI (optional)">
          <Input
            placeholder="e.g. mention we loved her portfolio"
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
          />
        </Field>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ai"
            size="sm"
            loading={composeMutation.isPending}
            onClick={() => composeMutation.mutate()}
          >
            {drafted ? '✨ Regenerate draft' : '✨ Compose with AI'}
          </Button>
        </div>
        {composeMutation.isError && (
          <p className="text-[13px] text-rose-500">Couldn't generate a draft. Try again.</p>
        )}

        {drafted && (
          <div className="space-y-3 pt-2 border-t border-ink-100">
            <Field label="Subject">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label="Body">
              <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
          </div>
        )}

        {sendMutation.isError && (
          <p className="text-[13px] text-rose-500">
            {sendMutation.error instanceof ApiError
              ? sendMutation.error.message
              : "Couldn't send the email. Try again."}
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!drafted || !subject.trim() || !body.trim()}
            loading={sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
          >
            Send email
          </Button>
        </div>
      </div>
    </Modal>
  );
}
