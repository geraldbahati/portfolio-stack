import type { APIRoute } from "astro";

import { renderRobotsTxt } from "../lib/seo/robots";

export const prerender = true;

const body = renderRobotsTxt();

export const GET: APIRoute = () =>
  new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
