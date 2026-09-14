export type UserRole = 'admin' | 'recruiter';
export type UserStatus = 'active' | 'invited' | 'disabled';

export interface PublicUser {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatarPath: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export type OrganizationStatus = 'trial' | 'active' | 'suspended';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export type EmailTone = 'professional' | 'friendly' | 'concise' | 'warm';

export const EMAIL_TONE_LABELS: Record<EmailTone, string> = {
  professional: 'Professional',
  friendly: 'Friendly',
  concise: 'Concise',
  warm: 'Warm',
};

export interface OrganizationSettings {
  id: string;
  organizationId: string;
  aiInterviewEnabled: boolean;
  defaultRoundDurationMinutes: number;
  defaultTimezone: string;
  notifyOnEvaluationReady: boolean;
  notifyOnNewApplication: boolean;
  notifyOnInterviewScheduled: boolean;
  notifyOnRoundDecision: boolean;
  /** Persisted, but no digest-sending job reads it yet. */
  weeklyDigestEnabled: boolean;
  /** Persisted, but no product-announcements system reads it yet. */
  productUpdatesEnabled: boolean;
  aiQuestionGenEnabled: boolean;
  aiResumeParseEnabled: boolean;
  /** Persisted, but the evaluation pipeline doesn't check it yet — scoring always runs. */
  aiScoringEnabled: boolean;
  /** Persisted, but the evaluation pipeline doesn't check it yet — summaries always run. */
  aiSummaryEnabled: boolean;
  aiEmailDraftingEnabled: boolean;
  emailTone: EmailTone;
  emailSignature: string | null;
}
