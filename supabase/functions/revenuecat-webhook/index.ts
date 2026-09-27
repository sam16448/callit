/**
 * RevenueCat webhook → server-side Pro (see migrations/…revenuecat_webhook.sql).
 *
 * In RevenueCat: Project → Integrations → Webhooks → URL
 *   https://<project>.supabase.co/functions/v1/revenuecat-webhook
 * and set "Authorization header value" to the shared secret whose SHA-256 is
 * stored in public.webhook_secrets (name 'revenuecat').
 *
 * Deployed with verify_jwt off (RevenueCat can't send a Supabase login);
 * the shared secret is the check instead.
 */
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('missing Supabase env');
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const secret = req.headers.get('Authorization') ?? '';
    const ok = await rpc<boolean>('check_webhook_secret', { p_name: 'revenuecat', p_secret: secret });
    if (!ok) return new Response('Unauthorized', { status: 401 });

    const body = (await req.json().catch(() => null)) as { event?: Record<string, unknown> } | null;
    if (!body?.event || typeof body.event.type !== 'string') return new Response('Bad request', { status: 400 });

    const updated = await rpc<number>('apply_revenuecat_event', { p_event: body.event });
    return Response.json({ ok: true, type: body.event.type, updated });
  } catch (e) {
    // 500 makes RevenueCat retry later; the event id makes retries safe.
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
});
