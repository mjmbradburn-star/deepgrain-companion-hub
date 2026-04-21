// Pure helper for invoking the `send-transactional-email` function with the
// service-role key in the Authorization header.
//
// Extracted so it can be unit-tested in isolation. The handler in `index.ts`
// uses the same shape inline; this module exists so tests can verify the
// fetch contract without booting the full PDF pipeline.
//
// Why direct fetch (and not `admin.functions.invoke`)?
//   `supabase.functions.invoke` does NOT forward the service-role key as the
//   bearer token — it forwards the caller's JWT (or none). Against an edge
//   function deployed with `verify_jwt = true`, that produces
//   `UNAUTHORIZED_INVALID_JWT_FORMAT` at the gateway. Using fetch lets us
//   set both `Authorization: Bearer <SR>` and `apikey: <SR>` explicitly.

export interface SendTransactionalEmailArgs {
  supabaseUrl: string
  serviceRoleKey: string
  templateName: string
  recipientEmail: string
  idempotencyKey: string
  templateData: Record<string, unknown>
  /** Injectable for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch
}

export interface SendTransactionalEmailResult {
  ok: boolean
  status: number
  /** Populated when ok=false to aid logging. */
  errorBody?: string
}

export async function sendTransactionalEmailViaFetch(
  args: SendTransactionalEmailArgs,
): Promise<SendTransactionalEmailResult> {
  const f = args.fetchImpl ?? fetch
  const res = await f(`${args.supabaseUrl}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${args.serviceRoleKey}`,
      apikey: args.serviceRoleKey,
    },
    body: JSON.stringify({
      templateName: args.templateName,
      recipientEmail: args.recipientEmail,
      idempotencyKey: args.idempotencyKey,
      templateData: args.templateData,
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '')
    return { ok: false, status: res.status, errorBody }
  }
  // Drain the body to avoid Deno resource leak warnings in tests.
  await res.text().catch(() => '')
  return { ok: true, status: res.status }
}
