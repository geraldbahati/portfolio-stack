import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const envelope = await request.text();
  const headerLine = envelope.split("\n")[0];
  if (!headerLine) {
    return new Response("{}", { status: 400 });
  }

  let dsn: string | undefined;
  try {
    dsn = (JSON.parse(headerLine) as { dsn?: string }).dsn;
  } catch {
    return new Response("{}", { status: 400 });
  }

  if (!dsn) {
    return new Response("{}", { status: 400 });
  }

  let ingestUrl: string;
  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/^\//, "");
    ingestUrl = `https://${parsed.host}/api/${projectId}/envelope/`;
  } catch {
    return new Response("{}", { status: 400 });
  }

  await fetch(ingestUrl, {
    method: "POST",
    body: envelope,
    headers: {
      "Content-Type": "application/x-sentry-envelope",
    },
  });

  return new Response("{}", { status: 200 });
};
