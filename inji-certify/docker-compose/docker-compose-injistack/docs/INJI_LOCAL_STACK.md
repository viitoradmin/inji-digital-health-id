# Inji local stack (no eSignet): Certify + Mimoto + Inji Web

This document describes the **actual** `docker-compose-injistack` setup in this repository: **Inji Certify** (with a local build + Postgres-backed person issuance), **Mimoto** (BFF), **Inji Web** (browser UI), and **PostgreSQL**. It does **not** use MOSIP Collab eSignet; Certify acts as the authorization surface for the **pre-authorized code** flow.

For Postgres-specific properties, Postman, and SQL seeding, see **[LOCAL_POSTGRES_ISSUANCE.md](./LOCAL_POSTGRES_ISSUANCE.md)**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser / Postman / Wrapper API              │
└───────────────┬───────────────────────────────┬─────────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────┐     ┌───────────────────────────────┐
│ Inji Web :3004            │     │ Mimoto (BFF) :8099            │
│ MIMOTO_URL → localhost    │────▶│ Proxies issuer / token flows  │
└───────────────────────────┘     └───────────────┬─────────────┘
                                                    │
                    ┌───────────────────────────────▼──────────────────────────────┐
                    │ certify-nginx :8091 → Certify :8090 (OpenID4VCI issuer)    │
                    │ + PostgresDataProviderPlugin (person rows in DB)            │
                    └───────────────┬────────────────────────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │ PostgreSQL :5434 → :5432      │
                    │ DBs: mosip_certify, inji_mimoto │
                    └───────────────────────────────┘
```

**Inji Wallet (mobile)** is not run by this compose file. Point the app at your machine’s **LAN IP** (not `localhost`) for Mimoto, e.g. `http://192.168.x.x:8099/v1/mimoto`.

**Redis:** This compose stack does **not** define a Redis service. Certify uses in-process/simple cache per its properties; for multi-replica production you would add Redis separately.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| Docker Engine | Ubuntu: `sudo apt-get install -y docker.io docker-compose-v2` |
| Docker Compose v2 | Use `docker compose` (space). Package **`docker-compose-plugin`** is from Docker’s apt repo, not Ubuntu’s default mirrors. |
| Git, curl | For clone and smoke tests |
| JDK 21 + Maven | Only if you rebuild Certify from source outside Docker |
| `certs/oidckeystore.p12` | **Must be a PKCS12 file**, not a directory. Required for Mimoto (see below and [README.md](../README.md)) |

### One-time: OIDC keystore for Mimoto

Mimoto mounts `certs/oidckeystore.p12` into the container. If that path is a **directory** (common mistake) or missing, Mimoto fails with `KeystoreProcessingException` / `Is a directory`.

1. If `oidckeystore.p12` is a directory, remove it (needs elevated rights if it was created as root):

   ```bash
   cd docker-compose/docker-compose-injistack
   sudo rm -rf certs/oidckeystore.p12
   ```

2. Generate a **dev-only** PKCS12 (password matches `oidc_p12_password` in `docker-compose.yaml`, default `xy4gh6swa2i`):

   ```bash
   chmod +x scripts/prepare-oidc-keystore.sh
   ./scripts/prepare-oidc-keystore.sh
   ```

   Or manually:

   ```bash
   keytool -genkeypair -alias oidc -keyalg RSA -keysize 2048 -storetype PKCS12 \
     -keystore certs/oidckeystore.p12 -storepass xy4gh6swa2i -validity 3650 \
     -dname "CN=localhost, OU=Dev, O=InjiLocal, L=Local, ST=NA, C=IN" -noprompt
   ```

3. Bring Mimoto back:

   ```bash
   docker compose up -d mimoto-service inji-web
   ```

Add your user to the `docker` group if you want to avoid `sudo`:

```bash
sudo usermod -aG docker $USER
newgrp docker   # or log out and back in
```

Verify:

```bash
docker --version
docker compose version
```

---

## Clone and enter the stack

```bash
git clone https://github.com/mosip/inji-certify.git
cd inji-certify/docker-compose/docker-compose-injistack
```

Use a **tag or branch** that matches the compose images you expect (this repo’s compose references **Inji Certify 0.14.x**-era plugins and a **local** certify image build).

---

## Directory layout (expected)

```
docker-compose-injistack/
├── config/                    # Mounted into containers (do not delete)
├── data/CERTIFY_PKCS12/       # Runtime PKCS12 material (created as needed)
├── certs/oidckeystore.p12     # Mimoto OIDC keystore
├── certify_init.sql           # Certify + person_data seed
├── mimoto_init.sql
├── docker-compose.yaml
├── Dockerfile.certify-local   # Builds patched certify-service JAR into plugins image
├── certify-nginx.conf
├── scripts/
│   └── prepare-oidc-keystore.sh  # Dev PKCS12 for certs/oidckeystore.p12
└── docs/
    ├── INJI_LOCAL_STACK.md    # This file
    └── LOCAL_POSTGRES_ISSUANCE.md
```

Optional: `loader_path/certify/` for overriding plugin JARs (see README; mount is commented in compose by default).

---

## Services and ports (current `docker-compose.yaml`)

| Service | Image / build | Host port | Role |
|---------|----------------|-----------|------|
| `database` | `postgres:15` | **5434** → 5432 (`INJI_STACK_POSTGRES_PORT`) | Certify + Mimoto (+ optional verify) schemas |
| `certify` | `inji-certify-injistack:local` (build) | **8090** | Certify API (direct; prefer nginx for browsers/Postman) |
| `certify-nginx` | `nginx:stable` | **8091** → 80 | Reverse proxy + static config for well-known / issuance paths |
| `mimoto-service` | `injistack/mimoto:0.21.0` | **8099** | BFF for wallets / Inji Web |
| `inji-web` | `injistack/inji-web:0.16.0` | **3004** | Web wallet UI (`MIMOTO_URL=http://localhost:8099/v1/mimoto`) |
| `adminer` | `adminer:4.8.1` | **9050** → 8080 (`INJI_STACK_ADMINER_PORT`) | Web UI for Postgres (`Server`: **`database`**, user/password same as compose, e.g. `postgres`/`postgres`) |
| `verify-service` | `injistack/inji-verify-service:0.17.0` | **8095** → 8080 | Inji Verify API (optional; comment out in `docker-compose.yaml` if unused) |

If `verify-service` is commented out in your `docker-compose.yaml`, ignore that row until you enable it (see README / LOCAL_POSTGRES_ISSUANCE).

---

## Networking

Compose defines a bridge network named **`mosip_network`**. It is **managed by Compose** (not `external: true`), so container DNS names such as `database`, `certify`, and `certify-nginx` resolve correctly. You do **not** need `docker network create mosip_network` unless you intentionally use an external network (advanced).

---

## Certify configuration (summary)

- **Profiles:** `active_profile_env=default,postgres-person` → loads `certify-default.properties` + **`certify-postgres-person.properties`**.
- **Plugins:** `loader_path_env` lists JARs inside the image (`postgres-dataprovider-plugin`, etc.); **`mock-certify-plugin.jar` is excluded** on purpose so the Postgres profile does not pull in mock-only properties.
- **Issuer / auth:** Self-referential Certify URLs for local pre-auth (see `certify-default.properties` and LOCAL_POSTGRES_ISSUANCE).

---

## Start the stack

From `docker-compose-injistack/`:

1. Ensure **`certs/oidckeystore.p12` exists as a file** (see [One-time: OIDC keystore for Mimoto](#one-time-oidc-keystore-for-mimoto) above).
2. Then:

```bash
docker compose build certify    # first time: can take 10–20+ minutes
docker compose up -d
docker compose ps
```

Follow logs:

```bash
docker compose logs -f certify
docker compose logs -f mimoto-service
```

---

## Smoke checks

Prefer **8091** (nginx) for HTTP checks from the host; **8090** may reset or behave oddly during startup on some setups.

```bash
# Credential issuer metadata (through nginx)
curl -sS "http://localhost:8091/.well-known/openid-credential-issuer" | head -c 500

# Health (may require auth depending on security config — any JSON/error still proves TCP reachability)
curl -sS "http://localhost:8091/v1/certify/actuator/health"

# Inji Web
# Open http://localhost:3004 in a browser
```

**Mimoto issuers:** See your mounted `config/mimoto-issuers-config.json`. The default Postgres setup uses issuer **`LocalPerson`** with `credential_issuer_host` → `http://certify-nginx` (Docker DNS) and `proxy_token_endpoint` → Certify inside the network.

---

## Pre-authorized issuance (no eSignet)

Use the Postman collection and environment under `inji-certify/docs/postman-collections/` (see LOCAL_POSTGRES_ISSUANCE for exact filenames and **pmlib** setup). Flow: pre-authorized data → credential offer → token exchange → credential.

---

## Inji Wallet (mobile)

1. Clone [inji-wallet](https://github.com/mosip/inji-wallet) (or your org’s fork).
2. Configure base URL to **`http://<LAN-IP>:8099`** (Mimoto), not `localhost`.
3. Build/run per wallet README (Android Studio / Expo / etc.).

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|---------------------|
| `credentialOfferCache not available` | `certify-default.properties` must include **`credentialOfferCache`** in `mosip.certify.cache.names` (and matching expire/size for `spring.cache.type=simple`). Restart Certify after fixing. |
| `Unable to locate package docker-compose-plugin` | On Ubuntu use **`docker-compose-v2`** and `docker compose`, or add Docker’s official apt repo. |
| `NoSuchSecurityProviderException` / key alias errors after DB wipe | `docker compose down -v` and bring stack up again so key material matches DB. |
| Mimoto fails / `oidckeystore.p12 (Is a directory)` | Remove the mistaken directory: `sudo rm -rf certs/oidckeystore.p12`, fix `certs` ownership if needed (`sudo chown -R "$(id -un):$(id -gn)" certs`), run `./scripts/prepare-oidc-keystore.sh`, then **recreate** Mimoto (see next row)—do not rely on `restart` alone. |
| `mount ... oidckeystore.p12 ... not a directory` / directory vs file | The **container** was created when the host path was a **directory**; you later replaced it with a **file**. `docker compose restart` can fail. Run: `docker compose rm -f mimoto-service` then `docker compose up -d mimoto-service` (or `docker compose up -d --force-recreate mimoto-service`). |
| Mimoto fails (other) | Confirm `oidckeystore.p12` is a file; password matches `oidc_p12_password` in compose; `docker compose logs mimoto-service`. |
| **502 Bad Gateway** from nginx on **8091** (`Faithfully yours, nginx`) | Nginx cannot reach Certify. Check **`docker compose logs certify-nginx`** for **`connect() failed (111: Connection refused)`** → Certify is **down** or still starting. Then **`docker compose logs certify`**: if you see **`Application run failed`** / **`No such alias`** (KER-KMA-004), Postgres **key metadata** and **`data/CERTIFY_PKCS12`** are out of sync — run **`docker compose down -v`** and **`docker compose up -d`** (resets DB + local keystore volume; destructive). |
| `unknown_error` / `NoClassDefFoundError: kotlin/text/HexExtensionsKt` | **Nimbus JOSE JWT 10.x** needs **Kotlin stdlib ≥ 1.9** (that class is not in 1.8.x). Rebuild the local Certify image after pulling `certify-service/pom.xml` fixes: `docker compose build certify && docker compose up -d certify`. |
| `invalid_proof` / proof JWT parsing | Check Certify logs for **`JWT proof verification failed`**. Common: proof JWT **`aud`** must equal **`mosip.certify.identifier`** (with `mosip_certify_domain_url=http://certify-nginx:80` in compose → use **`http://certify-nginx:80`** in the proof, not `http://localhost:8090/.../issuance/credential`). Also ensure **`typ`**: `openid4vci-proof+jwt`, **`nonce`** = `c_nonce` from token response, allowed **`alg`**. |
| Wrong issuer in wallet | Align `mimoto-issuers-config.json` with Certify URLs and nginx hostnames. |

---

## CSV farmer demo (optional)

The main [README.md](../README.md) still documents the **Collab / eSignet + CSV farmer** quickstart for comparison. That path uses different profiles, images, and external auth—not the default in this folder’s `docker-compose.yaml`.

---

## API reference (host)

| URL | Purpose |
|-----|---------|
| `http://localhost:8091/.well-known/openid-credential-issuer` | OpenID4VCI issuer metadata |
| `http://localhost:8091/v1/certify/issuance/credential` | Credential issuance (Bearer access token) |
| `http://localhost:8091/v1/certify/oauth/token` | Token endpoint (pre-auth / client flows per config) |
| `http://localhost:8099/v1/mimoto/...` | Mimoto BFF routes (see Mimoto docs for full list) |
| `http://localhost:3004` | Inji Web |

---

## Related source

- Pre-auth `sub` handling: `certify-service/.../PreAuthorizedCodeService.java`
- Compose: `docker-compose/docker-compose-injistack/docker-compose.yaml`
