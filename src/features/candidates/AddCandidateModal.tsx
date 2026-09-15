import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: { jobId: preselectJobId ?? '' },
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  // Where the parsed file landed in storage — handed back on create so the record
  // keeps its resume. Null when no resume was parsed (manual entry).
  const [parsedResume, setParsedResume] = useState<{ resumePath?: string; resumeText?: string } | null>(null);

  const parseResumeMutation = useMutation({
    mutationFn: (file: File) => candidatesApi.parseResume(file),
    onSuccess: (parsed) => {
      if (parsed.name) setValue('name', parsed.name);
      if (parsed.email) setValue('email', parsed.email);
      if (parsed.phone) setValue('phone', parsed.phone);
      if (parsed.experienceYears != null) setValue('experienceYears', String(parsed.experienceYears));
      if (parsed.currentCompany) setValue('currentCompany', parsed.currentCompany);
      if (parsed.location) setValue('location', parsed.location);
      if (parsed.education) setValue('education', parsed.education);
      if (parsed.skills?.length) setValue('skillsText', parsed.skills.join(', '));
      setParsedResume({ resumePath: parsed.resumePath, resumeText: parsed.resumeText });
      // jobId is intentionally left untouched — a resume doesn't say which job the
      // candidate applied for.
    },
  });

  const mutation = useMutation({
    mutationFn: ({ skillsText, ...values }: CandidateFormValues) =>
      candidatesApi.create({
        ...values,
        ...parsedResume,
        experienceYears: values.experienceYears ? Number(values.experienceYears) : undefined,
        skills: skillsText
          ? skillsText.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      }),
    onSuccess: (candidate) => {
      queryClient.invalidateQueries({ queryKey: ['org', organization?.id, 'candidates'] });
      reset();
      setResumeFile(null);
      setParsedResume(null);
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
        <div className="rounded-lg bg-violet-50/60 border border-violet-100 p-3 space-y-2">
          <span className="block text-[13px] font-medium text-ink-700">Auto-fill from resume (optional)</span>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
              className="flex-1 text-[13px] text-ink-600 file:mr-3 file:h-8 file:px-3 file:rounded-lg file:border-0 file:bg-white file:text-ink-700 file:border file:border-ink-200 file:text-[13px]"
            />
            <Button
              type="button"
              variant="ai"
              size="sm"
              disabled={!resumeFile}
              loading={parseResumeMutation.isPending}
              onClick={() => resumeFile && parseResumeMutation.mutate(resumeFile)}
            >
              ✨ Auto-fill from resume
            </Button>
          </div>
          {parseResumeMutation.isError && (
            <p className="text-[13px] text-rose-500">
              {parseResumeMutation.error instanceof ApiError
                ? parseResumeMutation.error.message
                : "Couldn't read that resume. Try another file."}
            </p>
          )}
        </div>
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
