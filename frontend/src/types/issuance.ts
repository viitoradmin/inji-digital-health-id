export type PreAuthorizedRequest = {
  credential_configuration_id: string;
  claims: Record<string, string>;
  expires_in?: number;
  tx_code?: string;
};

export type PreAuthorizedResponse = {
  credential_offer_uri: string;
};

export type TxCodeInfo = {
  length?: number;
  input_mode?: string;
  description?: string;
};

export type PreAuthorizedGrant = {
  "pre-authorized_code"?: string;
  tx_code?: TxCodeInfo | null;
};

export type CredentialOfferResponse = {
  credential_issuer?: string;
  credential_configuration_ids?: string[];
  grants?: {
    "urn:ietf:params:oauth:grant-type:pre-authorized_code"?: PreAuthorizedGrant;
  };
};

export type OAuthTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  c_nonce?: string;
  c_nonce_expires_in?: number;
};

export type IssuanceRecord = {
  id: string;
  createdAt: string;
  credentialConfigurationId: string;
  credentialOfferUri: string;
  offerId?: string;
  claims: Record<string, string>;
  expiresIn: number;
  txCode?: string;
};
