export type VCVerificationRequest = {
  verifiableCredential: string;
  skipStatusChecks?: boolean;
  statusCheckFilters?: string[];
  includeClaims?: boolean;
};

export type VerifyErrorDto = {
  errorCode?: string;
  errorMessage?: string;
};

export type SchemaAndSignatureCheck = {
  valid: boolean;
  error?: VerifyErrorDto | null;
};

export type ExpiryCheck = {
  valid: boolean;
};

export type StatusCheck = {
  purpose: string;
  valid: boolean;
  error?: VerifyErrorDto | null;
};

export type VCVerificationResult = {
  allChecksSuccessful: boolean;
  schemaAndSignatureCheck?: SchemaAndSignatureCheck;
  expiryCheck?: ExpiryCheck;
  statusCheck?: StatusCheck[];
  claims?: Record<string, unknown>;
};

export type ParsedCredentialMeta = {
  issuer?: string;
  types?: string[];
  subject?: Record<string, unknown>;
  expirationDate?: string;
  issuanceDate?: string;
};
