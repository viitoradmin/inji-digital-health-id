# 02 · Architecture & Components

> A code-level architecture tour. The Mermaid diagrams here are the canonical mental model that the rest of this documentation references.

---

## 2.1 The Big Picture

Inji is best understood as **three loosely coupled subsystems** that talk over standardized protocols.

```mermaid
flowchart LR
    subgraph IssSide["🏛️ Issuer Domain"]
        direction TB
        DB[(Identity DB<br/>Postgres / CSV / IDA)]
        Plug[Data Provider / VCIssuance Plugin]
        IC[Inji Certify Service<br/>Spring Boot 3.2 / Java 21]
        KMS[Key Manager / SoftHSM<br/>PKCS11 + PKCS12]
        IDP[OIDC Authorization Server<br/>Keycloak / eSignet / Auth0]
        Cache[(Redis<br/>nonce + cache)]
        ICDb[(Postgres<br/>credential_config<br/>status_list<br/>ledger)]

        DB --> Plug --> IC
        IDP -.JWKS.-> IC
        IC --> KMS
        IC --> Cache
        IC --> ICDb
    end

    subgraph HolderSide["👤 Holder Domain"]
        direction TB
        IM[Inji Mobile<br/>React Native]
        IW[Inji Web<br/>React]
        MIM[Mimoto<br/>Spring Boot BFF]
        WDB[(Mimoto Postgres)]

        IM <--> MIM
        IW <--> MIM
        MIM --> WDB
    end

    subgraph VerSide["✅ Verifier Domain"]
        direction TB
        SDK[react-inji-verify-sdk<br/>NPM Package]
        IV[Inji Verify Service<br/>Spring Boot]
        VDB[(Verify DB<br/>txns + nonces)]
        RP[Relying Party Web App]

        RP -- "embeds" --> SDK
        SDK <--> IV
        IV --> VDB
    end

    IC <-- "OpenID4VCI" --> MIM
    IC <-- "OpenID4VCI" --> IM
    IM <-- "OpenID4VP" --> IV
    IW <-- "OpenID4VP" --> IV

    classDef issuer fill:#1E40AF,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
    classDef holder fill:#EA580C,stroke:#9A3412,stroke-width:2px,color:#FFFFFF
    classDef verifier fill:#15803D,stroke:#14532D,stroke-width:2px,color:#FFFFFF
    class DB,Plug,IC,KMS,IDP,Cache,ICDb issuer
    class IM,IW,MIM,WDB holder
    class SDK,IV,VDB,RP verifier

    style IssSide fill:#DBEAFE,stroke:#1E40AF,stroke-width:2px,color:#1E3A8A
    style HolderSide fill:#FFEDD5,stroke:#EA580C,stroke-width:2px,color:#9A3412
    style VerSide fill:#DCFCE7,stroke:#15803D,stroke-width:2px,color:#14532D
```

---

## 2.2 Inji Certify — Layered Architecture

Certify follows a strict **four-layer** design with one-way dependencies.

```mermaid
flowchart TB
    subgraph PL[Presentation Layer]
        CC[CredentialController<br/>/credential]
        CFC[CredentialConfigurationController<br/>/credential-configuration]
        SLC[StatusListController<br/>/status-list]
        SIC[CertifySystemInfoController<br/>/system-info]
    end

    subgraph BL[Business Logic Layer · certify-core]
        CS[CredentialService]
        SLCS[StatusListCredentialService]
        AS[AuthorizationService]
        VE[VelocityTemplatingEngine]
        CF[CredentialFactory]
        PGF[ProofGeneratorFactory]
    end

    subgraph IL[Integration Layer · certify-integration-api]
        DPP{{DataProviderPlugin}}
        VIP{{VCIssuancePlugin}}
        KMS[KeyManagerService<br/>kernel-keymanager 1.3.x]
    end

    subgraph DL[Data Layer]
        PG[(PostgreSQL<br/>JPA / Hibernate)]
        RD[(Redis Cache)]
    end

    PL --> BL
    BL --> IL
    BL --> DL

    classDef presentation fill:#DC2626,stroke:#7F1D1D,stroke-width:2px,color:#FFFFFF
    classDef business fill:#2563EB,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
    classDef integration fill:#16A34A,stroke:#14532D,stroke-width:2px,color:#FFFFFF
    classDef data fill:#D97706,stroke:#78350F,stroke-width:2px,color:#FFFFFF

    class CC,CFC,SLC,SIC presentation
    class CS,SLCS,AS,VE,CF,PGF business
    class DPP,VIP,KMS integration
    class PG,RD data

    style PL fill:#FEE2E2,stroke:#DC2626,stroke-width:2px,color:#7F1D1D
    style BL fill:#DBEAFE,stroke:#2563EB,stroke-width:2px,color:#1E3A8A
    style IL fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    style DL fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F
```

### Module dependency

```
certify-integration-api  ← interfaces only (plugins compile against this)
        ▲
certify-core             ← services, repositories, templating
        ▲
certify-service          ← Spring Boot app, controllers, config
        ▲
certify-service-with-plugins  ← optional fat-image variant
```

Plugin JARs never have a compile dependency on `certify-service`. They only depend on `certify-integration-api`. This is what makes them swappable at runtime.

---

## 2.3 Inji Certify — Request Flow (Issuance, DataProvider mode)

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
    participant Nginx
    participant CC as CredentialController
    participant AS as AuthorizationService
    participant CR as CredentialConfigRepo
    participant Plugin as DataProviderPlugin
    participant VE as VelocityTemplatingEngine
    participant PGF as ProofGeneratorFactory
    participant KMS as KeyManagerService
    participant LR as LedgerRepo

    W->>Nginx: POST /v1/certify/credential<br/>(access_token + jwt_proof)
    Nginx->>CC: forward
    CC->>AS: validate access token (JWKS)
    AS-->>CC: ✅ claims (sub, scope, accessTokenHash)
    CC->>CR: find credential_config(scope)
    CR-->>CC: schema + template + signature algo + DID
    CC->>CC: validate jwt_proof (nonce, audience)
    CC->>Plugin: fetchData(identityDetails)
    Plugin-->>CC: JSONObject (claims)
    CC->>VE: merge template + claims
    VE-->>CC: unsigned VC JSON
    CC->>PGF: select proof generator (algo + format)
    PGF->>KMS: sign(payload)
    KMS-->>PGF: signature
    PGF-->>CC: signed VC
    CC->>LR: insert ledger row (if enabled)
    CC-->>W: 200 OK { format, credential }
```

For **VCIssuance** mode the flow is shorter: `CC → VCIssuancePlugin.getVerifiableCredential(...)` returns a *pre-signed* VC, Certify is just an OpenID4VCI proxy.

---

## 2.4 Technology Stack

### 2.4.1 Inji Certify

| Layer | Technology | Version (typical) |
|-------|-----------|-------------------|
| Language | Java | **21 (LTS)** |
| Framework | Spring Boot | **3.2.3** |
| Web | spring-boot-starter-web | 3.2.x |
| Persistence | Spring Data JPA + Hibernate | with HikariCP |
| DB | PostgreSQL | 14+ |
| Cache | Redis | 7.x (alpine) |
| Templating | Apache Velocity | 1.7 + velocity-tools-generic 3.1 |
| JWT/JWS | nimbus-jose-jwt | 9.41.2 |
| Crypto | Google Tink, BouncyCastle | 1.13.0 |
| SD-JWT | sd-jwt | 1.5 |
| HSM client | kernel-keymanager-service | 1.3.0-beta.5 |
| Distributed lock | ShedLock | 6.8.0 |
| Config | Spring Cloud Config | 2023.0.0 |
| JSON-B in Hibernate | hypersistence-utils-hibernate-63 | 3.9.9 |

### 2.4.2 Inji Verify (Service + SDK)

| Layer | Technology |
|-------|-----------|
| Backend service | Spring Boot (Java) |
| SDK | TypeScript + React 18.2.0 |
| Package | `@mosip/react-inji-verify-sdk` |
| QR engine | embedded camera + image upload (PNG/JPG/PDF) |

### 2.4.3 Inji Wallet

| Component | Technology |
|-----------|-----------|
| Inji Mobile | React Native (Android + iOS) |
| Inji Web | React (browser) |
| Mimoto BFF | Spring Boot (Java) |
| Secure Storage | Android Keystore / iOS Keychain |
| Offline share | Tuvali (BLE library) |
| VCI client | `vci-client` library |
| OpenID4VP | `inji-openid4vp-android-kotlin`, `inji-openid4vp-ios-swift` |

---

## 2.5 Cryptographic Algorithms Supported

| Algorithm | Key Type | Format | Notes |
|----------|----------|--------|-------|
| **EdDSA** | Ed25519 | `ldp_vc` (Ed25519Signature2020) | Recommended default, smallest signatures |
| **RS256** | RSA-2048 | `vc+sd-jwt`, `jwt_vc_json` | Universal compatibility |
| **ES256K** | secp256k1 | `vc+sd-jwt` | Ethereum / DID:key compatible |
| **ES256** | P-256 | `vc+sd-jwt`, `mso_mdoc` | FIPS-friendly |

All signing operations route through `KeyManagerService` which abstracts PKCS#12 (file-based) and PKCS#11 (HSM-based, e.g. SoftHSM/Luna/CloudHSM).

---

## 2.6 Database Schema (Certify) — High-Level

```mermaid
%%{init: {'theme':'base', 'themeVariables': {
  'primaryColor': '#2563EB',
  'primaryTextColor': '#FFFFFF',
  'primaryBorderColor': '#1E3A8A',
  'lineColor': '#475569',
  'secondaryColor': '#DBEAFE',
  'tertiaryColor': '#EFF6FF',
  'attributeBackgroundColorOdd': '#F8FAFC',
  'attributeBackgroundColorEven': '#E2E8F0'
}}}%%
erDiagram
    CREDENTIAL_CONFIG ||--o{ STATUS_LIST_CREDENTIAL : "configures"
    STATUS_LIST_CREDENTIAL ||--o{ STATUS_LIST_AVAILABLE_INDICES : "tracks"
    STATUS_LIST_CREDENTIAL ||--o{ CREDENTIAL_STATUS_TRANSACTION : "logs"
    KEY_ALIAS ||--o{ CREDENTIAL_CONFIG : "signs with"
    LEDGER }o--|| CREDENTIAL_CONFIG : "audits"

    CREDENTIAL_CONFIG {
        uuid id
        string credentialType
        string context
        string credentialFormat
        text   vcTemplate
        string signatureAlgo
        string keyManagerAppId
        string keyManagerRefId
        string didUrl
        text   sdClaims
        string scope
    }
    STATUS_LIST_CREDENTIAL {
        uuid id
        text bitstring
        timestamp lastUpdatedAt
    }
    STATUS_LIST_AVAILABLE_INDICES {
        uuid statusListId
        bigint index
        boolean assigned
    }
    CREDENTIAL_STATUS_TRANSACTION {
        uuid id
        uuid statusListId
        bigint index
        string newStatus
        timestamp createdAt
    }
    KEY_ALIAS {
        string appId
        string referenceId
        string keyType
        timestamp expiresAt
    }
    LEDGER {
        uuid id
        string holderSub
        string credentialType
        timestamp issuedAt
        jsonb metadata
    }
```

Initialization scripts live in `db_scripts/mosip_certify/` and are run by `deploy.sh`.

---

## 2.7 Inji Verify — High-Level Architecture

```mermaid
flowchart LR
    subgraph RPApp[Relying Party Web App]
        Comp1[OpenID4VPVerification<br/>React component]
        Comp2[QRCodeVerification<br/>React component]
    end

    subgraph IVSvc[Inji Verify Service]
        AuthReqAPI[/v1/verify/authorize/]
        VPSubAPI[/v1/verify/vp-submission/]
        StatusAPI[/v1/verify/status/]
        Eng[Validation Engine<br/>signature + status]
    end

    Wallet[(Holder Wallet<br/>Inji Mobile or compatible)]

    Comp1 -- "1. start session" --> AuthReqAPI
    AuthReqAPI -- "QR/link" --> Comp1
    Wallet -- "2. scan QR" --> Wallet
    Wallet -- "3. POST vp_token" --> VPSubAPI
    VPSubAPI --> Eng
    Comp1 -- "4. poll" --> StatusAPI
    StatusAPI --> Eng

    Comp2 -- "client-side scan/upload" --> Comp2
    Comp2 -- "delegate verify" --> Eng

    classDef rpClass fill:#7C3AED,stroke:#4C1D95,stroke-width:2px,color:#FFFFFF
    classDef svcClass fill:#15803D,stroke:#14532D,stroke-width:2px,color:#FFFFFF
    classDef walletClass fill:#EA580C,stroke:#9A3412,stroke-width:2px,color:#FFFFFF

    class Comp1,Comp2 rpClass
    class AuthReqAPI,VPSubAPI,StatusAPI,Eng svcClass
    class Wallet walletClass

    style RPApp fill:#EDE9FE,stroke:#7C3AED,stroke-width:2px,color:#4C1D95
    style IVSvc fill:#DCFCE7,stroke:#15803D,stroke-width:2px,color:#14532D
```

Two distinct components in the SDK:

| Component | Use case |
|-----------|---------|
| `OpenID4VPVerification` | Online sharing — generates a QR / deep link; wallet pushes VP to verifier |
| `QRCodeVerification` | Offline / static QR — verifier scans a QR/PDF that *contains* the VC |

---

## 2.8 Inji Wallet — Layered View

```mermaid
flowchart TB
    subgraph UI[UI Layer]
        Screens[Screens · React Native / React]
    end
    subgraph SDK[SDK Layer]
        VCI[vci-client<br/>OpenID4VCI flows]
        OID4VP[inji-openid4vp<br/>Kotlin / Swift / TS]
        Tuvali[Tuvali<br/>BLE share]
        PXP[PixelPass<br/>compact QR encoding]
        FM[Face Match]
        SK[Secure Keystore<br/>Android Keystore / iOS Keychain]
        Tele[Telemetry]
    end
    subgraph BFF[Mimoto BFF]
        IssReg[Issuer registry]
        VerReg[Trusted verifiers]
        OIDCClient[OIDC client onboarder]
    end

    UI --> SDK
    SDK --> BFF

    classDef uiClass fill:#DB2777,stroke:#831843,stroke-width:2px,color:#FFFFFF
    classDef sdkClass fill:#0891B2,stroke:#164E63,stroke-width:2px,color:#FFFFFF
    classDef bffClass fill:#7C3AED,stroke:#4C1D95,stroke-width:2px,color:#FFFFFF

    class Screens uiClass
    class VCI,OID4VP,Tuvali,PXP,FM,SK,Tele sdkClass
    class IssReg,VerReg,OIDCClient bffClass

    style UI fill:#FCE7F3,stroke:#DB2777,stroke-width:2px,color:#831843
    style SDK fill:#CFFAFE,stroke:#0891B2,stroke-width:2px,color:#164E63
    style BFF fill:#EDE9FE,stroke:#7C3AED,stroke-width:2px,color:#4C1D95
```

Each SDK below the wallet is an independent library you can use in your own non-Inji wallet:

- `vci-client` for OpenID4VCI flows
- `inji-openid4vp-android-kotlin` / `inji-openid4vp-ios-swift` for OpenID4VP wallet-side
- `tuvali` for BLE-based offline VC presentation
- `pixelpass` for compact QR encoding
- `secure-keystore` for native secure storage abstractions

---

## 2.9 Mimoto — What It Does

Mimoto is the **Backend-for-Frontend** that sits between Inji Web/Mobile and any number of issuers. It hides:

- OIDC client onboarding details (P12 keystores, partner keys)
- Multiple issuer well-known endpoints
- Wallet binding (BPP keys)
- Optional Google / social login for Inji Web

```
Inji Web/Mobile ⇄ Mimoto ⇄ [Issuer A, Issuer B, Issuer C, …]
```

Why does this matter? Because **you can run Mimoto and Inji Web alone, point them at *your* Certify (or even a third-party OpenID4VCI issuer), and skip Inji Mobile entirely.** That decoupling is by design.

---

## 2.10 Deployment Topologies

```mermaid
flowchart TB
    subgraph Local["💻 Local Dev (Docker Compose)"]
        L1[certify-service]
        L2[certify-nginx :8091]
        L3[(postgres :5433)]
        L4[(redis :6379)]
        L5[mimoto :8099]
        L6[inji-web :3004]
        L7[inji-verify :8095]
    end

    subgraph K8s["☸️ Production (Kubernetes + Helm)"]
        K1[certify-service ReplicaSet]
        K2[ConfigMap + Secret]
        K3[Spring Cloud Config Server]
        K4[(Managed Postgres)]
        K5[(Managed Redis)]
        K6[HSM Service<br/>SoftHSM / Luna / KMS]
        K7[Ingress + TLS]
    end

    Local -. promote .-> K8s

    classDef localClass fill:#0891B2,stroke:#164E63,stroke-width:2px,color:#FFFFFF
    classDef k8sClass fill:#7C3AED,stroke:#4C1D95,stroke-width:2px,color:#FFFFFF

    class L1,L2,L3,L4,L5,L6,L7 localClass
    class K1,K2,K3,K4,K5,K6,K7 k8sClass

    style Local fill:#CFFAFE,stroke:#0891B2,stroke-width:2px,color:#164E63
    style K8s fill:#EDE9FE,stroke:#7C3AED,stroke-width:2px,color:#4C1D95
```

| Environment | Image |
|-------------|-------|
| Demo / dev | `mosipid/inji-certify-with-plugins:<version>` (bundles plugins) |
| Production | `mosipid/inji-certify:<version>` + custom plugin JARs mounted into `loader_path` |

Detailed setup is in [04 · Sample Setup](./04-Sample-Setup-Guide.md) and [15 · Deployment Guide](./15-Deployment-Guide.md).

---

## 2.11 Where to Look in the Source Tree

| You want to change … | Open this folder |
|----------------------|------------------|
| Issuer metadata / well-known | `certify-service/src/main/java/io/mosip/certify/controller/CertifyWellKnownController.java` |
| Credential issuance endpoint | `certify-service/.../controller/CredentialController.java` |
| Template processing | `certify-service/.../vcformatters/VelocityTemplatingEngineImpl.java` |
| Token validation | `certify-service/.../services/AuthorizationServiceImpl.java` |
| Plugin contracts | `certify-integration-api/src/main/java/io/mosip/certify/api/spi/` |
| Status list (revocation) | `certify-core/.../core/services/StatusListCredentialService*` |
| Default properties | `certify-service/src/main/resources/application-default.properties` |
| Docker config | `docker-compose/docker-compose-injistack/` |
| Helm charts | `helm/inji-certify/` |
| SQL migrations | `db_scripts/mosip_certify/` and `db_upgrade_script/` |

Detailed module walkthrough: [05 · Codebase Exploration](./05-Codebase-Exploration.md).

---

## 2.12 Architectural Decisions Worth Knowing

1. **Spring Boot 3 + Java 21** is non-negotiable. Plugins must compile to Java 21 bytecode or lower.
2. **`hibernate.ddl-auto=none`** — schema is managed by SQL scripts in `db_scripts/`. Don't expect Hibernate to migrate for you.
3. **JWT proofs are mandatory** for the OpenID4VCI `/credential` call. The wallet must produce a `jwt` proof bound to a one-time `c_nonce`.
4. **Templates are Velocity, stored in DB.** Editing a template is a SQL update, not a code change.
5. **Status lists are GZIP+base64url-encoded bitstrings** per W3C BSL v1.0, signed and re-signed by a scheduled batch job (`StatusListUpdateBatchJob` with `@SchedulerLock`).
6. **Plugin loading is classpath-scan based**, controlled by `mosip.certify.integration.scan-base-package`.

---

## 2.13 What's Next

Continue to **[03 · Sandbox Exploration](./03-Sandbox-Exploration.md)** to see all this running on MOSIP's public Collab environment without installing anything.
