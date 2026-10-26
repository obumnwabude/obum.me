import { autoId, base64UrlFromBytes, base64UrlFromString, derFromPem, utf8 } from './encoding';
import type { Env, LinkRef } from './env';

const API = 'https://firestore.googleapis.com/v1';

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Returns an OAuth access token for the Firebase service account, or null when
 * the FIREBASE_SERVICE_ACCOUNT secret is not set. Tokens are reused until close to expiry.
 */
export async function getAccessToken(env: Env): Promise<string | null> {
  if (!env.FIREBASE_SERVICE_ACCOUNT) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 120 > now) return cachedToken.token;

  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount;
  const header = base64UrlFromString(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64UrlFromString(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await crypto.subtle.importKey(
    'pkcs8',
    derFromPem(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8(`${header}.${claims}`));
  const assertion = `${header}.${claims}.${base64UrlFromBytes(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!response.ok) throw new Error(`Service account token exchange failed (${response.status}): ${await response.text()}`);
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in };
  return cachedToken.token;
}

const databasePath = (env: Env) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const docName = (env: Env, path: string) => `${databasePath(env)}/${path}`;

async function authHeaders(env: Env): Promise<Record<string, string>> {
  const token = await getAccessToken(env).catch((error) => {
    console.error('Could not get service account token, falling back to public read', error);
    return null;
  });
  return token ? { authorization: `Bearer ${token}` } : {};
}

/**
 * Finds the link whose `short` equals the slug. Works without a service account
 * because the Firestore rules allow public reads of /links.
 */
export async function findLinkBySlug(slug: string, env: Env): Promise<LinkRef | null> {
  const response = await fetch(`${API}/${databasePath(env)}:runQuery`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authHeaders(env)) },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'links' }],
        where: { fieldFilter: { field: { fieldPath: 'short' }, op: 'EQUAL', value: { stringValue: slug } } },
        limit: 1,
      },
    }),
  });
  if (!response.ok) throw new Error(`Firestore query failed (${response.status}): ${await response.text()}`);

  const rows = (await response.json()) as Array<{
    document?: { name: string; fields?: Record<string, { stringValue?: string }> };
  }>;
  const document = rows.find((row) => row.document)?.document;
  const long = document?.fields?.long?.stringValue;
  if (!document || !long) return null;
  return { id: document.name.split('/').pop()!, long };
}

interface VisitRecord {
  request: Request;
  path: string;
  link: LinkRef | null;
  isBot: boolean;
}

/**
 * Logs the request to the `requests` collection (same shape the old Cloud Function wrote:
 * headers, timestamp, url), bumps counters/requests, and for real (non-bot) visits to a
 * known link bumps its `clicks` and `lastClickedAt`. All in one atomic commit.
 */
export async function logVisit(env: Env, visit: VisitRecord): Promise<void> {
  const token = await getAccessToken(env);
  if (!token) return;

  const headers: Record<string, { stringValue: string }> = {};
  visit.request.headers.forEach((value, key) => {
    headers[key] = { stringValue: value };
  });

  const writes: unknown[] = [
    {
      update: {
        name: docName(env, `requests/${autoId()}`),
        fields: { headers: { mapValue: { fields: headers } }, url: { stringValue: visit.path } },
      },
      updateTransforms: [{ fieldPath: 'timestamp', setToServerValue: 'REQUEST_TIME' }],
      currentDocument: { exists: false },
    },
    {
      update: { name: docName(env, 'counters/requests'), fields: {} },
      updateMask: { fieldPaths: [] },
      updateTransforms: [{ fieldPath: 'count', increment: { integerValue: '1' } }],
    },
  ];
  const linkWrite =
    visit.link && !visit.isBot
      ? {
          update: { name: docName(env, `links/${visit.link.id}`), fields: {} },
          updateMask: { fieldPaths: [] },
          updateTransforms: [
            { fieldPath: 'clicks', increment: { integerValue: '1' } },
            { fieldPath: 'lastClickedAt', setToServerValue: 'REQUEST_TIME' },
          ],
          // Never recreate a link that was deleted a moment ago.
          currentDocument: { exists: true },
        }
      : null;

  const commit = (allWrites: unknown[]) =>
    fetch(`${API}/${databasePath(env)}:commit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ writes: allWrites }),
    });

  let response = await commit(linkWrite ? [...writes, linkWrite] : writes);
  if (!response.ok && linkWrite) {
    // The link may have been deleted meanwhile; still keep the request log.
    response = await commit(writes);
  }
  if (!response.ok) console.error(`Firestore commit failed (${response.status}): ${await response.text()}`);
}
