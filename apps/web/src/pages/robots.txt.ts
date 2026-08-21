import type { APIRoute } from "astro";

import { SITE_URL } from "../lib/site";

export const prerender = true;

const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /login
Disallow: /signup
Disallow: /gbx
Disallow: /monitoring

Sitemap: ${SITE_URL}/sitemap.xml
Host: ${new URL(SITE_URL).host}
`;

export const GET: APIRoute = () =>
  new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
