import * as Sentry from "@sentry/astro";

export class PublicDataUnavailableError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Public data unavailable: ${operation}`, { cause });
    this.name = "PublicDataUnavailableError";
  }
}

/** Cancel the underlying HTTP request as well as bounding the render wait. */
export async function fetchPublicData<T>(
  operation: string,
  timeoutMs: number,
  load: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      load(controller.signal),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          const cause = new Error(`Public data request timed out: ${operation}`);
          controller.abort(cause);
          reject(cause);
        }, timeoutMs);
      }),
    ]);
  } catch (cause) {
    const error = new PublicDataUnavailableError(operation, cause);
    Sentry.captureException(error, { tags: { area: "public-data", operation } });
    throw error;
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

/** Apply to the existing error page or an endpoint's temporary failure. */
export function serviceUnavailable(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("CDN-Cache-Control", "no-store");
  headers.set("Retry-After", "30");
  return new Response(response.body, { status: 503, headers });
}
