# 10 · Platform Integration Strategies

> **How do we drop Inji into an architecture that already exists?**
> This chapter answers that question with a catalogue of integration patterns. Each pattern has a Mermaid diagram, a "use when" rule, the trade-offs, and the wiring touch-points.

---

## 10.1 First Principles

Before choosing a pattern, internalise three facts about the Inji stack:

1. **Inji speaks standards on its edges.** Certify exposes **OpenID4VCI**, Verify exposes **OpenID4VP**, both protected by **OAuth2**. The bus between Inji and the rest of your platform is HTTPS + standard tokens — *not* a proprietary SDK.
2. **Inji is stateless at the API boundary.** Certify keeps short-lived caches (transactions, c_nonces) in Redis but does not own user identity, KYC state, or business workflow. Your platform owns those.
3. **Inji is composable.** You can adopt Certify alone, Verify alone, or the Wallet alone (see [./08-Modularity-Aspects.md](./08-Modularity-Aspects.md)). Pick the smallest footprint that meets the use-case.

These three facts mean the integration question is really *"where do I terminate the OpenID4VCI/VP boundary?"* and *"who owns the user-facing surfaces?"*

---

## 10.2 The Integration Spectrum

```mermaid
flowchart LR
    A[Use Hosted<br/>Sandbox] --> B[Embed Verify<br/>SDK Only]
    B --> C[Run Certify<br/>as Black Box]
    C --> D[Sidecar<br/>Co-deploy]
    D --> E[BFF Wrap<br/>Pattern]
    E --> F[Deep Fork<br/>+ Custom Plugins]

    classDef light fill:#15803D,stroke:#14532D,stroke-width:2px,color:#FFFFFF
    classDef mid fill:#D97706,stroke:#78350F,stroke-width:2px,color:#FFFFFF
    classDef deep fill:#DC2626,stroke:#7F1D1D,stroke-width:2px,color:#FFFFFF

    class A,B light
    class C,D mid
    class E,F deep

    linkStyle default stroke:#475569,stroke-width:2px
```

| Pattern | Effort | Customisation Ceiling | Operational Burden |
|--------|--------|----------------------|--------------------|
| Hosted sandbox | Hours | Very low | None |
| Verify SDK only | Days | Medium | Low (run a small verify service) |
| Certify as black box | Days | Medium | Medium (one service + DB + Redis) |
| Sidecar | 1–2 weeks | High | Medium-high |
| BFF wrap | 2–4 weeks | Very high | High |
| Deep fork + plugins | Weeks | Unlimited | High |

Pick the pattern that matches what the use-case actually needs, not the most "complete" one. Most successful production integrations sit at **Pattern 3 (Certify as black box) + Pattern 2 (Verify SDK)**.

---

## 10.3 Pattern 1 — Hosted Sandbox Pass-Through (Prototype)

```mermaid
flowchart LR
    UA[Your<br/>UI] -- redirect --> ES[Collab<br/>eSignet]
    ES -- token --> IC[Collab<br/>Inji Certify]
    IC -- VC --> IW[Inji Web<br/>collab]
    UA -. embed .-> IW

    classDef yourClass fill:#DB2777,stroke:#831843,stroke-width:2px,color:#FFFFFF
    classDef idpClass fill:#D97706,stroke:#78350F,stroke-width:2px,color:#FFFFFF
    classDef issuerClass fill:#2563EB,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
    classDef walletClass fill:#7C3AED,stroke:#4C1D95,stroke-width:2px,color:#FFFFFF

    class UA yourClass
    class ES idpClass
    class IC issuerClass
    class IW walletClass

    linkStyle default stroke:#475569,stroke-width:2px
```

**Use when:** demos, hackathons, internal stakeholder showcases. Not for any real PII.

**Cost:** zero. **Steps:** see [./03-Sandbox-Exploration.md](./03-Sandbox-Exploration.md).

**Why this is still useful even in production planning:** it lets a product team experience the full holder–issuer–verifier loop *before* committing to any plumbing. We strongly recommend running this exercise at kick-off.

---

## 10.4 Pattern 2 — Verify SDK Embedded in an Existing App

```mermaid
flowchart LR
    subgraph YourPlatform["Your Platform"]
        FE[React Web App]
        BE[Your Backend]
    end
    subgraph Verify["Inji Verify"]
        IV[inji-verify-service<br/>self-hosted or hosted]
    end
    FE -- "mosip/react-inji-verify-sdk" --> SDK["Verify SDK Component"]
    SDK -- "/vp-request, /vp-result" --> IV
    BE -. "audit log/PII<br/>(optional)" .-> IV

    classDef yourClass fill:#DB2777,stroke:#831843,stroke-width:2px,color:#FFFFFF
    classDef verifyClass fill:#15803D,stroke:#14532D,stroke-width:2px,color:#FFFFFF

    class FE,BE yourClass
    class SDK,IV verifyClass

    style YourPlatform fill:#FCE7F3,stroke:#DB2777,stroke-width:2px,color:#831843
    style Verify fill:#DCFCE7,stroke:#15803D,stroke-width:2px,color:#14532D

    linkStyle default stroke:#475569,stroke-width:2px
```

**Use when:** the platform is *only* a relying party. You don't issue, you just want to accept VCs (e.g. "prove you are 18+" or "prove you hold this certificate").

**Touch-points:**

- `npm install @mosip/react-inji-verify-sdk`
- Stand up `inji-verify-service` (one container, Postgres optional, Redis optional)
- Configure presentation definition / DCQL query on the SDK component
- Receive verification result via callback

Full walk-through in [./12-Inji-Verify-Integration.md](./12-Inji-Verify-Integration.md).

**Key benefit:** zero changes to existing auth/identity flows. The SDK is a *widget*.

---

## 10.5 Pattern 3 — Certify as a Black-Box Issuance Service

```mermaid
flowchart LR
    subgraph YourPlatform["Your Platform"]
        ENROL[Enrolment / KYC App]
        DB[(Source of truth DB)]
        IDP[OIDC IdP<br/>Keycloak / Cognito / Auth0]
    end
    subgraph Inji["Inji Certify"]
        IC[Certify Service<br/>+ DataProvider plugin]
        REDIS[(Redis)]
        PGDB[(Certify Postgres)]
    end
    ENROL --> DB
    ENROL -. login .-> IDP
    IDP -. JWKS .-> IC
    IC -- "JDBC / REST" --> DB
    IC --- REDIS
    IC --- PGDB

    classDef yourClass fill:#DB2777,stroke:#831843,stroke-width:2px,color:#FFFFFF
    classDef idpClass fill:#D97706,stroke:#78350F,stroke-width:2px,color:#FFFFFF
    classDef dbClass fill:#0891B2,stroke:#164E63,stroke-width:2px,color:#FFFFFF
    classDef certifyClass fill:#2563EB,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF

    class ENROL yourClass
    class IDP idpClass
    class DB,REDIS,PGDB dbClass
    class IC certifyClass

    style YourPlatform fill:#FCE7F3,stroke:#DB2777,stroke-width:2px,color:#831843
    style Inji fill:#DBEAFE,stroke:#2563EB,stroke-width:2px,color:#1E3A8A

    linkStyle default stroke:#475569,stroke-width:2px
```

**Use when:** you already have a user database and an identity provider, and want to add VC issuance with minimal blast radius.

**Touch-points:**

| Concern | Where it lives | Notes |
|--------|---------------|-------|
| User authentication | Your IdP | See [./06-Pre-Auth-Flow-Without-eSignet.md](./06-Pre-Auth-Flow-Without-eSignet.md) |
| User data | Your DB / API | Read by a `DataProviderPlugin` (see [./07-Plugins-And-Modules.md](./07-Plugins-And-Modules.md)) |
| VC template | Certify (Velocity) | Versioned in Git, mounted as ConfigMap |
| Signing key | Certify keymanager / HSM | Rotate independently of your platform |
| Wallet | User's own — Inji Mobile, Inji Web, or any OpenID4VCI-compliant wallet | |

**Operational footprint:** one stateless Java service (≈700 MB RAM warm), one Postgres schema, one Redis instance. Add a sidecar plugin JAR if you don't want to bake a custom Docker image.

This pattern is what most adopters end up running. The rest of the chapter assumes you've chosen this and looks at *how* to wire it into a larger landscape.

---

## 10.6 Pattern 4 — Sidecar Co-Deployment

```mermaid
flowchart LR
    subgraph Pod["Kubernetes Pod"]
        APP[Your App Container]
        IC[inji-certify<br/>Sidecar Container]
        APP -- localhost:8090 --> IC
    end
    USER[End User Wallet] -- Ingress --> IC

    classDef yourClass fill:#DB2777,stroke:#831843,stroke-width:2px,color:#FFFFFF
    classDef certifyClass fill:#2563EB,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
    classDef walletClass fill:#7C3AED,stroke:#4C1D95,stroke-width:2px,color:#FFFFFF

    class APP yourClass
    class IC certifyClass
    class USER walletClass

    style Pod fill:#EDE9FE,stroke:#7C3AED,stroke-width:2px,color:#4C1D95

    linkStyle default stroke:#475569,stroke-width:2px
```

**Use when:** the issuing system and Certify share a strong locality requirement (e.g. air-gapped network, latency SLO < 50 ms to DB, regulatory data-residency).

**Why a sidecar over a separate Service:** the data provider plugin can talk to `localhost`, removing network hops and surface area. The price you pay is co-scaling — if the app scales, Certify scales with it.

**Caveat:** sidecar makes sense for *low-throughput, high-isolation* contexts. For high-throughput issuance, deploy Certify as its own horizontally scaled workload (Pattern 3).

---

## 10.7 Pattern 5 — Backend-for-Frontend (BFF) Wrap

```mermaid
%%{init: {'theme':'base', 'themeVariables': {
  'primaryColor': '#2563EB',
  'primaryTextColor': '#FFFFFF',
  'primaryBorderColor': '#1E3A8A',
  'lineColor': '#475569',
  'secondaryColor': '#F1F5F9',
  'tertiaryColor': '#E2E8F0',
  'actorBkg': '#2563EB',
  'actorTextColor': '#FFFFFF',
  'actorBorder': '#1E3A8A',
  'signalColor': '#1E293B',
  'signalTextColor': '#1E293B',
  'noteBkgColor': '#FEF3C7',
  'noteTextColor': '#78350F',
  'noteBorderColor': '#D97706',
  'activationBkgColor': '#DBEAFE',
  'activationBorderColor': '#2563EB',
  'sequenceNumberColor': '#FFFFFF'
}}}%%
sequenceDiagram
    autonumber
    participant W as Wallet
    participant BFF as Your BFF
    participant IC as Inji Certify
    participant DB as Your DB

    W->>BFF: GET /credentials/{type}/offer
    BFF->>DB: lookup user, eligibility
    BFF->>IC: POST /credential-offer (pre-auth code)
    IC-->>BFF: credential_offer URI
    BFF-->>W: deep-link / QR
    W->>IC: OpenID4VCI flow (token, credential)
    IC->>BFF: (optional) callback for audit
```

**Use when:**
- You need to **decorate or restrict** the OpenID4VCI surface (rate-limit per user, add captcha, custom error messages).
- You want to **hide Certify** behind your existing API gateway and never expose it directly.
- The wallet you support is **your own** (so you can call non-standard endpoints).

**Concrete examples:**
- Mimoto itself is a BFF in front of Certify for the Inji wallets. See [./13-Inji-Wallet-Integration.md](./13-Inji-Wallet-Integration.md).
- An education-board portal that issues "transcript credentials" to students might wrap Certify so that the offer URL embeds the student's portal session id.

**Risk:** if you intercept too aggressively, you break standards compliance. Keep the **token + credential endpoint** spec-conformant and pre-shape only the *offer creation* and *result delivery* edges.

---

## 10.8 Pattern 6 — Deep Fork + Custom Plugins

```mermaid
flowchart LR
    G[github.com/inji/inji-certify] -- fork --> F[your-org/inji-certify]
    F -- adds --> P1[Custom DataProvider Plugin]
    F -- adds --> P2[Custom VCFormatter]
    F -- adds --> P3[Custom Signer / HSM driver]
    F --> IMG[Your Docker Image]

    classDef upstreamClass fill:#15803D,stroke:#14532D,stroke-width:2px,color:#FFFFFF
    classDef forkClass fill:#DC2626,stroke:#7F1D1D,stroke-width:2px,color:#FFFFFF
    classDef extClass fill:#D97706,stroke:#78350F,stroke-width:2px,color:#FFFFFF
    classDef imgClass fill:#7C3AED,stroke:#4C1D95,stroke-width:2px,color:#FFFFFF

    class G upstreamClass
    class F forkClass
    class P1,P2,P3 extClass
    class IMG imgClass

    linkStyle default stroke:#475569,stroke-width:2px
```

**Use when:**
- You need a VC format not yet supported (custom CBOR profile, ZK-credential, BBS+).
- You need a signing path through a non-PKCS#11 HSM that the upstream keymanager doesn't yet wrap.
- You need to remove modules for a compliance footprint (e.g. strip out all non-mDL code paths).

**Cost:** ongoing rebase / merge effort against upstream releases. Budget time for this.

**Mitigation:** keep changes inside the **plugin module** as much as possible (see [./07-Plugins-And-Modules.md](./07-Plugins-And-Modules.md)). Anything you can do as a plugin should *not* be a fork.

---

## 10.9 Choosing Between Patterns — A Decision Matrix

```mermaid
flowchart TD
    Q1{Do you<br/>issue VCs?}
    Q1 -- No --> P2[Pattern 2:<br/>Verify SDK]
    Q1 -- Yes --> Q2{Is data source<br/>standardish?}
    Q2 -- Yes --> Q3{Do you need to<br/>shape the offer?}
    Q3 -- No --> P3[Pattern 3:<br/>Black Box]
    Q3 -- Yes --> P5[Pattern 5:<br/>BFF Wrap]
    Q2 -- No --> Q4{Can the<br/>complexity live<br/>in a plugin?}
    Q4 -- Yes --> P3p[Pattern 3 +<br/>Custom Plugin]
    Q4 -- No --> P6[Pattern 6:<br/>Deep Fork]

    classDef decision fill:#D97706,stroke:#78350F,stroke-width:2px,color:#FFFFFF
    classDef verifyAnswer fill:#15803D,stroke:#14532D,stroke-width:2px,color:#FFFFFF
    classDef issuerAnswer fill:#2563EB,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
    classDef bffAnswer fill:#7C3AED,stroke:#4C1D95,stroke-width:2px,color:#FFFFFF
    classDef forkAnswer fill:#DC2626,stroke:#7F1D1D,stroke-width:2px,color:#FFFFFF

    class Q1,Q2,Q3,Q4 decision
    class P2 verifyAnswer
    class P3,P3p issuerAnswer
    class P5 bffAnswer
    class P6 forkAnswer

    linkStyle default stroke:#475569,stroke-width:2px
```

---

## 10.10 Identity Boundary — Where Your IdP Meets Certify

Whichever pattern you pick, the **identity boundary** is the same: an OAuth2 access token issued by an OIDC provider you control, validated by Certify against your JWKS endpoint.

```mermaid
%%{init: {'theme':'base', 'themeVariables': {
  'primaryColor': '#2563EB',
  'primaryTextColor': '#FFFFFF',
  'primaryBorderColor': '#1E3A8A',
  'lineColor': '#475569',
  'secondaryColor': '#F1F5F9',
  'tertiaryColor': '#E2E8F0',
  'actorBkg': '#2563EB',
  'actorTextColor': '#FFFFFF',
  'actorBorder': '#1E3A8A',
  'signalColor': '#1E293B',
  'signalTextColor': '#1E293B',
  'noteBkgColor': '#FEF3C7',
  'noteTextColor': '#78350F',
  'noteBorderColor': '#D97706',
  'activationBkgColor': '#DBEAFE',
  'activationBorderColor': '#2563EB',
  'sequenceNumberColor': '#FFFFFF'
}}}%%
sequenceDiagram
    autonumber
    participant U as User
    participant App as Your App
    participant IdP as Your IdP
    participant IC as Inji Certify

    U->>App: Initiate "Get my credential"
    App->>IdP: Auth Code request (PKCE)
    IdP-->>App: id_token + access_token
    App->>IC: POST /token (or use offer pre-auth code)
    IC->>IdP: GET /.well-known/jwks.json
    IdP-->>IC: JWKS
    IC->>IC: Verify token signature, scope, audience
    IC-->>App: c_nonce, then credential endpoint
```

Properties to set (all detailed in [./06-Pre-Auth-Flow-Without-eSignet.md](./06-Pre-Auth-Flow-Without-eSignet.md)):

```properties
mosip.certify.authorization.url=https://idp.example.com
mosip.certify.authn.issuer-uri=https://idp.example.com/realms/inji
mosip.certify.authn.jwk-set-uri=https://idp.example.com/realms/inji/protocol/openid-connect/certs
mosip.certify.identifier=https://certify.example.com
mosip.certify.domain.url=https://certify.example.com
```

---

## 10.11 Data Boundary — Where Your Data Meets Certify

The data boundary is owned by the **`DataProviderPlugin`** you write. The plugin is the *only* code that talks to your databases or APIs.

```mermaid
flowchart LR
    subgraph Plugin["Your Plugin JAR"]
        DP["fetchData()"] --> CACHE[Optional<br/>per-request cache]
    end
    subgraph Source["Your Systems"]
        API[REST API]
        DB[(DB)]
        FILE[CSV / file]
        EVT[Event Bus]
    end
    DP --- API
    DP --- DB
    DP --- FILE
    DP --- EVT
    DP -- map --> CTX[VC template context]

    classDef pluginClass fill:#2563EB,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
    classDef restClass fill:#DB2777,stroke:#831843,stroke-width:2px,color:#FFFFFF
    classDef dbClass fill:#0891B2,stroke:#164E63,stroke-width:2px,color:#FFFFFF
    classDef eventClass fill:#D97706,stroke:#78350F,stroke-width:2px,color:#FFFFFF
    classDef outClass fill:#15803D,stroke:#14532D,stroke-width:2px,color:#FFFFFF

    class DP,CACHE pluginClass
    class API restClass
    class DB,FILE dbClass
    class EVT eventClass
    class CTX outClass

    style Plugin fill:#DBEAFE,stroke:#2563EB,stroke-width:2px,color:#1E3A8A
    style Source fill:#FCE7F3,stroke:#DB2777,stroke-width:2px,color:#831843

    linkStyle default stroke:#475569,stroke-width:2px
```

Patterns for each kind of source are catalogued in [./09-External-Data-Sources.md](./09-External-Data-Sources.md).

**Rule of thumb:** the plugin should be *narrow* — fetch claims, map them, return. Do not put business logic in the plugin; keep that upstream where it can be unit-tested independently.

---

## 10.12 Network Boundary — Gateway, mTLS, and Token Audience

Whether Certify is behind your existing API gateway, an Ingress, or directly exposed, three rules hold:

1. **Terminate TLS at one well-known place.** Certify itself can run with HTTP inside the cluster; let the gateway / Ingress handle TLS and cipher suites.
2. **Set token audience explicitly.** The `mosip.certify.identifier` property must equal the `aud` claim your IdP puts in the access token. Mismatched audiences are the #1 cause of "401 invalid_token" in production.
3. **Use mTLS for plugin → backend traffic** if your data plane is sensitive. Most JDBC drivers and HTTP clients support it; the plugin holds the keystore reference.

```mermaid
flowchart LR
    Wallet -->|HTTPS| GW[API Gateway<br/>terminates TLS]
    GW -->|HTTP, internal| IC[Inji Certify]
    IC -->|mTLS| API[Your Internal API]
    IC -->|TLS / IAM auth| DB[(Your DB)]

    classDef walletClass fill:#7C3AED,stroke:#4C1D95,stroke-width:2px,color:#FFFFFF
    classDef gatewayClass fill:#D97706,stroke:#78350F,stroke-width:2px,color:#FFFFFF
    classDef certifyClass fill:#2563EB,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
    classDef apiClass fill:#DB2777,stroke:#831843,stroke-width:2px,color:#FFFFFF
    classDef dbClass fill:#0891B2,stroke:#164E63,stroke-width:2px,color:#FFFFFF

    class Wallet walletClass
    class GW gatewayClass
    class IC certifyClass
    class API apiClass
    class DB dbClass

    linkStyle default stroke:#475569,stroke-width:2px
```

---

## 10.13 Multi-Tenancy

Certify is **single-tenant per deployment** today. For multi-tenant scenarios you have three options:

| Strategy | How | Trade-off |
|---------|-----|-----------|
| **Deployment per tenant** | One namespace + DB + keys per tenant | Cleanest isolation, highest cost |
| **Issuer per tenant inside one deployment** | Configure multiple `issuerMetadata` entries and route by path; plugin reads tenant header | Lowest cost, needs careful tenant scoping in plugin |
| **Shared deployment, tenant in claims** | One issuer, encode tenant inside the credential subject | Only fits if downstream consumers treat tenants uniformly |

For programmes serving many small relying parties, deployment-per-tenant (Strategy 1) is the safest default. Use a GitOps pattern (Argo CD / Flux) to keep the explosion manageable.

---

## 10.14 Observability and Audit

Inji emits standard Spring Boot / Actuator endpoints. Wire them into your observability stack:

```mermaid
flowchart LR
    IC[Inji Certify] -- "/actuator/prometheus" --> PROM[Prometheus]
    IC -- "JSON logs" --> LOKI[Loki / ELK]
    IC -- "OTel exporter" --> OTEL[OpenTelemetry Collector]
    PROM --> GRAF[Grafana]
    LOKI --> GRAF
    OTEL --> JAEGER[Jaeger / Tempo]

    classDef certifyClass fill:#2563EB,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
    classDef collectorClass fill:#0891B2,stroke:#164E63,stroke-width:2px,color:#FFFFFF
    classDef vizClass fill:#15803D,stroke:#14532D,stroke-width:2px,color:#FFFFFF

    class IC certifyClass
    class PROM,LOKI,OTEL collectorClass
    class GRAF,JAEGER vizClass

    linkStyle default stroke:#475569,stroke-width:2px
```

Minimum metrics to alert on:
- `http_server_requests_seconds{uri="/credential",status="5xx"}` — issuance failure rate
- Token endpoint 4xx burst — possible attack or misconfigured client
- Plugin invocation latency p95 — your data source is slow
- Redis connection failures — nonces become unusable, transactions fail

For audit logging, prefer to emit a domain event (e.g. `credential.issued`) from a plugin extension point or BFF wrapper. Do not parse application logs for audit — it's fragile and misses async paths.

See operational details in [./15-Deployment-Guide.md](./15-Deployment-Guide.md).

---

## 10.15 Anti-Patterns to Avoid

| Anti-pattern | Why it hurts |
|-------------|--------------|
| Treating Certify like a CRUD service | It's an OAuth2 resource server; calls are protocol-driven. Trying to "POST a VC directly" misses the entire offer flow. |
| Sharing the Certify DB with your app | The schema is internal and changes between versions. Read from a plugin instead. |
| Putting business logic in Velocity templates | Templates are formatters, not validators. Filter eligibility in the plugin. |
| Using a single signing key forever | Rotate. Use `kid`s. Publish DIDs so verifiers can resolve old keys. |
| Forking just to add a config property | 95 % of "I need to change Certify" reduces to a plugin or a property override. |

---

## 10.16 What's Next

The next chapter goes deep on the **shape** of the credential itself — JSON-LD vs SD-JWT vs mDoc, Velocity template authoring, and signing algorithm trade-offs.

➡️ **[11 · VC Formats & Implementations](./11-VC-Formats-and-Implementations.md)**
