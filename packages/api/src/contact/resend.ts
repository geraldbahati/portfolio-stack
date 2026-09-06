type ResendSendInput = {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  idempotencyKey: string;
  fetchImpl?: typeof fetch;
};

export async function sendResendEmail(input: ResendSendInput): Promise<string | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo ? [input.replyTo] : undefined,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { id?: string };
  return data.id ?? null;
}
