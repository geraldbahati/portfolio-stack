type ResendSendInput = {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  fetchImpl?: typeof fetch;
};

export async function sendResendEmail(input: ResendSendInput): Promise<string | null> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
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
