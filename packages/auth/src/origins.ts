export function parseTrustedOrigins(value: string | undefined): string[] {
  const origins = (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(origins)];
}

export function originToHost(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin.replace(/^https?:\/\//, "");
  }
}

export function isLocalHttpUrl(url: string): boolean {
  return url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1");
}

export function cookieAttributes(environment: string, authUrl: string) {
  const local = environment === "development" || isLocalHttpUrl(authUrl);

  return {
    sameSite: local ? ("lax" as const) : ("none" as const),
    secure: !local,
    httpOnly: true,
  };
}

export const DEFAULT_STREAM_ORIGINS = [
  "geraldbahati.dev",
  "www.geraldbahati.dev",
  "localhost:4321",
  "localhost:3000",
] as const;

export function streamAllowedOrigins(trustedOrigins: string[]): string[] {
  const hosts = new Set<string>(DEFAULT_STREAM_ORIGINS);
  for (const origin of trustedOrigins) {
    hosts.add(originToHost(origin));
  }
  return [...hosts];
}
