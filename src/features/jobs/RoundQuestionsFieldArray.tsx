import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useFieldArray, type Control, type UseFormRegister } from 'react-hook-form';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { jobsApi } from '@/lib/api/jobs.api';
import type { JobFormValues } from '@/lib/validation/job.schemas';

const QUESTION_TYPES = ['technical', 'behavioral', 'situational', 'experience', 'culture'] as const;

export function RoundQuestionsFieldArray({
  control,
  register,
  roundIndex,
  jobId,
  roundId,
}: {
  control: Control<JobFormValues>;
  register: UseFormRegister<JobFormValues>;
  roundIndex: number;
  /** Both only set once the round already exists on the backend (i.e. editing a
   * saved job) — question generation needs a real round to read job/skill/round-type
   * context from. */
  jobId?: string;
  roundId?: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `rounds.${roundIndex}.questions`,
  });
  const [guidance, setGuidance] = useState('');

  const generateMutation = useMutation({
    mutationFn: () =>
      jobsApi.generateQuestions(jobId!, roundId!, {
        count: 5,
        additionalContext: guidance || undefined,
      }),
    onSuccess: (questions) => {
      questions.forEach((q) => append({ questionText: q.questionText, questionType: q.questionType }));
    },
  });

  return (
    <div className="space-y-2 mt-3">
      {jobId && roundId && (
        <div className="flex items-center gap-2 rounded-lg bg-violet-50/60 border border-violet-100 p-2.5">
          <Input
            className="!h-8 flex-1 text-[12px] !bg-white"
            placeholder="Optional guidance, e.g. focus on system design…"
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
          />
          <Button
            type="button"
            variant="ai"
            size="sm"
            loading={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
          >
            ✨ Generate with AI
          </Button>
        </div>
      )}
      {generateMutation.isError && (
        <p className="text-[12px] text-rose-500">Couldn't generate questions. Try again.</p>
      )}
      {fields.map((field, qi) => (
        <div key={field.id} className="flex items-start gap-2 rounded-lg border border-ink-200 p-2.5">
          <div className="flex-1 min-w-0 space-y-1.5">
            <Textarea
              rows={2}
              className="text-[13px]"
              placeholder="Enter question…"
              {...register(`rounds.${roundIndex}.questions.${qi}.questionText`)}
            />
            <div className="w-40">
              <Select
                className="!h-8 text-[12px]"
                {...register(`rounds.${roundIndex}.questions.${qi}.questionType`)}
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => remove(qi)}
            className="w-7 h-7 grid place-items-center rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-500 shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => append({ questionText: '', questionType: 'technical' })}
      >
        + Add question
      </Button>
    </div>
  );
}
