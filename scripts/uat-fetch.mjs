// Optional gateway authentication for the existing HTTP verification/seed scripts.
// Credentials are supplied through environment variables, never source or URLs.
export async function fetchWithUatAccess(input, options = {}) {
  const target = new URL(input);
  const allowedOrigin = new URL(process.env.CASHBACK_API_URL ?? 'http://localhost:44305').origin;
  const headers = new Headers(options.headers);
  if (target.origin === allowedOrigin) {
    if (process.env.CASHBACK_UAT_BASIC_AUTH)
      headers.set('Authorization', `Basic ${process.env.CASHBACK_UAT_BASIC_AUTH}`);
    if (process.env.CASHBACK_RUN_ID_TOKEN)
      headers.set('X-Serverless-Authorization', `Bearer ${process.env.CASHBACK_RUN_ID_TOKEN}`);
  }
  return globalThis.fetch(input, { ...options, headers, redirect: 'error' });
}
