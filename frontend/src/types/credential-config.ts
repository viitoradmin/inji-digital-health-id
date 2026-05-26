export type MetaDataDisplay = {
  logo?: { url?: string; alt_text?: string };
  name?: string;
  locale?: string;
  text_color?: string;
  background_color?: string;
  background_image?: { uri?: string };
};

export type CredentialSubjectField = {
  display?: Array<{ name?: string; locale?: string }>;
};

export type CredentialConfiguration = {
  vcTemplate?: string;
  credentialConfigKeyId?: string;
  contextURLs?: string[];
  credentialTypes?: string[];
  credentialFormat?: string;
  didUrl?: string;
  keyManagerAppId?: string;
  keyManagerRefId?: string;
  signatureAlgo?: string;
  signatureCryptoSuite?: string;
  metaDataDisplay?: MetaDataDisplay[];
  displayOrder?: string[];
  scope?: string;
  pluginConfigurations?: Array<Record<string, string>>;
  credentialStatusPurposes?: string[];
  qrSettings?: Array<Record<string, string>>;
  qrSignatureAlgo?: string;
  credentialSubjectDefinition?: Record<string, CredentialSubjectField>;
};

export type CredentialConfigResponse = { id: string };
