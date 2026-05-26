/** Generate an RSA RS256 proof JWT for OpenID4VCI credential issuance (Web Crypto API). */
export async function generateProofJwt(cNonce: string, aud: string): Promise<string> {
  const kp = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );

  const pubJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);

  const strToB64url = (str: string): string => {
    const bytes = new TextEncoder().encode(str);
    return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  };

  const now = Math.floor(Date.now() / 1000);
  const headerB64 = strToB64url(
    JSON.stringify({ alg: "RS256", typ: "openid4vci-proof+jwt", jwk: pubJwk }),
  );
  const payloadB64 = strToB64url(JSON.stringify({ aud, nonce: cNonce, iat: now, exp: now + 600 }));
  const signingInput = `${headerB64}.${payloadB64}`;

  const sigBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    kp.privateKey,
    new TextEncoder().encode(signingInput),
  );
  const sigB64 = btoa(Array.from(new Uint8Array(sigBuffer), (b) => String.fromCharCode(b)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${signingInput}.${sigB64}`;
}
