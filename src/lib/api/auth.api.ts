import { api } from './client';
import type { AuthResponse, PublicUser, UserRole } from './types';

export interface SignupPayload {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AcceptInvitePayload {
  token: string;
  fullName: string;
  password: string;
}

export const authApi = {
  signup: (payload: SignupPayload) =>
    api.post<AuthResponse>('/auth/signup', payload, { auth: false }),
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload, { auth: false }),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }, { auth: false }),
  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, newPassword }, { auth: false }),
  acceptInvite: (payload: AcceptInvitePayload) =>
    api.post<AuthResponse>('/auth/accept-invite', payload, { auth: false }),
  invite: (email: string, role: UserRole) =>
    api.post<PublicUser>('/auth/invite', { email, role }),
};
