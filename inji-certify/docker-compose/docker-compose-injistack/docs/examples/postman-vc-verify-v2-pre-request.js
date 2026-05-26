// Postman → Pre-request Script for "VC verification V2"
// 1) In a prior request Tests tab, save the issuance response:
//    pm.collectionVariables.set("issuance_response", pm.response.text());
// 2) This script builds the correct /v2/vc-verification JSON body (field: verifiableCredential).

const raw = pm.collectionVariables.get("issuance_response");
if (!raw) {
    throw new Error("Set collection variable `issuance_response` to the raw response body from Get Credential (string).");
}
const parsed = JSON.parse(raw);
const vc = parsed.credential != null ? parsed.credential : parsed;

const body = {
    verifiableCredential: JSON.stringify(vc),
    skipStatusChecks: false,
    statusCheckFilters: ["revocation"],
    includeClaims: true,
};

pm.request.body.mode = "raw";
pm.request.body.raw = JSON.stringify(body, null, 2);
