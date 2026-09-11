import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name').max(120),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').max(72),
  organizationName: z.string().min(2, "Enter your organization's name").max(120),
});
export type SignupFormValues = z.infer<typeof signupSchema>;

export const acceptInviteSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name').max(120),
  password: z.string().min(8, 'At least 8 characters').max(72),
});
export type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>;
