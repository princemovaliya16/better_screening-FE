import { api } from './client';
import type { MailAccountStatus, UpdateSignatureInput } from './mailAccounts.types';

export const mailAccountsApi = {
  getStatus: () => api.get<MailAccountStatus>('/mail-accounts/status'),
  updateSignature: (input: UpdateSignatureInput) =>
    api.patch<MailAccountStatus>('/mail-accounts/signature', input),
  getGmailConnectUrl: () => api.get<{ url: string }>('/mail-accounts/gmail/connect-url'),
  disconnectGmail: () => api.delete<void>('/mail-accounts/gmail'),
};
