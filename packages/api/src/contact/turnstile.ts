export async function verifyTurnstileToken(options: {
  secret: string | undefined;
  token: string | undefined;
  ip?: string;
  fetchImpl?: typeof fetch;
}): Promise<boolean> {
  if (!options.secret) {
    return true;
  }

  if (!options.token) {
    return false;
  }

  const body = new FormData();
  body.set("secret", options.secret);
  body.set("response", options.token);
  if (options.ip) {
    body.set("remoteip", options.ip);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      return false;
    }
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
