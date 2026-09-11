import { z } from 'zod';

const optionalNumericString = z
  .string()
  .optional()
  .refine((v) => !v || /^\d+$/.test(v), 'Enter a whole number');
const requiredNumericString = z.string().refine((v) => /^\d+$/.test(v), 'Enter a whole number');

export const jobSkillSchema = z.object({
  name: z.string().min(1, 'Required'),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  required: z.boolean(),
  importance: z.enum(['low', 'medium', 'high']),
});

export const roundQuestionSchema = z.object({
  questionText: z.string().min(1, 'Required'),
  questionType: z.enum(['technical', 'behavioral', 'situational', 'experience', 'culture']),
});

export const roundTemplateSchema = z.object({
  name: z.string().min(1, 'Required'),
  type: z.enum(['ai_interview', 'technical', 'hr']),
  durationMinutes: requiredNumericString,
  questions: z.array(roundQuestionSchema),
});

/** Form values keep numeric fields as strings (native `<input type="number">`
 * values are strings anyway) — converted to numbers only when building the API
 * payload, which sidesteps the zodResolver input/output typing friction that
 * `z.coerce.number()` introduces with react-hook-form's generic. */
export const jobFormSchema = z.object({
  title: z.string().min(2, 'Enter a job title').max(160),
  department: z.string().min(1, 'Select a department'),
  location: z.string().optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'internship']),
  experienceMin: optionalNumericString,
  experienceMax: optionalNumericString,
  positionsCount: requiredNumericString,
  status: z.enum(['draft', 'open', 'closed']),
  description: z.string().min(20, 'Add at least 20 characters describing the role'),
  skills: z.array(jobSkillSchema),
  rounds: z.array(roundTemplateSchema).min(1, 'Add at least one interview round'),
});
export type JobFormValues = z.infer<typeof jobFormSchema>;

export const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'People'];
