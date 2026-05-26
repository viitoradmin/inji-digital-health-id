import type { CredentialConfiguration } from "@/types/credential-config";

/** Sample Farmer LDP-VC config (matches inji-certify POST body). */
export const FARMER_CREDENTIAL_CONFIG: CredentialConfiguration = {
  vcTemplate:
    "ewogICAgICAgICJAY29udGV4dCI6IFsKICAgICAgICAgICAgImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIiwKICAgICAgICAgICAgImh0dHBzOi8vcGl5dXNoNzAzNC5naXRodWIuaW8vbXktZmlsZXMvZmFybWVyLmpzb24iCiAgICAgICAgXSwKICAgICAgICAiaXNzdWVyIjogIiR7X2lzc3Vlcn0iLAogICAgICAgICJ0eXBlIjogWwogICAgICAgICAgICAiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLAogICAgICAgICAgICAiRmFybWVyQ3JlZGVudGlhbCIKICAgICAgICBdLAogICAgICAgICJpc3N1YW5jZURhdGUiOiAiJHt2YWxpZEZyb219IiwKICAgICAgICAiZXhwaXJhdGlvbkRhdGUiOiAiJHt2YWxpZFVudGlsfSIsCiAgICAgICAgImNyZWRlbnRpYWxTdWJqZWN0IjogewogICAgICAgICAgICAiaWQiOiAiJHtfaG9sZGVySWR9IiwKICAgICAgICAgICAgImZ1bGxOYW1lIjogIiR7ZnVsbE5hbWV9IiwKICAgICAgICAgICAgIm1vYmlsZU51bWJlciI6ICIke3Bob25lfSIsCiAgICAgICAgICAgICJkYXRlT2ZCaXJ0aCI6ICIke2RhdGVPZkJpcnRofSIsCiAgICAgICAgICAgICJnZW5kZXIiOiAiJHtnZW5kZXJ9IgogICAgICAgIH0KICAgIH0=",
  credentialConfigKeyId: "FarmerCredential",
  contextURLs: ["https://www.w3.org/2018/credentials/v1"],
  credentialTypes: ["FarmerCredential", "VerifiableCredential"],
  credentialFormat: "ldp_vc",
  didUrl: "did:web:mosip.github.io:inji-config:vc-local-ed25519",
  keyManagerAppId: "CERTIFY_VC_SIGN_ED25519",
  keyManagerRefId: "ED25519_SIGN",
  signatureAlgo: "EdDSA",
  signatureCryptoSuite: "Ed25519Signature2020",
  metaDataDisplay: [
    {
      logo: {
        url: "https://mosip.github.io/inji-config/logos/agro-vertias-logo.png",
        alt_text: "Farmer Credential Logo",
      },
      name: "Farmer Verifiable Credential",
      locale: "en",
      text_color: "#FFFFFF",
      background_color: "#12107c",
      background_image: {
        uri: "https://mosip.github.io/inji-config/logos/agro-vertias-logo.png",
      },
    },
  ],
  displayOrder: [
    "fullName",
    "mobileNumber",
    "dateOfBirth",
    "gender",
    "state",
    "district",
    "villageOrTown",
    "postalCode",
    "landArea",
    "landOwnershipType",
    "primaryCropType",
    "secondaryCropType",
    "farmerID",
  ],
  scope: "mock_identity_vc_ldp",
  pluginConfigurations: [
    {
      "mosip.certify.mock.data-provider.csv-registry-uri":
        "/home/mosip/config/farmer_identity_data.csv",
      "mosip.certify.mock.data-provider.csv.data-columns":
        "id,fullName,mobileNumber,dateOfBirth,gender,state,district,villageOrTown,postalCode,landArea,landOwnershipType,primaryCropType,secondaryCropType,face,farmerID",
      "mosip.certify.mock.data-provider.csv.identifier-column": "id",
    },
  ],
  credentialStatusPurposes: ["revocation"],
  qrSettings: [
    {
      "Full Name": "${fullName}",
      "Phone Number": "${mobileNumber}",
      "Date Of Birth": "${dateOfBirth}",
    },
  ],
  qrSignatureAlgo: "EdDSA",
  credentialSubjectDefinition: {
    phone: { display: [{ name: "Phone Number", locale: "en" }] },
    gender: { display: [{ name: "Gender", locale: "en" }] },
    fullName: { display: [{ name: "Full Name", locale: "en" }] },
    dateOfBirth: { display: [{ name: "Date of Birth", locale: "en" }] },
  },
};

/** Registry / list defaults — mock Farmer is kept as a form template only, not listed by default. */
export const DEFAULT_CONFIG_KEYS: string[] = [];

export const FARMER_CREDENTIAL_KEY_ID = FARMER_CREDENTIAL_CONFIG.credentialConfigKeyId!;

/** True when Certify mock CSV / mock scope drives this config (demo Farmer VC). */
export function isMockCredentialConfiguration(c: CredentialConfiguration): boolean {
  if (c.scope?.toLowerCase().includes("mock")) return true;
  const plugins = c.pluginConfigurations;
  if (!plugins?.length) return false;
  return plugins.some((p) =>
    Object.keys(p as Record<string, unknown>).some((key) => key.toLowerCase().includes("mock")),
  );
}

/** Omit mock Farmer from /credentials cards (still available as new-form template & deep link). */
export function shouldHideMockFarmerFromCredentialsList(
  id: string,
  config: CredentialConfiguration,
): boolean {
  const farmerKey = FARMER_CREDENTIAL_KEY_ID;
  if (id !== farmerKey && config.credentialConfigKeyId !== farmerKey) return false;
  if (isMockCredentialConfiguration(config)) return true;
  const emptyShell =
    !config.credentialFormat &&
    !config.scope &&
    !config.vcTemplate &&
    !(config.metaDataDisplay && config.metaDataDisplay.length > 0);
  return emptyShell;
}
