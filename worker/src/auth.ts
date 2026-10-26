import { bytesFromBase64Url, stringFromBase64Url, utf8 } from './encoding';
import type { Env } from './env';

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

type FirebaseJwk = JsonWebKey & { kid: string };
let jwks: { keys: FirebaseJwk[]; expiresAt: number } | null = null;

async function publicKey(kid: string): Promise<CryptoKey | null> {
  if (!jwks || jwks.expiresAt < Date.now() || !jwks.keys.some((key) => key.kid === kid)) {
    const response = await fetch(JWKS_URL);
    if (!response.ok) throw new Error(`Could not load Firebase signing keys (${response.status})`);
    const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '')?.[1] ?? 3600);
    jwks = { keys: ((await response.json()) as { keys: FirebaseJwk[] }).keys, expiresAt: Date.now() + maxAge * 1000 };
  }
  const jwk = jwks.keys.find((key) => key.kid === kid);
  if (!jwk) return null;
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
}

export interface AdminUser {
  uid: string;
  email?: string;
}

/**
 * Verifies a Firebase Auth ID token (Authorization: Bearer <token>) and returns the
 * user only if the token is valid for this project and carries the `admin` custom claim.
 */
export async function verifyAdmin(request: Request, env: Env): Promise<AdminUser | null> {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '');
  if (!match) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = match[1].split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  try {
    const header = JSON.parse(stringFromBase64Url(encodedHeader)) as { alg?: string; kid?: string };
    const payload = JSON.parse(stringFromBase64Url(encodedPayload)) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    const projectId = env.FIREBASE_PROJECT_ID;

    if (header.alg !== 'RS256' || !header.kid) return null;
    if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
    if (typeof payload.iat !== 'number' || payload.iat > now + 300) return null;
    if (typeof payload.sub !== 'string' || !payload.sub) return null;

    const key = await publicKey(header.kid);
    if (!key) return null;
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      bytesFromBase64Url(encodedSignature),
      utf8(`${encodedHeader}.${encodedPayload}`),
    );
    if (!valid || payload.admin !== true) return null;
    return { uid: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined };
  } catch (error) {
    console.error('ID token verification failed', error);
    return null;
  }
}
