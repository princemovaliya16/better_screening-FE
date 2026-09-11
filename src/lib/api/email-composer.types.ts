export type EmailType = 'invitation' | 'reminder' | 'passed' | 'rejected' | 'offer' | 'followup';

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  invitation: 'Interview invitation',
  reminder: 'Interview reminder',
  passed: 'Passed a round',
  rejected: 'Rejection',
  offer: 'Offer',
  followup: 'Follow-up',
};

export interface ComposedEmail {
  subject: string;
  body: string;
}

export interface CandidateEmail {
  id: string;
  candidateId: string;
  type: EmailType;
  subject: string;
  body: string;
  sentByUserId: string | null;
  sentBy?: { id: string; name: string } | null;
  sentAt: string;
  createdAt: string;
}

export interface ComposeEmailInput {
  type: EmailType;
  interviewId?: string;
  additionalContext?: string;
}

export interface SendEmailInput {
  type: EmailType;
  subject: string;
  body: string;
}
