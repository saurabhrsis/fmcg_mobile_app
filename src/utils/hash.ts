// Light-weight secure hash helper for mobile offline authentication
export function simpleHash(str: string): string {
  let hash = 0;
  if (!str || str.length === 0) return '0';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'h_' + Math.abs(hash).toString(16) + '_' + str.length;
}

export function verifyHash(plain: string, hash: string): boolean {
  if (!hash) return false;
  // Desktop bcrypt hashes ($2a$/$2b$) cannot be verified on-device; such users
  // must reset their password through the security question flow.
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) return false;
  return simpleHash(plain) === hash || hash === plain;
}
