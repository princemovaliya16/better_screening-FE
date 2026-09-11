import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { useOrg } from '@/context/OrgContext';
import { candidatesApi } from '@/lib/api/candidates.api';
import { ApiError } from '@/lib/api/client';
import { jobsApi } from '@/lib/api/jobs.api';
import { queryKeys } from '@/lib/api/queryKeys';
import { candidateFormSchema, type CandidateFormValues } from '@/lib/validation/candidate.schemas';

export function AddCandidateModal({
  open,
  onClose,
  preselectJobId,
}: {
  open: boolean;
  onClose: () => void;
  preselectJobId?: string;
}) {
  const { organization } = useOrg();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: jobs } = useQuery({
    queryKey: queryKeys.jobs(organization?.id ?? ''),
    queryFn: () => jobsApi.list(),
    enabled: open && !!organization,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: { jobId: preselectJobId ?? '' },
  });

  const mutation = useMutation({
    mutationFn: ({ skillsText, ...values }: CandidateFormValues) =>
      candidatesApi.create({
        ...values,
        experienceYears: values.experienceYears ? Number(values.experienceYears) : undefined,
        skills: skillsText
          ? skillsText.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      }),
    onSuccess: (candidate) => {
      queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'candidates'] });
      reset();
      onClose();
      navigate(`/app/candidates/${candidate.id}`);
    },
    onError: (err) => {
      setError('root', {
        message: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
      });
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Add candidate" size="lg">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" error={errors.name?.message}>
            <Input placeholder="Candidate name" {...register('name')} />
          </Field>
          <Field label="Applied for" error={errors.jobId?.message}>
            <Select {...register('jobId')}>
              <option value="">Select a job…</option>
              {jobs?.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" placeholder="email@example.com" {...register('email')} />
          </Field>
          <Field label="Phone">
            <Input placeholder="+91 …" {...register('phone')} />
          </Field>
          <Field label="Experience (years)">
            <Input type="number" min={0} {...register('experienceYears')} />
          </Field>
          <Field label="Current company">
            <Input placeholder="e.g. Razorpay" {...register('currentCompany')} />
          </Field>
          <Field label="Location">
            <Input placeholder="City, Country" {...register('location')} />
          </Field>
          <Field label="Education">
            <Input placeholder="e.g. B.Tech, IIT Bombay" {...register('education')} />
          </Field>
        </div>
        <Field label="Skills (comma-separated)">
          <Textarea rows={2} placeholder="React, TypeScript, Node.js" {...register('skillsText')} />
        </Field>
        {errors.root && <p className="text-sm text-rose-500">{errors.root.message}</p>}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="ai" loading={isSubmitting || mutation.isPending}>
            Add candidate
          </Button>
        </div>
      </form>
    </Modal>
  );
}
