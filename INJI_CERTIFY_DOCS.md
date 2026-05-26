# Inji Certify — Complete Architecture & Developer Guide
### Written for FastAPI developers who are new to Spring Boot

---

## Table of Contents

1. [What is this project?](#1-what-is-this-project)
2. [The Big Picture — What does it DO?](#2-the-big-picture--what-does-it-do)
3. [Spring Boot vs FastAPI — Key Mental Model Shifts](#3-spring-boot-vs-fastapi--key-mental-model-shifts)
4. [Project Layout — Multi-Module Maven](#4-project-layout--multi-module-maven)
5. [Layer-by-Layer Architecture](#5-layer-by-layer-architecture)
6. [Domain Concepts — Verifiable Credentials](#6-domain-concepts--verifiable-credentials)
7. [Security & Auth — OAuth 2.0 + JWT](#7-security--auth--oauth-20--jwt)
8. [The Plugin System](#8-the-plugin-system)
9. [Credential Formats — The Three Types](#9-credential-formats--the-three-types)
10. [Complete Request Flows (with diagrams)](#10-complete-request-flows-with-diagrams)
11. [Configuration System](#11-configuration-system)
12. [Database & Entities](#12-database--entities)
13. [Caching Strategy](#13-caching-strategy)
14. [Key Files Quick Reference](#14-key-files-quick-reference)

---

## 1. What is this project?

**Inji Certify** is a **Verifiable Credential Issuer** — a backend service that issues digital identity credentials (like a digital driving license, vaccination certificate, or voter ID) in cryptographically signed, tamper-proof formats.

Think of it like a government department that issues official documents, except:
- Documents are JSON/CBOR objects, not paper
- They are cryptographically signed (impossible to fake)
- They follow open international standards (OpenID for Verifiable Credentials — OID4VC)
- A wallet app (like Inji Wallet) can store them on your phone

This is part of **MOSIP** (Modular Open Source Identity Platform), an open-source national ID system used by countries for their digital identity programs.

---

## 2. The Big Picture — What does it DO?

```
┌─────────────────────────────────────────────────────────────────────┐
│                          INJI CERTIFY                               │
│                                                                     │
│  1. A person proves their identity                                  │
│  2. The system fetches their data from a data source               │
│  3. It packages the data into a signed digital credential           │
│  4. The wallet app receives and stores this credential              │
│  5. The person can later SHOW this credential to a verifier         │
└─────────────────────────────────────────────────────────────────────┘

Real-world example:
  Person → "I want my digital driving license"
  System → authenticates them, fetches their license data
  System → signs a JSON document: {"name":"John","licenseNo":"DL123","expires":"2030-01-01"}
  Wallet → stores the signed JSON
  Police officer → scans the credential → verifies the signature → trusts the document
```

---

## 3. Spring Boot vs FastAPI — Key Mental Model Shifts

This section translates every Spring Boot concept to its FastAPI/Python equivalent.

### 3.1 Dependency Injection (DI) — The biggest difference

**FastAPI way** — you import things directly or use `Depends()`:
```python
# Python / FastAPI
class UserService:
    def __init__(self, db: Session = Depends(get_db)):
        self.db = db
```

**Spring Boot way** — Spring creates all objects and "injects" them automatically:
```java
// Java / Spring Boot
@Service                           // "I am a service, manage me"
public class VCIssuanceServiceImpl {

    @Autowired                     // "Spring, give me this object"
    private VCICacheService cacheService;

    @Autowired
    private CredentialFactory credentialFactory;
}
```

Spring Boot has an **IoC Container** (Inversion of Control). You never call `new VCIssuanceServiceImpl()`. Spring creates it for you, fills in all `@Autowired` fields, and gives it to whoever needs it. It's like FastAPI's `Depends()` but applied to the whole application.

### 3.2 Annotations — "Decorators on steroids"

FastAPI uses Python decorators (`@app.get`, `@app.post`). Spring Boot uses Java annotations — same idea, different syntax:

| FastAPI Python | Spring Boot Java | What it does |
|---|---|---|
| `@app.get("/path")` | `@GetMapping("/path")` | HTTP GET endpoint |
| `@app.post("/path")` | `@PostMapping("/path")` | HTTP POST endpoint |
| `class UserService:` | `@Service class UserService {}` | Marks as a managed service |
| `class UserRepo:` | `@Repository class UserRepo {}` | Marks as a data access layer |
| `@app.on_event("startup")` | `@PostConstruct` | Runs after object creation |
| `BaseModel` (Pydantic) | `@Entity class User {}` | Database model |
| Pydantic `BaseModel` (DTO) | `@Data class UserDTO {}` | Data transfer object |

### 3.3 Entry Point

**FastAPI:**
```python
app = FastAPI()
uvicorn.run(app, host="0.0.0.0", port=8080)
```

**Spring Boot:**
```java
@SpringBootApplication          // enables everything
@EnableAsync                    // enables async processing
@EnableCaching                  // enables caching
public class CertifyServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CertifyServiceApplication.class, args);
        // Spring starts embedded Tomcat server automatically
    }
}
```

### 3.4 Configuration

**FastAPI** uses Pydantic `BaseSettings` / `.env` files.

**Spring Boot** uses `application.properties` or `application.yml`:
```properties
# application-local.properties
spring.datasource.url=jdbc:postgresql://localhost:5432/certify_db
server.port=8080
mosip.certify.access-token-expire-seconds=3600
```

Values are injected into code:
```java
@Value("${mosip.certify.access-token-expire-seconds}")
private long accessTokenExpireSeconds;    // Spring reads from properties file
```

### 3.5 Database Access (JPA vs SQLAlchemy)

| FastAPI (SQLAlchemy) | Spring Boot (JPA/Hibernate) |
|---|---|
| `class User(Base)` | `@Entity class User {}` |
| `Column(String)` | `@Column private String name;` |
| `Session.query(User).all()` | `userRepository.findAll()` |
| Manual session management | Automatic transaction management |

In Spring Boot you define a **Repository interface** and Spring generates all SQL automatically:
```java
// You write this interface — Spring generates the implementation
public interface LedgerRepository extends JpaRepository<Ledger, String> {
    // Spring generates: SELECT * FROM ledger WHERE credential_id = ?
    Optional<Ledger> findByCredentialId(String credentialId);
}
```

### 3.6 Exception Handling

**FastAPI:**
```python
@app.exception_handler(ValidationError)
async def validation_handler(request, exc):
    return JSONResponse(status_code=422, content={"error": str(exc)})
```

**Spring Boot:**
```java
@RestControllerAdvice           // applies to all controllers
public class ExceptionHandlerAdvice {
    @ExceptionHandler(CertifyException.class)
    public ResponseEntity<ErrorResponse> handleCertifyException(CertifyException ex) {
        return ResponseEntity.badRequest().body(new ErrorResponse(ex.getErrorCode()));
    }
}
```
File: `certify-service/.../advice/ExceptionHandlerAdvice.java`

---

## 4. Project Layout — Multi-Module Maven

Maven is Spring Boot's build tool (like Python's `pip` + `setuptools` + `pyproject.toml` combined).

```
inji-certify/                           ← Root project (parent pom.xml)
│
├── pom.xml                             ← Parent build config (like pyproject.toml)
│                                          Defines: Java 21, Spring Boot 3.2.3
│                                          Declares 3 child modules
│
├── certify-core/                       ← MODULE 1: Shared interfaces & DTOs
│   └── src/main/java/io/mosip/certify/core/
│       ├── config/                     ← Cache config (Redis / Simple)
│       ├── constants/                  ← All constant values (error codes, VC format names)
│       ├── dto/                        ← Data Transfer Objects (like Pydantic models)
│       ├── exception/                  ← Custom exception classes
│       └── spi/                        ← Service interfaces (contracts)
│
├── certify-integration-api/            ← MODULE 2: Plugin contracts
│   └── src/main/java/io/mosip/certify/api/spi/
│       ├── AuditPlugin.java            ← Interface: "how to log audit events"
│       ├── VCIssuancePlugin.java       ← Interface: "how to get user's credential data"
│       └── DataProviderPlugin.java     ← Interface: "how to fetch identity data"
│
└── certify-service/                    ← MODULE 3: Main application (the actual server)
    └── src/main/java/io/mosip/certify/
        ├── CertifyServiceApplication.java   ← Entry point (main() method)
        ├── advice/                          ← Global exception handlers
        ├── config/                          ← Spring Bean configs, Security, CORS
        ├── controller/                      ← REST API endpoints (like FastAPI routers)
        ├── services/                        ← Business logic
        ├── entity/                          ← Database models (JPA @Entity)
        ├── repository/                      ← Database access (JPA repositories)
        ├── credential/                      ← VC format implementations
        ├── proof/                           ← JWT proof validation
        ├── proofgenerators/                 ← Cryptographic signers
        ├── validators/                      ← Request validators
        ├── filter/                          ← HTTP request filters (like middleware)
        ├── utils/                           ← Utility/helper classes
        └── vcformatters/                    ← Velocity template engine
```

**Why 3 modules?**

- `certify-core` — think of it as a shared Python package with Pydantic models and base classes
- `certify-integration-api` — defines **interfaces** that external teams must implement (like abstract base classes in Python). A bank can write their own `VCIssuancePlugin` to connect to their identity database
- `certify-service` — the actual running application

---

## 5. Layer-by-Layer Architecture

Spring Boot enforces a strict layered architecture. Every request flows through these layers:

```
HTTP Request
     │
     ▼
┌──────────────────────────────────────────────┐
│  FILTER LAYER                                │
│  AccessTokenValidationFilter.java            │  ← Like FastAPI middleware
│  (validates JWT before request reaches code) │
└──────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│  CONTROLLER LAYER                            │
│  VCIssuanceController.java                   │  ← Like FastAPI @router
│  OAuthController.java                        │
│  WellKnownController.java                    │
│  PreAuthorizedCodeController.java            │
│  (only handles HTTP: parse request,          │
│   call service, return response)             │
└──────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│  SERVICE LAYER                               │
│  VCIssuanceServiceImpl.java                  │  ← Business logic lives here
│  CertifyIssuanceServiceImpl.java             │
│  PreAuthorizedCodeService.java               │
│  (all business rules, validation,            │
│   orchestration happen here)                 │
└──────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│  REPOSITORY LAYER                            │
│  LedgerRepository.java                       │  ← Database access
│  CredentialConfigRepository.java             │  ← Like SQLAlchemy sessions
│  PersonRecordRepository.java                 │
│  (Spring generates SQL from interface        │
│   method names automatically)                │
└──────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│  DATABASE                                    │
│  PostgreSQL (schema: inji_certify)           │
└──────────────────────────────────────────────┘
```

---

## 6. Domain Concepts — Verifiable Credentials

Before diving deeper into code, you need to understand the domain. This is NOT Spring Boot — this is the **digital identity** domain that the code implements.

### 6.1 Verifiable Credential (VC)

A VC is a JSON document that says: "This person has this attribute, and I (the issuer) cryptographically guarantee it."

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential", "DriversLicense"],
  "issuer": "did:web:gov.in",
  "credentialSubject": {
    "id": "did:example:user123",
    "name": "John Doe",
    "licenseClass": "B",
    "expiryDate": "2030-01-01"
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "verificationMethod": "did:web:gov.in#key-1",
    "proofValue": "z3FXQ..."     ← cryptographic signature
  }
}
```

### 6.2 The Three Parties

```
ISSUER          →   issues credential   →   HOLDER      →   presents credential   →   VERIFIER
(Inji Certify)                          (wallet app)                              (e.g., police officer)
```

### 6.3 OID4VCI (OpenID for Verifiable Credential Issuance)

This is the **protocol** (like REST but more specific) that defines how a wallet app gets credentials from an issuer. Inji Certify implements this spec.

Two flows exist:

**Flow 1 — Pre-Authorized Code Flow** (simpler, used for offline/batch issuance):
```
1. Someone (admin, system) generates a pre-auth code for a specific person
2. The code is shared with the person (QR code, link, etc.)
3. Person scans it with their wallet app
4. Wallet sends the code to Certify → gets an access token
5. Wallet uses access token to request the actual credential
```

**Flow 2 — Authorization Code Flow** (standard OAuth, person authenticates themselves):
```
1. Person opens wallet app, requests a credential
2. Wallet redirects to Certify's auth endpoint
3. Person authenticates (biometrics, OTP, password)
4. Certify issues an authorization code
5. Wallet exchanges code for access token
6. Wallet requests credential with access token
```

### 6.4 DID (Decentralized Identifier)

A DID is a globally unique identifier for an entity (person, organization, device) that is not controlled by any central authority.

```
did:web:issuer.gov.in        ← DID for the issuer
did:jwk:eyJrdhJKL...         ← DID for a user (derived from their public key)
```

The `.well-known/did.json` endpoint serves the **DID Document** — a JSON file that says "here are my public keys that I use for signing."

---

## 7. Security & Auth — OAuth 2.0 + JWT

**File:** `certify-service/.../config/SecurityConfig.java`

Inji Certify acts as an **OAuth 2.0 Resource Server**. This means:
- It does NOT authenticate users itself (no login form)
- It trusts JWTs (tokens) issued by an Authorization Server
- Every sensitive API call must include `Authorization: Bearer <jwt_token>`

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        http
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder()))  // validates the token
            )
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)  // no sessions!
            );
    }
}
```

**FastAPI equivalent:**
```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = jwt.decode(token, SECRET_KEY, algorithms=["RS256"])
    return payload
```

### 7.1 JWT Validation

The system supports three signature algorithms for JWT validation:
- **ES256** (ECDSA with P-256) — most common
- **RS256** (RSA with SHA-256)
- **PS256** (RSA-PSS with SHA-256)

The JWKS endpoint (`.well-known/jwks.json`) publishes the **public keys** so any verifier can validate signatures without contacting the issuer.

### 7.2 Access Token Filter

**File:** `certify-service/.../filter/AccessTokenValidationFilter.java`

This is like FastAPI middleware — it intercepts every request to `/issuance/*` endpoints, extracts the Bearer token, validates it (signature + expiry + scope), and rejects bad requests before they reach the controller.

---

## 8. The Plugin System

This is the most important architectural pattern in Inji Certify. The system is designed so that **anyone can connect their own identity database** without modifying the core code.

### 8.1 The Interfaces (certify-integration-api module)

```java
// VCIssuancePlugin.java — How to get credential data for a user
public interface VCIssuancePlugin {
    
    // For ldp_vc format (JSON-LD with Linked Data Proof)
    JsonLDObject getVerifiableCredentialWithLinkedDataProof(
        VCRequestDto vcRequestDto,
        String holderId,
        Map<String, Object> identityDetails
    ) throws VCIExchangeException;

    // For jwt_vc_json, vc+sd-jwt, mso_mdoc formats
    String getVerifiableCredential(
        VCRequestDto vcRequestDto,
        String holderId,
        Map<String, Object> identityDetails
    ) throws VCIExchangeException;
}
```

```java
// AuditPlugin.java — How to log audit events
public interface AuditPlugin {
    void logAudit(Action action, ActionStatus status, AuditDTO auditDTO, Throwable t);
    void logAudit(String username, Action action, ActionStatus status, AuditDTO auditDTO, Throwable t);
}
```

**Python equivalent (abstract base class):**
```python
from abc import ABC, abstractmethod

class VCIssuancePlugin(ABC):
    @abstractmethod
    def get_verifiable_credential(self, vc_request, holder_id, identity_details) -> str:
        pass
```

### 8.2 How Plugins are Selected

Spring Boot's `@ConditionalOnMissingBean` pattern is used. The application ships with a **mock implementation** that returns test data. If you provide your own implementation, Spring automatically uses yours instead.

Think of it like Python's duck typing: if `MyBankVCPlugin` has all the right methods and is registered, Spring uses it.

**In `application-local.properties`:**
```properties
# Tell Spring which package has the custom plugin
mosip.certify.integration.vci-plugin=io.mosip.mycustom.MyBankVCPlugin
```

### 8.3 Available Integrations

The project documents these production integrations:
- **Sunbird RC** — Open-source registry for public data
- **MOSIP ID** — MOSIP national ID database
- **Mock Plugin** — For development/testing (ships with the code)

---

## 9. Credential Formats — The Three Types

**File:** `certify-service/.../credential/`

Three credential format classes all extend an abstract base `Credential`:

```
Credential (abstract)
├── W3CJsonLD.java         → format: "ldp_vc"        (JSON-LD with cryptographic proof)
├── SDJWT.java             → format: "vc+sd-jwt"     (Selective Disclosure JWT)
└── MDocCredential.java    → format: "mso_mdoc"      (ISO 18013-5, used for mDL)
```

### 9.1 W3CJsonLD — Linked Data Proof

The most verbose and "semantic web" format. Uses JSON-LD contexts. The signature is embedded inside the JSON document as a `proof` field.

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "type": ["VerifiableCredential"],
  "issuer": "did:web:issuer.example.com",
  "credentialSubject": { "name": "Alice" },
  "proof": { "type": "Ed25519Signature2020", "proofValue": "z..." }
}
```

### 9.2 SDJWT — Selective Disclosure JWT

Modern format where the holder can CHOOSE which claims to reveal when presenting. Like showing only your age (over 18?) without revealing your exact birth date.

```
# SD-JWT structure: header.payload.signature~disclosure1~disclosure2
eyJ...header.eyJ...payload.sig~eyJ...disclosure~eyJ...disclosure
```

Each disclosure is a separate Base64-encoded JSON containing one claim. The holder can omit disclosures to hide data.

### 9.3 MDocCredential — Mobile Document (mDoc)

Binary format defined by ISO 18013-5, specifically designed for mobile driving licenses (mDL). Uses CBOR encoding (compact binary) instead of JSON. Signed using COSE (CBOR Object Signing and Encryption).

This is what real mobile driver's licenses use in countries like the US, UK, and Australia.

### 9.4 CredentialFactory — Selecting the Right Format

**File:** `certify-service/.../credential/CredentialFactory.java`

```java
// Simplified concept
@Component
public class CredentialFactory {
    // Spring injects ALL Credential implementations
    @Autowired
    private List<Credential> credentialHandlers;

    public Credential getCredential(String format) {
        // Finds the handler that says "I can handle this format"
        return credentialHandlers.stream()
            .filter(c -> c.canHandle(format))
            .findFirst()
            .orElseThrow();
    }
}
```

**Python equivalent:**
```python
handlers = [W3CJsonLD(), SDJWT(), MDocCredential()]

def get_handler(format: str):
    return next(h for h in handlers if h.can_handle(format))
```

---

## 10. Complete Request Flows (with diagrams)

### Flow A — Pre-Authorized Code Flow (most common)

```
ADMIN/SYSTEM                    INJI CERTIFY                    WALLET APP
     │                               │                               │
     │  POST /pre-authorized-data    │                               │
     │  { "credentialConfigId":      │                               │
     │    "DriversLicense",          │                               │
     │    "claims": {"name": "John"}}│                               │
     ├──────────────────────────────►│                               │
     │                               │ 1. Validate credential config │
     │                               │ 2. Generate pre-auth code     │
     │                               │    (32-char random string)    │
     │                               │ 3. Cache it with claims       │
     │                               │ 4. Build credential offer URI │
     │◄──────────────────────────────┤                               │
     │  { "credential_offer_uri":    │                               │
     │    "openid-credential-offer:  │                               │
     │    //..." }                   │                               │
     │                               │                               │
     │  (Share this URI as QR code)  │                               │
     │                               │                               │
     │                               │  GET /credential-offer-data/  │
     │                               │◄──────────────────────────────┤
     │                               │ Returns offer details          │
     │                               ├──────────────────────────────►│
     │                               │                               │
     │                               │  POST /oauth/token            │
     │                               │  { grant_type:                │
     │                               │    "pre-authorized_code",     │
     │                               │    pre-authorized_code: "..." }│
     │                               │◄──────────────────────────────┤
     │                               │ 1. Look up pre-auth code      │
     │                               │ 2. Verify not expired/used    │
     │                               │ 3. Generate JWT access token  │
     │                               ├──────────────────────────────►│
     │                               │  { "access_token": "eyJ..." } │
     │                               │                               │
     │                               │  POST /issuance/credential    │
     │                               │  Authorization: Bearer eyJ... │
     │                               │  { "format": "ldp_vc",        │
     │                               │    "proof": { "jwt": "..." }} │
     │                               │◄──────────────────────────────┤
     │                               │ 1. Validate JWT access token  │
     │                               │ 2. Validate proof (holder key)│
     │                               │ 3. Fetch user data (plugin)   │
     │                               │ 4. Build credential template  │
     │                               │ 5. Sign credential            │
     │                               │ 6. Store in ledger            │
     │                               ├──────────────────────────────►│
     │                               │  { "credential": { signed VC }}│
```

### Flow B — Code paths in the Service Layer

```
VCIssuanceController.getCredential()
         │
         ▼
VCIssuanceServiceImpl.getCredential()
         │
         ├── 1. Validate access token (scope, expiry)
         │         AccessTokenJwtUtil.validateAccessToken()
         │
         ├── 2. Validate proof (wallet's public key binding)
         │         ProofValidatorFactory → JwtProofValidator
         │
         ├── 3. Determine credential config from token scope
         │         CredentialConfigRepository.findByScope()
         │
         ├── 4. Fetch identity data
         │         DataProviderPlugin.getIdentityData()  ← your plugin
         │
         ├── 5. Select credential format handler
         │         CredentialFactory.getCredential(format)
         │
         ├── 6. Build unsigned credential
         │         credential.createCredential(template, identityData)
         │         (uses Velocity template engine to fill in claims)
         │
         ├── 7. Store issuance record
         │         LedgerRepository.save(ledgerEntry)
         │
         └── 8. Add cryptographic proof
                   credential.addProof(unsignedVC, signingConfig)
                   → Returns signed VC string/object
```

### Flow C — Well-Known Discovery

Wallet apps always start by discovering what an issuer supports:

```
Wallet                          Inji Certify
  │                                  │
  │  GET /.well-known/               │
  │      openid-credential-issuer    │
  ├─────────────────────────────────►│
  │◄─────────────────────────────────┤
  │  {                               │
  │    "credential_issuer": "...",   │
  │    "credentials_supported": [    │
  │      { "format": "ldp_vc",       │
  │        "id": "DriversLicense" }  │
  │    ],                            │
  │    "token_endpoint": "...",      │
  │    "credential_endpoint": "..."  │
  │  }                               │
```

---

## 11. Configuration System

**File:** `certify-service/src/main/resources/application-local.properties`

Spring Boot uses **profiles** to manage environment-specific config. In FastAPI you'd use `.env` files or environment variables.

```
application.properties            ← base config (applies everywhere)
application-local.properties      ← local dev overrides
application-dev.properties        ← dev server config
application-prod.properties       ← production config (not in repo)
```

### Key Configuration Groups

```properties
# ── SERVER ──────────────────────────────────────────────────────────
server.port=8080
server.servlet.context-path=/v1/certify   # all URLs are under /v1/certify

# ── DATABASE ─────────────────────────────────────────────────────────
spring.datasource.url=jdbc:postgresql://localhost:5432/inji_certify
spring.datasource.driver-class-name=org.postgresql.Driver

# ── SECURITY ─────────────────────────────────────────────────────────
# URL of the JWKS endpoint of the Authorization Server (to validate tokens)
spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://auth-server/jwks.json

# ── CACHING ──────────────────────────────────────────────────────────
spring.cache.type=simple         # use "redis" for production
mosip.certify.cache.pre-auth-code.expire-seconds=600
mosip.certify.cache.vc-issuance.expire-seconds=3600

# ── PRE-AUTH FLOW ────────────────────────────────────────────────────
mosip.certify.access-token-expire-seconds=3600
mosip.certify.pre-auth-code-expire-seconds=600

# ── CREDENTIAL CONFIGURATION ─────────────────────────────────────────
# Where the issuer is published
mosip.certify.identifier=https://issuer.example.com

# ── PLUGINS ──────────────────────────────────────────────────────────
mosip.certify.integration.vci-plugin=io.mosip.certify.mock.MockVCIssuancePlugin
mosip.certify.integration.audit-plugin=io.mosip.certify.plugin.impl.LoggerAuditService
```

---

## 12. Database & Entities

**Files:** `certify-service/.../entity/`

JPA `@Entity` = SQLAlchemy `Base` model. Spring auto-creates tables via Hibernate.

### Main Tables

#### `credential_config` — What types of credentials can be issued
```java
@Entity
@Table(name = "credential_config")
public class CredentialConfig {
    @Id
    private String configId;

    private String credentialFormat;          // "ldp_vc", "vc+sd-jwt", "mso_mdoc"
    private String scope;                     // OAuth scope: "DriversLicense"
    private String status;                    // "A" = Active, "I" = Inactive

    @Type(JsonType.class)
    private List<MetaDataDisplay> display;    // UI display info (name, logo, colors)

    @Type(JsonType.class)
    private List<CredentialSubjectParameters> credentialSubject;  // claim definitions
}
```

**What this stores:** The "menu" of credentials this issuer can issue. Each row = one credential type (DriversLicense, VaccinationCert, etc.)

#### `ledger` — Audit trail of every issued credential
```java
@Entity
@Table(name = "ledger")
public class Ledger {
    @Id
    private String credentialId;              // UUID of the issued credential

    private String issuerId;                  // who issued it
    private LocalDateTime issuanceDate;       // when it was issued
    private LocalDateTime expirationDate;     // when it expires

    @Type(JsonType.class)
    private List<CredentialStatusDetail> credentialStatusDetails;  // revocation info

    @Type(JsonType.class)
    private Map<String, Object> indexedAttributes;  // searchable metadata
}
```

**What this stores:** Every credential that was ever issued. Used for revocation and auditing.

#### `person_record` — Person's identity data (simple store)
```java
@Entity
@Table(name = "person_record")
public class PersonRecord {
    @Id
    private String id;           // UUID
    private String firstName;
    private String lastName;
    private String dateOfBirth;
    private String gender;
    private String phoneNumber;
    private String email;
}
```

#### `rendering_template` — Velocity templates for credential content
Stores the template that defines what goes into the credential. Uses Apache Velocity template language:
```
{
  "name": "$firstName $lastName",
  "dateOfBirth": "$dob",
  "licenseClass": "$licenseClass"
}
```

#### `status_list_credential` — BitString Status List for revocation
Stores a compact bit array where each bit represents whether a credential is revoked. This is the W3C Bitstring Status List standard — extremely space-efficient (65536 credentials tracked per 8KB).

---

## 13. Caching Strategy

**File:** `certify-core/.../config/SimpleCacheConfig.java` and `RedisCacheConfig.java`

Spring's `@Cacheable` annotation = caching with one annotation. FastAPI equivalent would be Redis directly or `fastapi-cache2`.

```java
@Cacheable(value = "preAuthCodeCache", key = "#preAuthCode")
public PreAuthCodeData getPreAuthData(String preAuthCode) {
    // This method is only called on CACHE MISS
    // On cache HIT, Spring returns the cached value directly
    return database.findByCode(preAuthCode);
}
```

### Cache Names and Their Purpose

| Cache Name | What's cached | Expires |
|---|---|---|
| `preAuthCodeCache` | Pre-auth codes and their associated claims | 600s |
| `credentialOfferCache` | Credential offer data | 600s |
| `vcIssuanceCache` | In-progress VC issuance transactions | 3600s |
| `issuerMetadataCache` | `.well-known` metadata responses | Long |
| `userInfoCache` | User identity data from plugin | 300s |

**Two implementations:**
- `simple` — in-memory HashMap, for local dev (lost on restart)
- `redis` — Redis server, for production (shared across instances)

---

## 14. Key Files Quick Reference

### Controllers (HTTP endpoints — like FastAPI routers)

| File | Path | What it handles |
|---|---|---|
| `VCIssuanceController.java` | `controller/` | `POST /issuance/credential` — the main endpoint to get a VC |
| `WellKnownController.java` | `controller/` | `GET /.well-known/*` — discovery documents |
| `OAuthController.java` | `controller/` | `POST /oauth/token` — token exchange |
| `PreAuthorizedCodeController.java` | `controller/` | `POST /pre-authorized-data` — generate pre-auth code |
| `CredentialConfigController.java` | `controller/` | CRUD for credential configurations |
| `CredentialStatusController.java` | `controller/` | Revocation status updates |
| `RecordController.java` | `controller/` | Person record management |

### Services (business logic)

| File | What it does |
|---|---|
| `VCIssuanceServiceImpl.java` | Orchestrates the full VC issuance flow |
| `CertifyIssuanceServiceImpl.java` | Core issuance: fetch data → sign → store ledger |
| `PreAuthorizedCodeService.java` | Pre-auth code lifecycle management |
| `CredentialConfigurationServiceImpl.java` | CRUD for credential type definitions |
| `JwksServiceImpl.java` | Serves the public key set |
| `StatusListCredentialService.java` | Manages revocation bit lists |

### Credential Format Handlers

| File | Format | Description |
|---|---|---|
| `W3CJsonLD.java` | `ldp_vc` | JSON-LD with Linked Data Proof |
| `SDJWT.java` | `vc+sd-jwt` | Selective Disclosure JWT |
| `MDocCredential.java` | `mso_mdoc` | ISO 18013-5 mobile document |

### Important Interfaces (plugin contracts)

| File | Module | Purpose |
|---|---|---|
| `VCIssuancePlugin.java` | certify-integration-api | Implement this to connect your identity DB |
| `AuditPlugin.java` | certify-integration-api | Implement this for custom audit logging |
| `DataProviderPlugin.java` | certify-integration-api | Implement this to provide user data |

---

## Appendix — Vocabulary Cheat Sheet

| Term | What it means |
|---|---|
| **VC** | Verifiable Credential — a digitally signed identity document |
| **VCI** | Verifiable Credential Issuance — the protocol for issuing VCs |
| **OID4VCI** | OpenID for Verifiable Credential Issuance — the full standard |
| **DID** | Decentralized Identifier — like a URL for identity (did:web:example.com) |
| **DID Document** | JSON file at `.well-known/did.json` listing the issuer's public keys |
| **JWKS** | JSON Web Key Set — collection of public keys |
| **ldp_vc** | Linked Data Proof VC — JSON-LD based format |
| **SD-JWT** | Selective Disclosure JWT — privacy-preserving JWT format |
| **mDoc / mDL** | Mobile Document / Mobile Driver's License — ISO standard for mobile IDs |
| **CBOR** | Compact Binary Object Representation — binary alternative to JSON |
| **COSE** | CBOR Object Signing — how to sign CBOR data |
| **MSO** | Mobile Security Object — the signed header in an mDoc |
| **Pre-auth Code** | Short-lived code used to get an access token without user authentication |
| **Holder** | The person/wallet holding the credential |
| **Issuer** | The authority issuing the credential (this service) |
| **Verifier** | The party checking the credential |
| **cnonce** | A nonce from the server used to bind the credential to the holder's key |
| **Ledger** | Database record of every credential ever issued |
| **Scope** | OAuth concept — the permission string that maps to a credential type |
| **IoC** | Inversion of Control — Spring manages object creation |
| **DI** | Dependency Injection — objects receive their dependencies from Spring |
| **Bean** | Any object managed by Spring's IoC container |
| **JPA** | Java Persistence API — ORM standard (like SQLAlchemy) |
| **Hibernate** | The JPA implementation (generates the actual SQL) |
| **Maven** | Java build tool (like pip + setuptools + make) |
| **pom.xml** | Maven's config file (like pyproject.toml) |
| **SPI** | Service Provider Interface — an interface meant to be implemented externally |
| **Velocity** | Apache Velocity — template engine (like Jinja2 for Java) |

---

*Document generated for the Inji Certify project v0.14.0 — Spring Boot 3.2.3, Java 21*
