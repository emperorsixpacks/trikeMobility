// Session storage for the authenticated user. Keeps JWT + session ID in
// localStorage behind a single API so the rest of the app never reaches in
// directly. In prototype mode the user object is also persisted to
// localStorage via api.ts.

const TOKEN_KEY = "3rike.token";
const SESSION_ID_KEY = "3rike.sessionId";
const DRIVER_ID_KEY = "3rike.driverId";
const INVESTOR_ID_KEY = "3rike.investorId";
// canton_party_id is cached locally because GET /auth/me doesn't currently
// include it in its response, even after PUT /auth/wallet succeeds. Once the
// backend exposes it on /me consistently, this cache becomes a no-op.
const CANTON_PARTY_KEY = "3rike.cantonPartyId";

export type StoredSession = {
  token: string;
  // Legacy Canton backend returned a separate session id; the EVM backend is
  // token-only, so this is optional now.
  sessionId?: string;
};

export function getSession(): StoredSession | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const sessionId = localStorage.getItem(SESSION_ID_KEY) ?? undefined;
  return { token, sessionId };
}

export function setSession(s: StoredSession): void {
  localStorage.setItem(TOKEN_KEY, s.token);
  if (s.sessionId) localStorage.setItem(SESSION_ID_KEY, s.sessionId);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(DRIVER_ID_KEY);
  localStorage.removeItem(INVESTOR_ID_KEY);
  localStorage.removeItem(CANTON_PARTY_KEY);
}

export function getCantonPartyId(): string | null {
  return localStorage.getItem(CANTON_PARTY_KEY);
}

export function setCantonPartyId(id: string): void {
  localStorage.setItem(CANTON_PARTY_KEY, id);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Profile IDs are cached locally so we can fetch the user's driver/investor
// record on boot without an N+1 lookup. In prototype mode the lookup is a
// localStorage read.

export function getDriverId(): number | null {
  const raw = localStorage.getItem(DRIVER_ID_KEY);
  return raw ? Number(raw) : null;
}

export function setDriverId(id: number): void {
  localStorage.setItem(DRIVER_ID_KEY, String(id));
}

export function clearDriverId(): void {
  localStorage.removeItem(DRIVER_ID_KEY);
}

export function getInvestorId(): number | null {
  const raw = localStorage.getItem(INVESTOR_ID_KEY);
  return raw ? Number(raw) : null;
}

export function setInvestorId(id: number): void {
  localStorage.setItem(INVESTOR_ID_KEY, String(id));
}

export function clearInvestorId(): void {
  localStorage.removeItem(INVESTOR_ID_KEY);
}
