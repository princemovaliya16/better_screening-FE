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

export interface OrganizationSettings {
  id: string;
  organizationId: string;
  aiInterviewEnabled: boolean;
  defaultRoundDurationMinutes: number;
  defaultTimezone: string;
  notifyOnEvaluationReady: boolean;
  notifyOnNewApplication: boolean;
  emailSignature: string | null;
}
