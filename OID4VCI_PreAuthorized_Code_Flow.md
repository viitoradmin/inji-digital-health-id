# OID4VCI Pre-Authorized Code Flow in Inji Certify

**Document Type:** Architecture & Integration Reference
**System:** Inji Certify — MOSIP Verifiable Credentials Issuance Portal
**Standard:** OpenID for Verifiable Credential Issuance (OID4VCI), Pre-Authorized Code Flow
**Audience:** Product Managers, Government Integration Partners, Software Engineers, System Architects, Operations Teams

---

## Table of Contents

1. [Plain English Summary](#1-plain-english-summary)
2. [The Analogy — What This Looks Like in Real Life](#2-the-analogy--what-this-looks-like-in-real-life)
3. [System Context](#3-system-context)
4. [The OID4VCI Standard — A Brief Introduction](#4-the-oid4vci-standard--a-brief-introduction)
5. [Flow Overview — The Four Steps at a Glance](#5-flow-overview--the-four-steps-at-a-glance)
6. [ASCII Architecture Diagram](#6-ascii-architecture-diagram)
7. [Step-by-Step Technical Deep Dive](#7-step-by-step-technical-deep-dive)
   - [Step 1: Generate Credential Offer](#step-1-generate-credential-offer)
   - [Step 2: Fetch Offer Details](#step-2-fetch-offer-details)
   - [Step 3: Exchange for Access Token](#step-3-exchange-for-access-token)
   - [Step 4: Issue the Verifiable Credential](#step-4-issue-the-verifiable-credential)
8. [Security Architecture](#8-security-architecture)
9. [Discovery Endpoints](#9-discovery-endpoints)
10. [Supported Credential Formats](#10-supported-credential-formats)
11. [Real-World Use Cases](#11-real-world-use-cases)
12. [Frontend Implementation](#12-frontend-implementation)
13. [Backend Architecture](#13-backend-architecture)
14. [Configuration and Operational Limits](#14-configuration-and-operational-limits)
15. [Authorization Code Flow vs. Pre-Authorized Code Flow](#15-authorization-code-flow-vs-pre-authorized-code-flow)
16. [Glossary](#16-glossary)

---

## 1. Plain English Summary

### What does Inji Certify do?

Inji Certify is a web-based portal that allows government agencies, hospitals, universities, and other trusted organizations to issue **digital identity documents** — called Verifiable Credentials — to people. These credentials work like digital versions of a health card, degree certificate, or driving license. They are cryptographically signed, which means they cannot be faked, and they can be stored in a mobile app called **Inji Wallet**.

### What is the Pre-Authorized Code Flow?

The Pre-Authorized Code Flow is the method by which an issuer (a hospital, government department, or university) delivers a Verifiable Credential to a person's mobile wallet without requiring that person to log in to any website.

Here is the process in plain terms:

1. An **operator** (a government clerk, hospital receptionist, or university registrar) opens Inji Certify, fills in the person's details, and clicks a button to generate a **QR code**.
2. The **person** (the citizen, patient, or student) opens Inji Wallet on their phone and scans that QR code.
3. The wallet automatically contacts the issuer's server, proves it is a legitimate wallet, and downloads the digitally signed credential.
4. The credential now lives in the person's wallet and can be shared or verified at any time — without ever needing a paper document.

The entire exchange typically completes in under ten seconds. No password is required from the person. No account is needed. The QR code is the bridge.

### Why does this matter?

Traditional credential systems require people to carry physical documents that can be lost, damaged, forged, or stolen. Verifiable Credentials solve these problems:

- They are **tamper-proof** — signed by the issuing authority with a cryptographic key.
- They are **portable** — stored on the person's phone, always available.
- They are **privacy-preserving** — the person controls what they share.
- They are **interoperable** — built on open international standards recognised globally.

---

## 2. The Analogy — What This Looks Like in Real Life

### The Hotel Pre-Check-In Analogy

Imagine you book a hotel room online for a business trip. The hotel's system already knows your name, your room number, and your arrival date. The day before you arrive, they send you an email with a **digital key code** — a short PIN tied to your booking.

When you arrive at the hotel:

1. You walk to the door of your room.
2. You tap your phone on the door lock (the wallet contacts the server).
3. You enter the PIN (the tx_code, or transaction code, if one is set).
4. The lock grants you access and issues a room key directly to your phone.

You never went to the front desk. You never typed a username and password into a portal. The hotel (the issuer) pre-populated everything on their end, and you simply claimed what was already prepared for you.

In Inji Certify:

| Hotel Analogy | OID4VCI Equivalent |
|---|---|
| The booking confirmation | The Pre-Authorized Request (Step 1) |
| The QR code or email link | The Credential Offer URI |
| The digital key code (PIN) | The `pre-authorized_code` |
| The room PIN you enter | The `tx_code` (optional security PIN) |
| The door lock checking your identity | The server validating the proof JWT |
| The key materialising on your phone | The signed Verifiable Credential |

The hotel never needed you to log in to a website. They prepared everything in advance. That is exactly the philosophy of the Pre-Authorized Code Flow.

### Why "Pre-Authorized"?

In the alternative flow (Authorization Code Flow), the person would log in themselves — like walking to the front desk and presenting ID. In the Pre-Authorized Code Flow, the issuer has **already done the authorization work** on behalf of the person. The code is "pre"-authorized because someone with authority (the operator) has already verified and pre-approved the credential before the wallet even connects.

---

## 3. System Context

### Inji Certify in the MOSIP Ecosystem

MOSIP (Modular Open Source Identity Platform) is an open-source digital identity infrastructure platform used by governments around the world. Inji is MOSIP's identity wallet and credential ecosystem. Inji Certify is the issuance component — the system that creates and delivers Verifiable Credentials.

```
+-----------------------+      +--------------------+      +------------------+
|  Inji Certify Portal  |----->|  Certify Backend   |----->|  Identity Data   |
|  (Issuer Web UI)      |      |  (Spring Boot API) |      |  Source (Plugin) |
+-----------------------+      +--------------------+      +------------------+
                                        |
                                        | Signed Credential
                                        v
                               +------------------+
                               |   Inji Wallet    |
                               |   (Mobile App)   |
                               +------------------+
```

### Components Referenced in This Document

| Component | Role |
|---|---|
| Inji Certify Portal | The web-based operator interface where credentials are configured and issued |
| Certify Backend | Java Spring Boot service that implements the OID4VCI protocol |
| Inji Wallet | The mobile application that receives and stores credentials |
| VCIssuancePlugin | A pluggable backend module that fetches identity data for a given credential type |
| Credential Cache | Server-side temporary storage for pre-authorized codes and their associated claims |

---

## 4. The OID4VCI Standard — A Brief Introduction

**OID4VCI** stands for **OpenID for Verifiable Credential Issuance**. It is an open international protocol specification published by the OpenID Foundation. It defines exactly how a credential issuer (like a government agency) and a credential wallet (like a mobile app) should communicate to transfer Verifiable Credentials securely.

The standard was designed to be:

- **Wallet-agnostic** — any wallet that implements the standard can work with any issuer that implements it.
- **Credential-format-agnostic** — works with W3C JSON-LD credentials, SD-JWT credentials, and ISO mobile documents.
- **Phishing-resistant** — the proof mechanism ensures the credential goes to the right wallet.

### Two Flows in the Standard

OID4VCI defines two main flows for credential issuance:

| Flow | How It Works | When to Use |
|---|---|---|
| **Authorization Code Flow** | User authenticates directly (logs in to issuer's system), consent is captured interactively | User-initiated self-service portals, high-assurance identity binding |
| **Pre-Authorized Code Flow** | Issuer operator pre-populates data and generates an offer; user's wallet redeems it | Operator-assisted issuance, bulk issuance, kiosk scenarios, government field operations |

**Inji Certify implements the Pre-Authorized Code Flow.**

---

## 5. Flow Overview — The Four Steps at a Glance

The complete issuance process consists of exactly four API interactions. Each step is performed in sequence; the output of each step feeds into the next.

| Step | API Call | Performer | Purpose |
|---|---|---|---|
| 1 | `POST /pre-authorized-data` | Certify Portal (Operator) | Register claims, generate a pre-authorized code, get a QR-linkable offer URI |
| 2 | `GET /credential-offer-data/{offer_id}` | Inji Wallet (via QR scan) | Retrieve the actual pre-authorized code and grant details |
| 3 | `POST /oauth/token` | Inji Wallet | Exchange the pre-authorized code (plus optional PIN) for a short-lived access token |
| 4 | `POST /issuance/credential` | Inji Wallet | Present the access token plus a cryptographic proof to receive the signed credential |

---

## 6. ASCII Architecture Diagram

The following diagram shows the complete message flow between all actors in the system.

```
OPERATOR (Certify Portal)            CERTIFY BACKEND              INJI WALLET (Mobile App)
         |                                   |                              |
         |  1. POST /pre-authorized-data     |                              |
         |   {credential_configuration_id,  |                              |
         |    claims, expires_in, tx_code}   |                              |
         |---------------------------------->|                              |
         |                                   |-- Validate config            |
         |                                   |-- Generate 32-char           |
         |                                   |   pre-auth code              |
         |                                   |-- Cache code+claims (TTL)    |
         |                                   |-- Build offer URI with UUID  |
         |  credential_offer_uri (QR)        |                              |
         |<----------------------------------|                              |
         |                                   |                              |
         |  [Operator shows QR to person]    |                              |
         |                                   |                              |
         |                                   |                              |
         |                                   |  2. GET /credential-offer-data/{uuid}
         |                                   |<-----------------------------|
         |                                   |-- Retrieve offer by UUID     |
         |                                   |-- Return offer JSON          |
         |                                   |  {credential_issuer,         |
         |                                   |   credential_configuration_ids,
         |                                   |   grants: {pre-auth_code,    |
         |                                   |            tx_code info}}    |
         |                                   |----------------------------->|
         |                                   |                              |
         |                                   |                              |
         |                                   |  3. POST /oauth/token        |
         |                                   |   grant_type=pre-auth_code   |
         |                                   |   pre-authorized_code=...    |
         |                                   |   tx_code=12345              |
         |                                   |<-----------------------------|
         |                                   |-- Lookup code in cache       |
         |                                   |-- Validate: not expired,     |
         |                                   |   not used, PIN matches      |
         |                                   |-- Generate JWT access token  |
         |                                   |-- Generate c_nonce           |
         |                                   |  {access_token, c_nonce,     |
         |                                   |   expires_in}                |
         |                                   |----------------------------->|
         |                                   |                              |
         |                                   |  [Wallet generates ephemeral |
         |                                   |   RSA 2048 key pair]         |
         |                                   |  [Wallet builds proof JWT    |
         |                                   |   signed with private key,   |
         |                                   |   c_nonce as nonce]          |
         |                                   |                              |
         |                                   |  4. POST /issuance/credential|
         |                                   |   Authorization: Bearer ...  |
         |                                   |   {format, credential_def,   |
         |                                   |    proof: {jwt: ...}}        |
         |                                   |<-----------------------------|
         |                                   |-- Validate access token      |
         |                                   |-- Validate proof JWT         |
         |                                   |-- Fetch identity data        |
         |                                   |   (VCIssuancePlugin)         |
         |                                   |-- Build VC from template     |
         |                                   |-- Sign with Ed25519 key      |
         |                                   |-- Store issuance record      |
         |                                   |  {credential: signed W3C VC} |
         |                                   |----------------------------->|
         |                                   |                              |
         |                                   |  [Wallet stores credential]  |
         |                                   |  [Certify Portal shows       |
         |                                   |   verification result]       |
         |                                   |                              |
```

---

## 7. Step-by-Step Technical Deep Dive

### Step 1: Generate Credential Offer

**Who performs this step:** The Certify Portal, acting on behalf of an operator (government clerk, hospital receptionist, etc.)

**What it accomplishes:** Registers the subject's identity claims with the backend, generates a single-use pre-authorized code, and produces a scannable QR code that the wallet will use to initiate the credential download.

---

#### API Request

```
POST /pre-authorized-data
Content-Type: application/json
```

**Request Body (PreAuthorizedRequest):**

```json
{
  "credential_configuration_id": "HealthID",
  "claims": {
    "firstName": "Shailesh",
    "lastName": "Gojiya",
    "email": "shailesh@example.gov.in",
    "dateOfBirth": "1990-05-15",
    "healthIdNumber": "1234-5678-9012"
  },
  "expires_in": 600,
  "tx_code": "12345"
}
```

**Field Descriptions:**

| Field | Type | Description |
|---|---|---|
| `credential_configuration_id` | string | Identifies which credential type to issue (must match a configured type in the backend, e.g., `HealthID`, `FarmerCredential`, `DrivingLicense`) |
| `claims` | object | The subject's identity data that will be embedded in the credential. Keys vary by credential type. |
| `expires_in` | integer | How many seconds the pre-authorized code remains valid (default: 600 seconds = 10 minutes) |
| `tx_code` | string | Optional PIN that the wallet must present at token exchange. Adds a layer of security against QR code interception. |

---

#### What the Backend Does

1. **Validates the configuration ID** — Confirms that `HealthID` (or whichever credential type is requested) is a recognized, active credential configuration in the system.
2. **Generates a cryptographically random pre-authorized code** — A 32-character random string. This is never guessable and is not derived from the claims or the offer ID.
3. **Caches the code and claims** — Stores the pre-authorized code, the associated claims, the PIN (if provided), and the expiry timestamp in the server-side cache. The cache TTL is set to the value of `expires_in`.
4. **Builds a UUID-based offer record** — Creates a unique UUID (`offer_id`) that acts as a pointer to the offer data. The actual pre-authorized code is not embedded in the QR code — only the UUID is.
5. **Constructs the credential offer URI** — Packages the URI into the OpenID4VCI deep-link format that wallet apps understand.

---

#### API Response

```json
{
  "credential_offer_uri": "openid-credential-offer://?credential_offer_uri=https://certify-host/credential-offer-data/abc-uuid-123"
}
```

**What happens next:**

The portal converts this URI into a QR code. The operator shows the QR code to the person (on screen, printed on paper, or sent via SMS/email). The person scans it with Inji Wallet.

**Why indirect referencing?** The URI does not contain the pre-authorized code directly — it only contains a UUID that the wallet must resolve by making an HTTP request to the backend. This prevents the code from being extracted by simply decoding the QR image. The indirection also allows the backend to track whether the offer has been fetched.

---

### Step 2: Fetch Offer Details

**Who performs this step:** Inji Wallet, automatically after scanning the QR code.

**What it accomplishes:** Retrieves the full credential offer details — including the actual pre-authorized code — from the backend using the UUID embedded in the QR code.

---

#### API Request

```
GET /credential-offer-data/{offer_id}
```

Where `{offer_id}` is the UUID extracted from the `credential_offer_uri` received in Step 1. In the example above, it would be `abc-uuid-123`.

No authentication is required for this endpoint. The UUID itself acts as a bearer token — it is unguessable and single-use.

---

#### What the Backend Does

1. **Looks up the offer record** by UUID.
2. **Returns the full offer payload** including the actual pre-authorized code and any PIN requirements.

---

#### API Response

```json
{
  "credential_issuer": "https://certify-host",
  "credential_configuration_ids": ["HealthID"],
  "grants": {
    "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
      "pre-authorized_code": "abc123xyz456def789ghi012jkl345mn",
      "tx_code": {
        "length": 5,
        "input_mode": "numeric",
        "description": "PIN from issuer"
      }
    }
  }
}
```

**Field Descriptions:**

| Field | Description |
|---|---|
| `credential_issuer` | The canonical base URL of the credential issuer. The wallet uses this to discover other endpoints. |
| `credential_configuration_ids` | The list of credential types this offer covers. Usually one item. |
| `grants` | The grant object. The key is a full URN identifying the Pre-Authorized Code grant type per OAuth 2.0 specification. |
| `pre-authorized_code` | The actual code the wallet will use in Step 3. 32 characters, cryptographically random. |
| `tx_code.length` | How many characters the PIN is (5 in this example). The wallet uses this to render the right UI. |
| `tx_code.input_mode` | `numeric` means only digits. The wallet shows a number pad. |
| `tx_code.description` | Human-readable hint shown to the user (e.g., "Enter the PIN provided by your health officer"). |

**If no PIN was set**, the `tx_code` object is absent from the response, and the wallet proceeds directly to Step 3 without asking the user for a PIN.

---

### Step 3: Exchange for Access Token

**Who performs this step:** Inji Wallet.

**What it accomplishes:** Exchanges the pre-authorized code (and optional PIN) for a short-lived OAuth 2.0 access token. This token grants the wallet one chance to request the credential.

---

#### API Request

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded
```

**Request Body (form-encoded):**

```
grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Apre-authorized_code
&pre-authorized_code=abc123xyz456def789ghi012jkl345mn
&tx_code=12345
```

Or in readable form:

| Parameter | Value |
|---|---|
| `grant_type` | `urn:ietf:params:oauth:grant-type:pre-authorized_code` |
| `pre-authorized_code` | The 32-character code from Step 2 |
| `tx_code` | The PIN (omit this field entirely if no PIN was set) |

**Note:** The `Content-Type` header must be `application/x-www-form-urlencoded`, not JSON. This follows the OAuth 2.0 token endpoint convention.

---

#### What the Backend Does

1. **Parses the grant type** — Confirms this is a pre-authorized code grant (not a different OAuth flow).
2. **Looks up the pre-authorized code in the cache** — Retrieves the associated claims and metadata.
3. **Validates the code:**
   - Is it still within the TTL? (Not expired)
   - Has it already been used? (Single-use enforcement)
   - Does the `tx_code` match the PIN stored during Step 1? (PIN validation, if applicable)
4. **Marks the code as consumed** — Prevents replay attacks.
5. **Generates a JWT access token** — Signed by the backend, scoped to the specific credential type requested.
6. **Generates a `c_nonce`** — A cryptographically random challenge string that the wallet must include in its proof JWT in Step 4. This binds the credential request to a specific wallet interaction.
7. **Returns the token response.**

---

#### API Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJIZWFsdGhJRCIsInNjb3BlIjoiSGVhbHRoSUQiLCJleHAiOjE3MTYxNTkwMDB9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "c_nonce": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "c_nonce_expires_in": 600
}
```

**Field Descriptions:**

| Field | Description |
|---|---|
| `access_token` | A JWT (JSON Web Token) that the wallet will present as a Bearer token in Step 4. |
| `token_type` | Always `Bearer` for this flow — the wallet presents it in an `Authorization` header. |
| `expires_in` | Seconds until the access token expires (3600 = 1 hour). |
| `c_nonce` | A server-generated random challenge. The wallet MUST include this in its proof JWT. |
| `c_nonce_expires_in` | Seconds until the c_nonce expires (600 = 10 minutes). Wallet must use it before then. |

---

### Step 4: Issue the Verifiable Credential

**Who performs this step:** Inji Wallet (with the Certify Portal also presenting this step in its UI for demonstration and testing).

**What it accomplishes:** The wallet proves ownership of a cryptographic key, presents the access token, and in return receives the signed Verifiable Credential.

This is the most technically involved step. It has two sub-phases: proof generation and credential request.

---

#### Sub-Phase A: Proof JWT Generation (Wallet-Side)

Before sending the credential request, the wallet must generate a **proof of key possession**. This proves that the entity requesting the credential holds a specific private key — and therefore, the credential will be cryptographically bound to that wallet instance.

**Process:**

1. Generate an ephemeral RSA 2048-bit key pair using the browser's (or device's) cryptographic API. This key pair is created fresh for every issuance — it is never reused.
2. Fetch the issuer's URL from the well-known endpoint: `GET /.well-known/oauth-authorization-server`. This URL is used as the `aud` (audience) claim in the proof JWT.
3. Construct the proof JWT with the following structure:

**Proof JWT Header:**
```json
{
  "alg": "RS256",
  "typ": "openid4vci-proof+jwt",
  "jwk": {
    "kty": "RSA",
    "n": "...",
    "e": "AQAB"
  }
}
```

**Proof JWT Payload:**
```json
{
  "iss": "https://certify-host",
  "aud": "https://certify-host",
  "iat": 1716155400,
  "exp": 1716156000,
  "nonce": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

**Key fields explained:**

| Claim | Value | Purpose |
|---|---|---|
| `alg` (header) | `RS256` | RSASSA-PKCS1-v1_5 with SHA-256. The signing algorithm. |
| `typ` (header) | `openid4vci-proof+jwt` | Identifies this as an OID4VCI proof token, not a regular JWT. |
| `jwk` (header) | RSA public key | The public half of the ephemeral key pair. Backend uses this to verify the signature. |
| `aud` | Issuer URL | Binds the proof to this specific issuer — cannot be replayed at another issuer. |
| `nonce` | The `c_nonce` from Step 3 | Binds the proof to this specific token exchange session. Prevents replay. |
| `exp` | `iat + 600` | The proof JWT expires 600 seconds after creation. |

4. Sign the JWT with the ephemeral RSA private key (RS256 / RSASSA-PKCS1-v1_5).

---

#### Sub-Phase B: Credential Request

```
POST /issuance/credential
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "format": "ldp_vc",
  "credential_definition": {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://certify-host/contexts/HealthID/v1"
    ],
    "type": [
      "VerifiableCredential",
      "HealthID"
    ]
  },
  "proof": {
    "proof_type": "jwt",
    "jwt": "eyJhbGciOiJSUzI1NiIsInR5cCI6Im9wZW5pZDR2Y2ktcHJvb2Yrand..."
  }
}
```

**Field Descriptions:**

| Field | Description |
|---|---|
| `format` | The desired credential format. `ldp_vc` = W3C JSON-LD with Linked Data Proof. Other options: `vc+sd-jwt`, `mso_mdoc`. |
| `credential_definition` | Specifies the credential type using the W3C context and type convention. |
| `proof.proof_type` | Always `jwt` for this implementation. |
| `proof.jwt` | The signed proof JWT constructed in Sub-Phase A. |

---

#### What the Backend Does

1. **Extracts the Bearer token** from the `Authorization` header and validates it — checks signature, expiry, and scope.
2. **Validates the proof JWT:**
   - Extracts the public key from the JWT header (`jwk` claim).
   - Verifies the JWT signature using that public key.
   - Confirms the `nonce` matches the `c_nonce` issued in Step 3.
   - Confirms the `aud` matches the issuer's own URL.
   - Confirms the proof JWT has not expired.
3. **Fetches the subject's identity data** via the VCIssuancePlugin — this is a pluggable component that retrieves the claims that were cached in Step 1.
4. **Builds the Verifiable Credential document** from a Velocity template configured for the credential type.
5. **Signs the credential** using the issuer's Ed25519 or EC key, producing an `Ed25519Signature2020` Linked Data Proof (for `ldp_vc` format).
6. **Stores an issuance record** — the backend logs that this credential was issued (audit trail).
7. **Returns the signed credential.**

---

#### API Response

```json
{
  "credential": {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://certify-host/contexts/HealthID/v1"
    ],
    "type": ["VerifiableCredential", "HealthID"],
    "issuer": "https://certify-host",
    "issuanceDate": "2024-05-20T09:30:00Z",
    "credentialSubject": {
      "id": "did:example:holder-key-fingerprint",
      "firstName": "Shailesh",
      "lastName": "Gojiya",
      "healthIdNumber": "1234-5678-9012",
      "dateOfBirth": "1990-05-15"
    },
    "proof": {
      "type": "Ed25519Signature2020",
      "created": "2024-05-20T09:30:00Z",
      "verificationMethod": "https://certify-host#key-1",
      "proofPurpose": "assertionMethod",
      "proofValue": "z58DAdFfa9SkqZMVPxAQpic7ndFaKalmEgynpNUkugnB..."
    }
  }
}
```

The `proof.proofValue` is the cryptographic signature over the credential document. Any tampering with the credential data (name, date, credential ID) would invalidate this signature. Verifiers can check the signature against the issuer's published public key without contacting the issuer.

---

## 8. Security Architecture

The Pre-Authorized Code Flow incorporates multiple layers of security, each addressing a specific threat. This section explains each mechanism, why it exists, and what it protects against.

### 8.1 Pre-Authorized Code (Single-Use, Short-Lived)

**What it is:** A 32-character cryptographically random string generated on the server.

**Lifetime:** Configurable, default 600 seconds (10 minutes).

**Single-use enforcement:** Once a wallet successfully exchanges the code for an access token, the code is immediately invalidated. Any subsequent attempt to use the same code will be rejected.

**Threat it defends against:**

| Threat | Defense |
|---|---|
| QR code photographed by a third party and used later | Code expires after 600 seconds |
| Code intercepted over an insecure channel | Even if intercepted, it can only be used once; the tx_code (PIN) provides a second factor |
| Brute-force guessing | 32 random characters from a large character set — computationally infeasible to guess |

---

### 8.2 Transaction Code (tx_code / PIN)

**What it is:** An optional short numeric PIN set by the operator during Step 1. The wallet must present this PIN in Step 3 to obtain an access token.

**How it is delivered:** Out-of-band — separately from the QR code. For example: verbally, via SMS, or printed on a separate slip.

**Threat it defends against:**

Suppose an attacker photographs the QR code displayed on a screen. Without the PIN, the attacker cannot complete Step 3. The QR code alone is useless.

```
Attacker has QR code + No PIN  →  Token exchange fails  →  No credential
Legitimate holder has QR code + PIN  →  Token exchange succeeds  →  Credential issued
```

This two-factor model is similar to a payment card: the card number (visible, like the QR code) is useless without the PIN (secret, known only to the holder).

---

### 8.3 c_nonce (Cryptographic Challenge)

**What it is:** A server-generated random string returned in the token response (Step 3). The wallet must include this exact value as the `nonce` claim in its proof JWT (Step 4).

**Threat it defends against:** **Access token theft and replay.**

Consider this attack scenario without c_nonce:

1. Attacker steals Alice's access token (e.g., via a compromised app or network interception).
2. Attacker uses the access token to request the credential on Alice's behalf.
3. The credential gets issued to the attacker's key, not Alice's.

With c_nonce:

1. Attacker steals Alice's access token.
2. Attacker tries to request a credential.
3. The server requires a proof JWT containing the c_nonce — which must be signed with the wallet's private key.
4. The attacker does not have Alice's private key.
5. Request fails.

The c_nonce ensures that merely possessing an access token is not enough — you must also control the cryptographic key pair that generated the proof.

---

### 8.4 Proof JWT (Key Binding / Key Possession Proof)

**What it is:** A short-lived JWT signed by the wallet's ephemeral private key, presented in the credential request (Step 4).

**Why ephemeral keys?** A new RSA 2048-bit key pair is generated for every issuance. The private key never leaves the device and is discarded after issuance. This means:

- There is no long-term private key to steal.
- Compromise of one issuance does not compromise others.
- The credential's binding is limited to one wallet session.

**The `typ: openid4vci-proof+jwt` header** distinguishes this proof from other JWT types, preventing cross-protocol confusion attacks where a token intended for one purpose is replayed in another context.

**Threat summary:**

| Without Proof JWT | With Proof JWT |
|---|---|
| Anyone who has an access token can get a credential | Only the entity holding the private key paired with the public key in the proof can get a credential |
| Token theft = credential theft | Token theft alone is useless |

---

### 8.5 Bearer Token Scope

**What it is:** The access token issued in Step 3 is scoped to one specific credential configuration ID (e.g., `HealthID`).

**Threat it defends against:** Credential type escalation. An access token issued for a Health ID cannot be used to request a Driving License or any other credential type. The backend enforces this scope during credential issuance.

---

### 8.6 Cache Expiry and TTL

**What it is:** The server-side cache that stores pre-authorized codes enforces a hard TTL (time-to-live). After this TTL, the code and all associated claims are automatically purged.

**Effect:** If a QR code is not scanned within the expiry window (default 600 seconds), the entire offer becomes invalid and no credential can be issued. The operator must generate a new offer.

**Operational implication:** Operators should generate QR codes only when the person is present and ready to scan. Generating QR codes in bulk and distributing them later introduces a race against the TTL.

---

### 8.7 Security Summary Table

| Mechanism | Protects Against | Where Enforced |
|---|---|---|
| Pre-authorized code (single-use) | QR code interception; replay | Backend (Step 3 validation) |
| Short TTL (600s) | Delayed QR code theft | Backend cache eviction |
| tx_code (PIN) | QR code-only theft; shoulder surfing | Backend (Step 3 PIN validation) |
| c_nonce challenge | Access token theft; credential request replay | Backend (Step 4 proof validation) |
| Proof JWT (key possession) | Token theft without key | Backend (Step 4 JWT verification) |
| Bearer token scope | Credential type escalation | Backend (Step 4 scope check) |
| Ed25519 credential signature | Credential forgery and tampering | Verifiers (independent verification) |

---

## 9. Discovery Endpoints

Wallet applications (and automated integrators) do not need to be hardcoded with the backend's endpoint URLs. Instead, they use standardized discovery endpoints — well-known URIs — to learn what the issuer supports.

### 9.1 OpenID Credential Issuer Metadata

```
GET /.well-known/openid-credential-issuer
```

**Returns:** The issuer's capability advertisement — a JSON document listing:

- The credential issuer URL
- The credential endpoint URL
- All supported credential configuration IDs
- For each credential type: supported formats, supported cryptographic suites, display metadata (name, logo, colors for wallet UI)

**Who uses it:** Wallet apps use this to build a display card for the credential in their library, and to know exactly what fields and formats the issuer supports.

### 9.2 OAuth Authorization Server Metadata

```
GET /.well-known/oauth-authorization-server
```

**Returns:** OAuth 2.0 server metadata, including:

- The token endpoint URL (`/oauth/token`)
- The issuer URL (used as the `aud` claim in proof JWTs)
- Supported grant types

**Who uses it:** The wallet fetches this to determine the correct `aud` value for the proof JWT (Step 4, Sub-Phase A). The Certify Portal also fetches this during the issuance flow.

---

## 10. Supported Credential Formats

Inji Certify's backend supports three credential formats. The format is selected by the wallet in the credential request (Step 4) using the `format` field.

| Format Identifier | Full Name | Standard | Proof Type | Best For |
|---|---|---|---|---|
| `ldp_vc` | W3C Verifiable Credential with Linked Data Proof | W3C VC Data Model 1.1 | Ed25519Signature2020 | General-purpose identity credentials; widest verifier support |
| `vc+sd-jwt` | SD-JWT Verifiable Credential | IETF SD-JWT specification | JWT signature | Privacy-preserving selective disclosure |
| `mso_mdoc` | Mobile Security Object + Mobile Document | ISO 18013-5 (mDL standard) | COSE signature | Driving licenses; ISO-compliant physical document replacements |

**Note:** The format used in the examples throughout this document is `ldp_vc`. The frontend currently issues credentials in `ldp_vc` format with an `Ed25519Signature2020` linked data proof.

---

## 11. Real-World Use Cases

### 11.1 National Health ID Issuance

**Scenario:** A government health department wants to issue a digital Health ID to every citizen registered in their hospital management system.

**Process:**
- The hospital receptionist opens Inji Certify and selects the `HealthID` credential configuration.
- Fills in the patient's name, date of birth, registered health ID number, and blood group from the hospital system.
- Clicks "Generate Offer" — a QR code appears on screen.
- The patient opens Inji Wallet on their phone and scans the QR code at the reception desk.
- Within seconds, the signed Health ID credential appears in the patient's wallet.

**Value delivered:** The patient now carries a tamper-proof, cryptographically verifiable digital health card. No plastic card printing required. Pharmacies, labs, and clinics that support Inji Wallet verification can instantly verify the credential.

---

### 11.2 University Degree Credential

**Scenario:** A university wants to issue digital degree certificates at graduation.

**Process:**
- The registrar's office pre-loads each graduating student's details (name, degree, specialization, graduation year, student ID) into the system during the ceremony preparation.
- At graduation, each student approaches the registrar's desk and scans a QR code printed on a small card with their name.
- A PIN is printed on a separate slip given to the student in their graduation packet.
- The student scans the QR, enters the PIN in the wallet, and receives their signed degree credential.

**Value delivered:** The credential can be shared with employers globally. A single standard API call lets any employer verify the credential's authenticity against the university's published public key — without contacting the university.

---

### 11.3 Farmer Credential for Agricultural Subsidy

**Scenario:** An agricultural department issues digital farmer credentials that entitle holders to access government subsidy schemes.

**Process:**
- Field officers visit farmers, verify their land records and identity on-site, and register their details in Inji Certify.
- The system generates a QR code and sends it via SMS to the farmer's registered mobile number.
- The farmer scans the QR code from the SMS using Inji Wallet.
- The farmer receives a digital Farmer Credential that can be presented at any bank or government office to access subsidies.

**Value delivered:** Eliminates middlemen and document fraud in subsidy disbursement. Verifiers can instantly confirm whether a credential is genuine and unmodified.

---

### 11.4 Employee Onboarding Badge Credential

**Scenario:** An HR department needs to issue digital identity credentials to 500 new employees joining simultaneously.

**Process:**
- HR pre-loads all employee records into the system (can be done via batch import from HR software).
- Generates 500 credential offers simultaneously, each producing a unique QR code.
- QR codes are included in each employee's onboarding email.
- Employees scan their individual QR code during orientation using Inji Wallet.

**Value delivered:** Each employee receives a digitally signed employee credential in minutes. Physical ID card printing, delivery, and management are eliminated.

---

### 11.5 Vaccination Certificate Issuance

**Scenario:** A hospital issues vaccination certificates immediately after administering vaccines.

**Process:**
- The vaccination operator records the patient's details (name, vaccine type, lot number, date) and clicks "Generate Offer."
- The QR code is printed on the vaccination receipt handed to the patient.
- The patient scans the QR code at home or on the spot using Inji Wallet.
- A signed, internationally verifiable vaccination certificate appears in the wallet.

**Value delivered:** Replaces paper vaccination booklets that can be lost or forged. Travelers can present the credential at border crossings where digital verification is supported.

---

## 12. Frontend Implementation

The Inji Certify web portal provides a complete visual workflow for the credential issuance process. This section describes the interface behavior without reference to internal implementation details.

### 12.1 Page Layout

The issuance page is divided into two primary panels:

**Left Panel — Input Form**
- A dropdown to select the credential configuration (e.g., HealthID, FarmerCredential, DrivingLicense).
- Dynamic claim fields that change based on the selected credential type.
- A "Generate Credential Offer" button that triggers Step 1.
- Pre-population support: if the user arrives via a URL containing a `recordId` or `credentialConfigId` parameter, the form is pre-filled from a previously stored person record. This supports operator workflows where person records are maintained in the system.

**Right Panel — Live Results Sidebar**
- A sticky sidebar that persists as the user scrolls.
- Displays a QR code once Step 1 completes.
- Shows the live response data for each step as it completes.
- Displays a verification result card after Step 4, automatically confirming whether the issued credential passes cryptographic verification.

### 12.2 Visual Progress Indicator

A four-node stepper component sits at the top of the page, showing:

1. Generate Offer
2. Fetch Offer
3. Exchange Token
4. Issue Credential

Each node is connected by a progress line. As each step completes, the corresponding node activates and the line connecting it to the next node fills. This provides an at-a-glance status indicator useful for demonstration and debugging.

### 12.3 Activity Log

A timestamped activity log panel records every significant event during the issuance flow — API call initiated, response received, step completed, error encountered. This supports:

- Operator debugging when an issuance fails.
- Demonstrations to integration partners.
- Understanding the sequence of operations.

### 12.4 Issuance Record Persistence

Once a credential is successfully issued, the portal saves an issuance record to the browser's local storage. The portal retains the last 50 issuance records. These records allow operators to:

- Review previously issued credentials.
- Retrieve the issued credential JSON for inspection.
- Track which credential types have been issued in the current session.

### 12.5 Proof JWT Generation in the Browser

When the portal reaches Step 4 (for demonstration/testing purposes), it generates the proof JWT entirely within the browser using the Web Crypto API. The browser:

1. Generates an RSA 2048-bit key pair using RSASSA-PKCS1-v1_5 (RS256).
2. Signs the proof JWT payload with the private key.
3. Includes the public key in the JWT header.
4. Sends the proof JWT to the backend.

The private key is ephemeral — it exists only in memory for the duration of the issuance flow and is not stored anywhere. This makes the browser-side proof generation safe for demonstration and testing while following the same protocol that a production wallet app would use.

### 12.6 Current Configuration Defaults

| Parameter | Current Default | Notes |
|---|---|---|
| `tx_code` | `12345` | Hardcoded in portal for demonstration; production systems should generate random PINs |
| `expires_in` | `600` seconds | Matches backend cache TTL |
| Proof key algorithm | RSA 2048-bit, RS256 | RSASSA-PKCS1-v1_5 with SHA-256 |
| Proof JWT validity | 600 seconds | Key generated fresh per issuance |

---

## 13. Backend Architecture

### 13.1 Technology Stack

| Component | Technology |
|---|---|
| Runtime | Java (Spring Boot) |
| Module name | `certify-service` |
| Credential cache | Spring Cache with configurable TTL |
| Credential signing | Ed25519 (for `ldp_vc`), COSE (for `mso_mdoc`) |
| Identity data plugin | VCIssuancePlugin (customizable per deployment) |
| Template engine | Apache Velocity (for VC document generation) |

### 13.2 Key Backend Responsibilities

**Pre-Authorized Code Management:**
- Receives the claim data from the portal.
- Generates the pre-authorized code and stores it with TTL.
- Associates the UUID offer record with the code.
- Enforces single-use and expiry at redemption time.

**OAuth 2.0 Token Issuance:**
- Implements the token endpoint per RFC 6749 and OID4VCI specification.
- Validates pre-authorized code and PIN.
- Issues JWT access tokens scoped to the requested credential type.
- Generates `c_nonce` challenges.

**Credential Issuance:**
- Validates access tokens and proof JWTs.
- Delegates identity data retrieval to the VCIssuancePlugin.
- Builds and signs credentials.
- Logs issuance events for auditability.

**Well-Known Discovery:**
- Serves the `openid-credential-issuer` and `oauth-authorization-server` metadata documents.
- Metadata is generated from backend configuration and reflects the currently active credential types.

### 13.3 VCIssuancePlugin

The VCIssuancePlugin is a pluggable interface that decouples the OID4VCI protocol layer from the identity data retrieval layer. Each deployment can implement its own plugin to fetch identity data from:

- A national ID database
- A hospital information system
- A university student records system
- An agricultural land records registry

This plugin architecture allows Inji Certify to integrate with any identity data source without modifying the core OID4VCI implementation.

### 13.4 Credential Template System

Verifiable Credentials are generated from Apache Velocity templates. Each credential configuration (`HealthID`, `FarmerCredential`, etc.) has its own template that defines:

- Which claims are included in the `credentialSubject`
- The `@context` URLs for JSON-LD linked data
- The `type` array
- Any computed or derived fields

This template-based approach allows new credential types to be added and configured without code changes — only configuration and template files need to be updated.

---

## 14. Configuration and Operational Limits

### 14.1 Backend Configuration Properties

| Property Key | Default Value | Description |
|---|---|---|
| `mosip.certify.cache.pre-auth-code.expire-seconds` | `600` | TTL for pre-authorized codes in the server cache. After this time, the code is invalid and purged. |
| `mosip.certify.pre-auth-code-expire-seconds` | `600` | Companion property specifying the expiry duration embedded in the pre-auth code metadata. |

**Tuning guidance:**

- **Shorter TTL (e.g., 120s):** Higher security. Appropriate for in-person issuance where the person is present and scans immediately. Reduces the window for QR code interception attacks.
- **Longer TTL (e.g., 1800s):** Better for remote issuance (e.g., QR codes sent via SMS), where the person may not scan immediately. Increases the attack window if the QR code is intercepted.

### 14.2 Access Token Validity

The access token issued in Step 3 has a default validity of 3600 seconds (1 hour). This is generous relative to the issuance flow, which typically completes in seconds. In practice, Step 4 should be completed immediately after Step 3.

### 14.3 c_nonce Validity

The `c_nonce` has a separate validity of 600 seconds. If the wallet does not complete the credential request within this window after receiving the token, the nonce will be rejected and the wallet must request a fresh nonce (or restart the flow).

### 14.4 Issuance Records (Portal)

The portal retains the last 50 issuance records in browser local storage. This is a client-side limit with no server-side equivalent.

### 14.5 Credential Offer Resolution Window

A credential offer UUID is only resolvable for as long as the pre-authorized code remains valid in the server cache. Once the code expires, the `GET /credential-offer-data/{offer_id}` endpoint will also fail to return a valid response.

### 14.6 Operational Recommendations

| Scenario | Recommendation |
|---|---|
| In-person kiosk issuance | Set TTL to 120-180 seconds. Require tx_code. Generate offer only when person is present. |
| Remote issuance via SMS QR | Set TTL to 900-1800 seconds. Require tx_code sent separately. Use HTTPS for QR delivery. |
| Bulk onboarding (email QR) | Set TTL to 3600 seconds or longer. Use tx_code mandatory. Stagger QR delivery to reduce simultaneous load. |
| High-security credentials | Always use tx_code. Implement backend rate limiting on the token endpoint. |

---

## 15. Authorization Code Flow vs. Pre-Authorized Code Flow

This section provides a concise comparison for decision-makers evaluating which flow is appropriate for a given issuance scenario.

| Dimension | Pre-Authorized Code Flow | Authorization Code Flow |
|---|---|---|
| **Who initiates?** | Issuer operator pre-registers the person | The person initiates themselves |
| **User login required?** | No — the operator already authenticated the user | Yes — user authenticates interactively |
| **Setup complexity** | Lower — operator UI only | Higher — requires a login/IdP integration |
| **Best for** | Government field issuance, hospital operators, HR onboarding | Self-service credential portals |
| **Security model** | Relies on operator authentication + optional PIN | Relies on user's authentication credentials |
| **Scalability** | High — operator can pre-generate many offers | Depends on user authentication throughput |
| **Implementation** | Implemented in Inji Certify (current) | Not implemented in this deployment |

**Decision guidance:**

If the issuing organization has trained operators who verify identity before generating an offer, and the credential issuance happens at a physical location or via a trusted channel (e.g., hospital appointment), the Pre-Authorized Code Flow is the correct choice — simpler, faster, and well-suited to the scale of government identity programs.

---

## 16. Glossary

| Term | Definition |
|---|---|
| **Access Token** | A short-lived credential (JWT) that grants the wallet permission to request one specific credential. Presented in the `Authorization: Bearer` header. |
| **Bearer Token** | A type of access token where any entity that "bears" (possesses) the token can use it. Bearer tokens should always be transmitted over HTTPS. |
| **c_nonce** | "Cryptographic nonce" — a one-time challenge string issued by the server during token exchange. The wallet must include it in the proof JWT to prevent replay attacks. |
| **Credential Configuration ID** | A string identifier (e.g., `HealthID`) that specifies which type of credential is being requested. Must be registered in the backend configuration. |
| **Credential Offer** | A structured data object that tells a wallet: which issuer to contact, which credential type is being offered, and how to redeem it (the pre-authorized code). |
| **Credential Offer URI** | The scannable deep link (`openid-credential-offer://...`) encoded in a QR code. Contains a URL the wallet uses to fetch the full offer details. |
| **DID (Decentralized Identifier)** | A W3C standard identifier format for self-sovereign identity subjects. May appear as the `id` field in `credentialSubject`. |
| **Ed25519Signature2020** | A Linked Data Proof suite that uses the Ed25519 elliptic curve algorithm to sign W3C Verifiable Credentials. Very fast and compact. |
| **Ephemeral Key** | A cryptographic key pair that is generated once for a single operation and then discarded. Provides forward secrecy — compromise of one key does not affect others. |
| **Grant Type** | In OAuth 2.0, specifies the mechanism by which a client obtains an access token. The grant type for this flow is `urn:ietf:params:oauth:grant-type:pre-authorized_code`. |
| **Inji Certify** | The MOSIP-ecosystem web portal and backend service that issues Verifiable Credentials using the OID4VCI protocol. |
| **Inji Wallet** | The MOSIP-ecosystem mobile application that receives, stores, and presents Verifiable Credentials. |
| **JSON-LD** | JSON Linked Data — a method of encoding structured data using JSON with semantic context. Used in W3C Verifiable Credentials to make data machine-readable and interoperable. |
| **JWT (JSON Web Token)** | A compact, URL-safe token format with three Base64-encoded sections: header, payload, and signature. Used for access tokens and proof tokens. |
| **ldp_vc** | "Linked Data Proof Verifiable Credential" — the W3C credential format using JSON-LD and a cryptographic Linked Data Proof. |
| **mso_mdoc** | A credential format defined in ISO 18013-5, used for mobile driving licenses. Uses COSE cryptographic signatures. |
| **MOSIP** | Modular Open Source Identity Platform — an open-source digital identity infrastructure used by governments globally. Inji Certify is part of the MOSIP ecosystem. |
| **OID4VCI** | OpenID for Verifiable Credential Issuance — an open specification from the OpenID Foundation defining how wallets and issuers communicate to transfer Verifiable Credentials. |
| **Operator** | The authorized personnel (government clerk, hospital receptionist, university registrar, etc.) who uses Inji Certify to initiate credential issuance for a subject. |
| **Pre-Authorized Code** | A short-lived, single-use random string generated by the issuer backend. The wallet presents this code to obtain an access token. Analogous to a one-time password. |
| **Pre-Authorized Code Flow** | The OID4VCI issuance flow where the issuer operator pre-registers the subject's data and generates a redemption code. The wallet redeems the code without the user needing to log in. |
| **Proof JWT** | A JSON Web Token signed by the wallet's private key, proving that the wallet controls a specific key pair. Presented during credential issuance to prevent token theft from resulting in credential theft. |
| **RS256** | RSA Signature with SHA-256. The signing algorithm used for proof JWTs in this implementation (RSASSA-PKCS1-v1_5). |
| **RSA 2048-bit** | A widely supported asymmetric cryptographic algorithm with a 2048-bit key size. Used for the ephemeral key pair in proof JWT generation. |
| **SD-JWT** | Selective Disclosure JWT — a credential format that allows a holder to reveal only selected claims to a verifier, without revealing the entire credential. |
| **TTL (Time To Live)** | The maximum duration a piece of cached data is retained before being automatically deleted. Controls the validity window of pre-authorized codes. |
| **tx_code** | "Transaction Code" — an optional PIN that the wallet must present at token exchange. Delivered out-of-band (separately from the QR code) to add a second security factor. |
| **UUID** | Universally Unique Identifier — a 128-bit random identifier used to identify the credential offer record. Appears in the credential offer URI and is used in the `GET /credential-offer-data/{uuid}` request. |
| **vc+sd-jwt** | The credential format identifier for an SD-JWT Verifiable Credential. |
| **Verifiable Credential (VC)** | A W3C standard data model for cryptographically signed digital credentials. Contains claims about a subject (name, date of birth, credential type) and a digital signature from the issuer. |
| **VCIssuancePlugin** | A pluggable backend component in Inji Certify that fetches identity data from an external source (national database, hospital system, etc.) during credential issuance. |
| **Velocity Template** | An Apache Velocity template file used by the backend to render the credential document structure before signing. Each credential type has its own template. |
| **Verifier** | An entity (employer, border officer, pharmacist) that receives a Verifiable Credential from a holder and cryptographically verifies its authenticity and integrity. |
| **W3C VC Data Model** | The World Wide Web Consortium specification defining the structure and semantics of Verifiable Credentials. Version 1.1 is used in this implementation. |
| **Well-Known Endpoint** | A standardized URL path (e.g., `/.well-known/openid-credential-issuer`) where a server publishes its configuration metadata. Wallet apps query these to auto-discover issuer capabilities. |

---

*This document describes the OID4VCI Pre-Authorized Code Flow as implemented in Inji Certify. For questions about integration, deployment, or extension of this system, contact the Inji platform team or refer to the MOSIP documentation portal.*
