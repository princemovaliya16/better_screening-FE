import { z } from 'zod';

export const candidateFormSchema = z.object({
  name: z.string().min(2, 'Enter the candidate name').max(160),
  email: z.email('Enter a valid email'),
  phone: z.string().optional(),
  jobId: z.string().min(1, 'Select a job'),
  experienceYears: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), 'Enter a whole number'),
  currentCompany: z.string().optional(),
  location: z.string().optional(),
  education: z.string().optional(),
  skillsText: z.string().optional(),
});
export type CandidateFormValues = z.infer<typeof candidateFormSchema>;
