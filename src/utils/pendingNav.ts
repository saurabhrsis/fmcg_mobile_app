/**
 * One-shot navigation intent that survives the auth-navigator → app-navigator
 * switch (e.g. after registration we want to land the user on the Business
 * Profile editor once they are inside the app).
 */
let pending: { name: string; params?: any } | null = null;

export function setPendingNav(name: string, params?: any) {
  pending = { name, params };
}

export function consumePendingNav(): { name: string; params?: any } | null {
  const p = pending;
  pending = null;
  return p;
}
