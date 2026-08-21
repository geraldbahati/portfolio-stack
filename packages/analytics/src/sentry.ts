const SENSITIVE_QUERY_PARAMS = ["token", "secret", "key", "password", "api_key", "email"];

export function sentryBeforeSend(event: {
  request?: { url?: string };
  user?: { id?: string | number };
}) {
  if (event.request?.url) {
    try {
      const url = new URL(event.request.url);
      for (const parameter of SENSITIVE_QUERY_PARAMS) {
        url.searchParams.delete(parameter);
      }
      event.request.url = url.toString();
    } catch {
      delete event.request.url;
    }
  }

  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : undefined;
  }

  return event;
}

export function sentryOptions(dsn: string | undefined, environment: string) {
  return {
    dsn: dsn || undefined,
    enabled: Boolean(dsn),
    environment,
    tracesSampleRate: environment === "development" ? 1 : 0.1,
    sendDefaultPii: false,
    maxBreadcrumbs: 30,
    attachStacktrace: true,
    beforeSend: sentryBeforeSend as never,
  };
}
