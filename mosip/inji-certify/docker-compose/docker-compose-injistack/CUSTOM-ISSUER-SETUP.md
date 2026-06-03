# Custom Real Issuers (Postgres + did:web) — Setup Guide

This stack has been converted from the **mock Farmer (CSV)** demo to **real, DB-backed
custom issuers** using the **PostgresDataProviderPlugin** and **did:web** signing, so the
full flow works end to end:

> select issuer → click issue → eSignet login → credential issued from Postgres & signed →
> downloaded into Inji Web → **verifies** at Inji Verify.

Two issuers ship as examples (the pattern repeats for more):

| Issuer (tile) | Credential type | Scope | Data table |
|---|---|---|---|
| **University Registrar** | `StudentIdentityCredential` | `student_vc_ldp` | `certify.university_student_data` |
| **Health Authority** | `InsuranceCredential` | `insurance_vc_ldp` | `certify.health_insurance_data` |

Authentication stays on the **hosted mock eSignet** (`esignet-mock.collab.mosip.net`):
login with a UIN + OTP `111111`. A fully real identity backend needs the entire MOSIP
platform and is out of scope.

---

## What changed in this folder

| File | Change |
|---|---|
| `certify_init.sql` | Removed the Farmer CSV `credential_config` insert; added `university_student_data` + `health_insurance_data` tables seeded with UIN-keyed rows. |
| `certify_init_custom.sql` | **Generated** by `custom-issuer/generate-config.sh` — the two custom `credential_config` rows (base64 VC templates). Mounted as a Postgres init script (runs after `certify_init.sql`). |
| `config/certify-postgres-custom.properties` | **New** profile: `PostgresDataProviderPlugin`, scope→SQL mapping, `did-url`. |
| `docker-compose.yaml` | `active_profile_env=default,postgres-custom`; mounts the new properties file and `certify_init_custom.sql`. |
| `config/mimoto-issuers-config.json` | Replaced Farmer/MockMdl with `University` and `HealthAuthority`. |
| `custom-issuer/` | Readable VC templates, JSON-LD `@context` masters, and the generator. |

---

## Key constraints (why the steps below exist)

1. **`sub` = UIN.** With the hosted mock eSignet, the access-token `sub` is the citizen
   UIN, and the Postgres plugin looks the row up by it (`... where uin=:id`). So each row
   must be keyed by a UIN that exists in the collab mock identity. The known-good ones are
   **`5860356276`** and **`2154189532`** (OTP `111111`) — already seeded.
2. **Issuer DID must be public https.** Mimoto verifies the VC at *download* time and Inji
   Verify verifies at presentation; both resolve the issuer `did:web` over public https.
   `did:jwk` is **not** supported as the issuer DID here → we host `did.json` on GitHub Pages.
3. **JSON-LD `@context` must be public.** The custom `credentialSubject` terms are defined in
   `contexts/student.json` and `contexts/insurance.json`, also hosted on GitHub Pages.
4. **eSignet OIDC client.** Mimoto authenticates to eSignet via `private_key_jwt` using
   `certs/oidckeystore.p12`. The client must trust that key, allow the web redirect
   `http://localhost:3004/redirect`, and permit the credential scopes.

---

## Prerequisites
- Docker & Docker Compose.
- A **GitHub Pages** site you can publish to (a repo with Pages enabled, e.g. on the
  `gh-pages` branch). Pick a base URL like `https://<gh-user>.github.io/<repo>`.
  - Use the **account that owns the repo** (e.g. `viitoradmin`), not your personal fork
    name, unless you host Pages on your own fork.
- **Write access** to that repo (or a fork you control) to push the `gh-pages` branch.
- Network access to `esignet-mock.collab.mosip.net`.

---

## Step 1 — Bake your GitHub Pages host into the config

From this directory:

```bash
cd custom-issuer
./generate-config.sh https://<gh-user>.github.io/<repo>
cd ..
```

This:
- derives `ISSUER_DID = did:web:<gh-user>.github.io:<repo>:inji-issuer`,
- regenerates `../certify_init_custom.sql` (base64 VC templates with your context URLs),
- patches `did-url` in `config/certify-postgres-custom.properties`,
- writes upload-ready context files to `custom-issuer/dist/contexts/`.

> Pass an explicit DID as a 2nd arg if your hosting layout differs:
> `./generate-config.sh https://host/path did:web:host:path:inji-issuer`

## Step 2 — Onboard the OIDC client on eSignet

The wallet (Mimoto) must be a registered OIDC client on the collab eSignet. Two paths:

**A. Reuse the shipped `wallet-demo` client** (fastest, if it already permits the web
redirect and you can issue with its allowed scope). If authorization later fails with
`invalid_scope` or `invalid_redirect_uri`, use path B.

**B. Register your own client** using the Postman collection
`docs/postman-collections/inji-certify-with-mock-identity.postman_collection.json`
(install the `pmlib` library per that folder's README):
1. Generate/confirm `certs/oidckeystore.p12` (created by `./setup.sh`). Export its public
   key as JWK.
2. Run the **Create OIDC Client** request with:
   - `redirect_uris` including `http://localhost:3004/redirect`
   - `allowed scopes` including `student_vc_ldp` and `insurance_vc_ldp`
   - the public key JWK above.
3. Put the resulting `client_id` and key alias into `config/mimoto-issuers-config.json`
   (`client_id`, `client_alias`) for both issuers, and ensure the matching private key is in
   `certs/oidckeystore.p12` under that alias (`oidc_p12_password=xy4gh6swa2i` in
   `docker-compose.yaml`).

## Step 3 — Start the stack and capture the DID document

```bash
./setup.sh
docker compose up -d
docker compose ps          # all healthy
cd custom-issuer
./prepare-github-pages.sh  # writes dist/pages/ for upload
cd ..
```

Publish the contents of `custom-issuer/dist/pages/` to GitHub Pages (exact paths matter):

```
<repo>/inji-issuer/did.json
<repo>/contexts/student.json
<repo>/contexts/insurance.json
```

Verify the DID resolves publicly: paste `did:web:<gh-user>.github.io:<repo>:inji-issuer`
into <https://dev.uniresolver.io/>. The `verificationMethod[].publicKeyMultibase` must match
the local `did.json`.

### Publish `gh-pages` (contributors)

If the repo is under **`viitoradmin/inji-digital-health-id`** (you are a contributor, not the
owner `shaileshgojiya-vc`), push to **that** remote — `Repository not found` means the URL
does not exist under your personal account.

```bash
cd custom-issuer/dist/pages
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/viitoradmin/inji-digital-health-id.git
git push -u origin gh-pages
```

Then in GitHub: **viitoradmin/inji-digital-health-id → Settings → Pages →** source branch
`gh-pages`, folder `/ (root)`. Live URLs:

- `https://viitoradmin.github.io/inji-digital-health-id/inji-issuer/did.json`
- `https://viitoradmin.github.io/inji-digital-health-id/contexts/student.json`
- `https://viitoradmin.github.io/inji-digital-health-id/contexts/insurance.json`

If you lack push access, open a PR with the `gh-pages` branch or ask a maintainer to enable
Pages and merge your files. If you use **your own fork**, run `generate-config.sh` with
`https://<your-user>.github.io/<your-fork-repo>` instead.

## Step 4 — Recreate so the generated config is applied to a fresh DB

`certify_init_custom.sql` only runs on a **fresh** database volume:

```bash
docker compose down -v
./setup.sh
docker compose up -d
```

Sanity checks:

```bash
# Both custom credential types advertised:
curl -s http://localhost:8091/.well-known/openid-credential-issuer | python3 -m json.tool | grep -i -E "Student|Insurance"

# Credential config rows present:
docker compose exec database psql -U postgres -d inji_certify -c \
  "select credential_config_key_id, scope, did_url from certify.credential_config;"
```

---

## Step 5 — End-to-end test

1. Open <http://localhost:3004>. You should see **University Registrar** and **Health Authority**.
2. Select **University Registrar** → pick *Student Identity Credential* → **Continue as guest**.
3. On eSignet, log in with UIN **`5860356276`**, OTP **`111111`**.
4. You're redirected back to the wallet and the credential **downloads**.
   - If it fails, check `docker compose logs mimoto-service` for a DID/verification error
     (Step 3 hosting) and `docker compose logs certify` for the Postgres lookup.
5. Repeat for **Health Authority** → *Insurance Credential*.
6. Verify: open <https://injiverify.collab.mosip.net>, upload the downloaded VC / scan its
   QR. It resolves your public did:web and reports the signature as **valid**.

---

## Adding a third issuer (the pattern)

1. Add an identity table + UIN-keyed rows in `certify_init.sql`.
2. Add a `'<scope>': 'select ... where uin=:id'` line to the scope-query-mapping in
   `config/certify-postgres-custom.properties`.
3. Add a readable VC template under `custom-issuer/templates/` and a context master under
   `custom-issuer/context/`, then extend `generate-config.sh` to emit the new
   `credential_config` row (copy a block) — re-run it.
4. Add an issuer entry to `config/mimoto-issuers-config.json`.
5. `docker compose down -v && ./setup.sh && docker compose up -d`, then host the new context.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Download fails; mimoto logs "VC Verification failed" | `did.json` not hosted, wrong path, or stale `publicKeyMultibase`. Re-fetch `.well-known/did.json` and re-publish (the key changes on `down -v`). |
| eSignet returns `invalid_scope` / `invalid_redirect_uri` | OIDC client doesn't permit the scope or `http://localhost:3004/redirect` — do Step 2 path B. |
| Credential downloads but has empty fields | The logged-in UIN has no row in the issuer table — log in as `5860356276` / `2154189532`, or add a row keyed by that UIN. |
| Custom types missing from well-known | `certify_init_custom.sql` didn't run — it only applies on a fresh volume (`down -v`). |
| Inji Verify can't verify | DID or context not publicly resolvable — confirm both on uniresolver and by `curl`-ing the GitHub Pages URLs. |
