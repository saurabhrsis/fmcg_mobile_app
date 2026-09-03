// Shipped PUBLIC key — the same ed25519 key pair used by the RightServe /
// FMCG desktop product, so keys minted by the portal
// (portal/server/licensing.js) verify offline inside this mobile app too.
//
// Keep this in sync with desktop/license_public.pem in the fmcg_software repo.
export const LICENSE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAInTN/B6lWRpCbajz8mqcx1oyihU5zHkaJhgWXXcpZQw=
-----END PUBLIC KEY-----`;

/** Raw 32-byte ed25519 public key extracted from the SPKI PEM above. */
export function publicKeyBytes(): Uint8Array {
  const b64 = LICENSE_PUBLIC_KEY_PEM.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = base64ToBytes(b64);
  // SPKI ed25519 = 12-byte header + 32-byte raw key
  return der.slice(der.length - 32);
}

export function base64ToBytes(b64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let acc = 0;
  let p = 0;
  for (let i = 0; i < clean.length; i++) {
    const idx = chars.indexOf(clean[i]);
    if (idx < 0) continue;
    acc = (acc << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[p++] = (acc >> bits) & 0xff;
    }
  }
  return out.slice(0, p);
}
