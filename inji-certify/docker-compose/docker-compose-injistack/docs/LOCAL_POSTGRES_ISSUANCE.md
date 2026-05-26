# Local Postgres-backed issuance (no eSignet, no CSV/mock identity)

See the stack-wide overview: **[INJI_LOCAL_STACK.md](./INJI_LOCAL_STACK.md)** (ports, prerequisites, architecture).

This stack issues **PersonCredential** credentials from the `certify.person_data` table using the **PostgresDataProviderPlugin**, with **Inji Certify as its own OAuth server** (pre-authorized code flow). External **eSignet / MOSIP Collab** URLs are removed from the injistack `certify-default.properties` and Mimoto issuer config.

## What changed from the default injistack demo

| Area | Before | After |
|------|--------|--------|
| Certify profiles | `default, csvdp-farmer` + CSV file | `default, postgres-person` + `person_data` table (`certify-postgres-person.properties`) |
| AuthZ | eSignet Collab JWKS / issuer | Certify self (`mosip.certify.authorization.url` = `http://localhost:8090`) |
| Pre-auth `sub` + Postgres `:id` | JWT `sub` was full JSON of claims (incompatible with Postgres plugin) | `mosip.certify.pre-auth.subject-claim-key=personId` + code change in `PreAuthorizedCodeService` |
| Mimoto issuers | Farmer / MockMdl → Collab eSignet | Single **LocalPerson** issuer → Certify token endpoint inside Docker (`http://certify:8090/...`) |
| Postman | FarmerCredential + wrong proof `aud` | PersonCredential + proof JWT **`aud`** = **`mosip.certify.identifier`** (with compose `mosip_certify_domain_url=http://certify-nginx:80`, use exactly **`http://certify-nginx:80`**, not `http://localhost:8090/.../issuance/credential`) |

## Prerequisites

- Docker + Docker Compose v2 (`docker compose`; on Ubuntu install **`docker-compose-v2`**, not necessarily `docker-compose-plugin`)
- Compose-managed **`mosip_network`** (see `docker-compose.yaml`; no manual `docker network create` required for the default setup)
- `certs/oidckeystore.p12` and keystore password (see [README.md](../README.md))
- Optional: Google OAuth env vars if you use **Sign in with Google** on Inji Web

## Start

First build bundles a **locally built `certify-service` JAR** (includes the pre-auth `personId` → JWT `sub` fix required by the Postgres plugin) into the upstream plugins image:

```bash
cd docker-compose/docker-compose-injistack
docker compose build certify
docker compose up -d
```

### Build looks “stuck” on `RUN mvn` (not an infinite loop)

The certify image runs a full Maven build inside Docker. The first run often takes **10–20+ minutes** while dependencies download and modules compile. Older Dockerfile versions used `mvn -q`, which prints **nothing** for that whole time, so it looks frozen.

- **Do not** press Ctrl+C unless you intend to cancel.
- The Dockerfile now uses **`mvn -B`** (batch mode) so you see **Downloading… / Building…** lines.
- For a verbose one-off build: `docker compose build certify --progress=plain`.
- **`! certify Warning pull access denied for inji-certify-injistack`** is normal: that tag is local-built, not on Docker Hub; Compose builds it next.

Ports: Postgres **5434** by default (`INJI_STACK_POSTGRES_PORT`), Adminer **9050** by default (`INJI_STACK_ADMINER_PORT`), Certify **8090**, Certify nginx **8091**, Mimoto **8099**, Inji Web **3004**.

## Seed data

`certify_init.sql` creates `certify.person_data` and seeds `PERSON-001`, `PERSON-002`, `PERSON-003`. The active credential configuration key id is **`PersonCredential`** (scope `person_vc_ldp`).

## Pre-authorized issuance (Postman)

1. Import [Inji Certify - Pre Auth Code.postman_collection.json](../../docs/postman-collections/Inji%20Certify%20-%20Pre%20Auth%20Code.postman_collection.json) and [Inji-certify-pre-auth-code.postman_environment.json](../../docs/postman-collections/Inji-certify-pre-auth-code.postman_environment.json).
2. Install Postman **pmlib** per main README.
3. Run requests in order: **1. Generate Pre-Authorized Data** → **2. Get Credential Offer** → **3. Exchange Code for Token** → **4. Get Credential with Pre-Auth Token**.  
   Request **1** sends `personId` (and optional display claims); `personId` must exist in `certify.person_data`.  
   Re-import or update **`Inji-certify-pre-auth-code.postman_environment.json`** after pulls: **`certifyurl`** should be **`http://localhost:8091/v1/certify`** (nginx), and **`audUrl`** must be **`http://certify-nginx:80`** so the proof JWT matches `mosip.certify.identifier` when compose sets `mosip_certify_domain_url=http://certify-nginx:80`.

## Troubleshooting

- **`invalid_credential_request` — No matching ldp_vc credential configuration found for scope: health_vc_ldp`**: The access token scope is `health_vc_ldp` (HealthID pre-auth), but **step 4** `POST /issuance/credential` sent a `credential_definition` that does not match HealthID in well-known metadata. HealthID requires **two** `@context` URLs and types `VerifiableCredential` + `HealthID`. The bundled Postman collection builds the issuance body from `credential_config_id` in the pre-request script for step 4; set `credential_config_id=HealthID` in the environment and re-import the collection if you still see a hardcoded `PersonCredential` body.

- **`502 Bad Gateway`** from nginx (**8091**) in Postman (e.g. **Get Configuration By Id**): First confirm **`certifyurl`** in the active environment is exactly **`http://localhost:8091/v1/certify`** (Spring serves APIs under `/v1/certify`; omitting it sends requests to the wrong nginx location). If the URL is correct but Postman still fails, **re-import** [`Inji Certify - Pre Auth Code.postman_collection.json`](../../docs/postman-collections/Inji%20Certify%20-%20Pre%20Auth%20Code.postman_collection.json): older collection exports stored `{{certifyurl}}` in Postman’s **`host`** field even though it is a full base URL, which makes Postman assemble a broken URL. If nginx still returns 502, Certify is unreachable upstream—see **502 Bad Gateway** in [INJI_LOCAL_STACK.md](./INJI_LOCAL_STACK.md) (`docker compose logs certify` / `certify-nginx`).
- **`credentialOfferCache not available`** on pre-authorized / credential-offer calls: Certify’s `mosip.certify.cache.names` must include **`credentialOfferCache`** (see `certify-default.properties`). Restart the `certify` container after changing cache properties.

## Optional: Inji Verify

Uncomment `verify-service` in `docker-compose.yaml` and ensure `mosip.certify.verify.service.base-url` in `certify-default.properties` matches your Verify container URL. Re-create the DB volume if you add Verify after the first boot, or run verify DB scripts manually.

**VC verification V2** (`POST http://localhost:8095/v1/verify/v2/vc-verification`): the request body is JSON with `Content-Type: application/json`. The payload is **`VCVerificationRequestDto`**, not `vcJsonldWithProof` or a bare `credential` wrapper:

- **`verifiableCredential`** (required): the Verifiable Credential document as a **JSON string** (escape the VC once inside the outer JSON).
- **`skipStatusChecks`**, **`statusCheckFilters`** (e.g. `["revocation"]`), **`includeClaims`**: see the [upstream DTO](https://github.com/mosip/inji-verify/blob/release-0.17.x/verify-service/src/main/java/io/inji/verify/dto/verification/VCVerificationRequestDto.java).

Example file (your sample VC, correctly wrapped): [`docs/examples/inji-verify-v2-vc-verification-request.example.json`](./examples/inji-verify-v2-vc-verification-request.example.json). Postman helper (pre-request builds the body from `issuance_response`): [`docs/examples/postman-vc-verify-v2-pre-request.js`](./examples/postman-vc-verify-v2-pre-request.js).

**Docker caveat:** verification runs **inside** the `verify-service` container. Resolving `did:web:localhost%3A8091` fails there (`localhost` is the container, not your host). Resolving `did:web:certify-nginx` may use HTTPS port **443** by default while nginx only serves **80** in this compose stack—signature or DID resolution can still fail until DID URLs match what the verifier can reach (often a public tunnel or stack-specific DID config). Re-issue after aligning issuer / `did_url` / proof `verificationMethod` with your deployment.

## Optional: switch back to CSV farmer demo

Restore `active_profile_env=default,csvdp-farmer`, mount `certify-csvdp-farmer.properties` and `farmer_identity_data.csv`, and restore the previous `certify_init.sql` credential_config INSERT / eSignet properties from git history.

## Credential configuration API (reference)

The stack preloads **PersonCredential** via SQL. To add another type at runtime, use `POST /v1/certify/credential-configurations` — see [Credential-Issuer-Configuration.md](../../docs/Credential-Issuer-Configuration.md) and [credential-configuration-person.example.json](../config/credential-configuration-person.example.json).
