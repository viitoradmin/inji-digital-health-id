/** Sample LDP-VC JSON for paste tab (matches inji-verify example). */
export const SAMPLE_VC_JSON = `{
  "issuanceDate": "2026-05-12T11:01:55.962Z",
  "credentialSubject": {
    "gender": "Male",
    "fullName": "Alan Turing",
    "personId": "PERSON-002",
    "dateOfBirth": "1912-06-23",
    "id": "did:jwk:eyJrdHkiOiJSU0EiLCJlIjoiQVFBQiJ9",
    "email": "alan@example.local"
  },
  "id": "https://mosip.io/credential/284e8f9e-e03f-4a5c-ab56-0ff27bf74677",
  "type": ["VerifiableCredential", "PersonCredential"],
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "issuer": "did:web:certify-nginx",
  "expirationDate": "2028-05-11T11:01:55.962Z",
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-05-12T11:01:55Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "did:web:certify-nginx#qeSHwmm3VduU44ZrmrDfA5tQvvph-QuybsX_ulXxEB8",
    "proofValue": "z5duysxoxrrGhMspwe5TNeFemWYssnPJfWyD8ETC9yCgRCt2ySysedeHBjgaMG6sShkPbVErLSbb6k5g37nxwDRSZ"
  }
}`;
