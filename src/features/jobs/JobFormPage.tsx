import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { ApiError } from '@/lib/api/client';
import type { JobInput } from '@/lib/api/jobs.types';
import { jobsApi } from '@/lib/api/jobs.api';
import { queryKeys } from '@/lib/api/queryKeys';
import { DEPARTMENTS, jobFormSchema, type JobFormValues } from '@/lib/validation/job.schemas';
import { RoundQuestionsFieldArray } from './RoundQuestionsFieldArray';

const DEFAULT_VALUES: JobFormValues = {
  title: '',
  department: DEPARTMENTS[0],
  location: '',
  employmentType: 'full_time',
  positionsCount: '1',
  status: 'draft',
  description: '',
  skills: [],
  rounds: [
    { name: 'AI Screening Interview', type: 'ai_interview', durationMinutes: '30', questions: [] },
    { name: 'Technical Interview', type: 'technical', durationMinutes: '45', questions: [] },
    { name: 'HR / Culture Interview', type: 'hr', durationMinutes: '30', questions: [] },
  ],
};

function toJobInput(values: JobFormValues): JobInput {
  return {
    ...values,
    location: values.location || undefined,
    experienceMin: values.experienceMin ? Number(values.experienceMin) : undefined,
    experienceMax: values.experienceMax ? Number(values.experienceMax) : undefined,
    positionsCount: Number(values.positionsCount),
    rounds: values.rounds.map((r) => ({ ...r, durationMinutes: Number(r.durationMinutes) })),
  };
}

export function JobFormPage() {
  const { id: editId } = useParams<{ id: string }>();
  const isEditing = !!editId;
  const { organization } = useOrg();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existingJob } = useQuery({
    queryKey: queryKeys.job(organization?.id ?? '', editId ?? ''),
    queryFn: () => jobsApi.get(editId!),
    enabled: isEditing,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<JobFormValues>({ resolver: zodResolver(jobFormSchema), defaultValues: DEFAULT_VALUES });

  useEffect(() => {
    if (existingJob) {
      reset({
        title: existingJob.title,
        department: existingJob.department,
        location: existingJob.location ?? '',
        employmentType: existingJob.employmentType,
        experienceMin: existingJob.experienceMin != null ? String(existingJob.experienceMin) : '',
        experienceMax: existingJob.experienceMax != null ? String(existingJob.experienceMax) : '',
        positionsCount: String(existingJob.positionsCount),
        status: existingJob.status,
        description: existingJob.description,
        skills: existingJob.skills.map((s) => ({
          name: s.name,
          level: s.level,
          required: s.required,
          importance: s.importance,
        })),
        rounds: existingJob.rounds.map((r) => ({
          name: r.name,
          type: r.type,
          durationMinutes: String(r.durationMinutes),
          questions: r.questions.map((q) => ({
            questionText: q.questionText,
            questionType: q.questionType,
          })),
        })),
      });
    }
  }, [existingJob, reset]);

  const skillsArray = useFieldArray({ control, name: 'skills' });
  const roundsArray = useFieldArray({ control, name: 'rounds' });

  const mutation = useMutation({
    mutationFn: (values: JobFormValues) => {
      const input = toJobInput(values);
      return isEditing ? jobsApi.update(editId!, input) : jobsApi.create(input);
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'jobs'] });
      navigate(`/app/jobs/${job.id}`);
    },
    onError: (err) => {
      setError('root', {
        message: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
      });
    },
  });

  return (
    <div className="p-6 max-w-[900px] mx-auto pb-24">
      <h1 className="font-extrabold text-[24px] text-ink-900">
        {isEditing ? 'Edit job' : 'Create a new job'}
      </h1>
      <p className="text-[15px] text-ink-500 mt-1 mb-6">
        Set up the role, required skills, and interview rounds.
      </p>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5">
        <Card className="p-6">
          <h2 className="font-bold text-ink-900 text-lg mb-4">Job information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Job title" error={errors.title?.message}>
              <Input placeholder="e.g. Senior Frontend Developer" {...register('title')} />
            </Field>
            <Field label="Department" error={errors.department?.message}>
              <Select {...register('department')}>
                {DEPARTMENTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
            </Field>
            <Field label="Location">
              <Input placeholder="e.g. Bengaluru, IN or Remote" {...register('location')} />
            </Field>
            <Field label="Employment type">
              <Select {...register('employmentType')}>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </Select>
            </Field>
            <Field label="Min experience (years)">
              <Input type="number" min={0} {...register('experienceMin')} />
            </Field>
            <Field label="Max experience (years)">
              <Input type="number" min={0} {...register('experienceMax')} />
            </Field>
            <Field label="Positions" error={errors.positionsCount?.message}>
              <Input type="number" min={1} {...register('positionsCount')} />
            </Field>
            <Field label="Status">
              <Select {...register('status')}>
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </Select>
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Job description" error={errors.description?.message}>
              <Textarea
                rows={6}
                placeholder="Describe the role, responsibilities, and what a great candidate looks like…"
                {...register('description')}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink-900 text-lg">Required skills</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                skillsArray.append({
                  name: '',
                  level: 'intermediate',
                  required: true,
                  importance: 'high',
                })
              }
            >
              + Add skill
            </Button>
          </div>
          {skillsArray.fields.length === 0 && (
            <p className="text-sm text-ink-400 text-center py-6 border border-dashed border-ink-200 rounded-xl">
              No skills added yet.
            </p>
          )}
          <div className="space-y-2">
            {skillsArray.fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2 rounded-lg border border-ink-200 p-2.5">
                <Input
                  className="flex-1"
                  placeholder="Skill name"
                  {...register(`skills.${i}.name`)}
                />
                <div className="w-32">
                  <Select className="!h-9 text-[13px]" {...register(`skills.${i}.level`)}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </Select>
                </div>
                <div className="w-28">
                  <Select className="!h-9 text-[13px]" {...register(`skills.${i}.importance`)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => skillsArray.remove(i)}
                  className="w-9 h-9 grid place-items-center rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-500 shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink-900 text-lg">Interview rounds</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                roundsArray.append({
                  name: 'New round',
                  type: 'technical',
                  durationMinutes: '30',
                  questions: [],
                })
              }
            >
              + Add round
            </Button>
          </div>
          {errors.rounds?.message && <p className="text-sm text-rose-500 mb-2">{errors.rounds.message}</p>}
          <div className="space-y-3">
            {roundsArray.fields.map((field, i) => (
              <div key={field.id} className="rounded-xl border border-ink-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-semibold text-ink-500">Round {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => roundsArray.remove(i)}
                    className="w-7 h-7 grid place-items-center rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-500"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Round name">
                    <Input {...register(`rounds.${i}.name`)} />
                  </Field>
                  <Field label="Type">
                    <Select {...register(`rounds.${i}.type`)}>
                      <option value="ai_interview">AI Interview</option>
                      <option value="technical">Technical</option>
                      <option value="hr">HR</option>
                    </Select>
                  </Field>
                  <Field label="Duration (min)">
                    <Input type="number" min={5} {...register(`rounds.${i}.durationMinutes`)} />
                  </Field>
                </div>
                <RoundQuestionsFieldArray
                  control={control}
                  register={register}
                  roundIndex={i}
                  jobId={editId}
                  roundId={existingJob?.rounds[i]?.id}
                />
              </div>
            ))}
          </div>
        </Card>

        {errors.root && <p className="text-sm text-rose-500">{errors.root.message}</p>}

        <div className="flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" variant="ai" loading={isSubmitting || mutation.isPending}>
            {isEditing ? 'Save changes' : 'Create job'}
          </Button>
        </div>
      </form>
    </div>
  );
}
