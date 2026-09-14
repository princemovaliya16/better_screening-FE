export interface MailAccountStatus {
  signatureName: string | null;
  signatureDesignation: string | null;
  signatureCompany: string | null;
  signaturePhone: string | null;
  signatureWebsite: string | null;
  gmailConnected: boolean;
  gmailEmail: string | null;
  gmailConnectedAt: string | null;
  /** Whether the server even has a Google OAuth client configured. */
  googleConfigured: boolean;
}

export interface UpdateSignatureInput {
  signatureName?: string;
  signatureDesignation?: string;
  signatureCompany?: string;
  signaturePhone?: string;
  signatureWebsite?: string;
}
