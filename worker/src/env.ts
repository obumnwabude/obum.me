export interface Env {
  /** Static files in ./public (404.css, favicon.ico, obum.jpg, robots.txt). */
  ASSETS: Fetcher;
  /** Workers Analytics Engine dataset for per-click analytics. */
  CLICKS?: AnalyticsEngineDataset;

  FIREBASE_PROJECT_ID: string;
  CF_ACCOUNT_ID: string;
  ANALYTICS_DATASET: string;
  ALLOWED_ORIGINS: string;
  HOME_URL: string;

  /** Secret: full JSON of a Firebase service account key. Enables request logs + click counts. */
  FIREBASE_SERVICE_ACCOUNT?: string;
  /** Secret: Cloudflare API token with "Account Analytics: Read". Enables the admin stats API. */
  CF_API_TOKEN?: string;
}

/** A short link as the redirect path needs it. */
export interface LinkRef {
  id: string;
  long: string;
}
