const webUrl = process.env.WEB_URL ?? process.argv[2];
const serverUrl = process.env.SERVER_URL ?? process.argv[3];

if (!webUrl || !serverUrl) {
  console.error(
    "Usage: bun run verify:deployment -- https://staging.example.com https://api.staging.example.com",
  );
  process.exit(1);
}

const webOrigin = new URL(webUrl).origin;
const serverOrigin = new URL(serverUrl).origin;
const failures: string[] = [];

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`PASS ${message}`);
  } else {
    failures.push(message);
    console.error(`FAIL ${message}`);
  }
}

async function fetchChecked(url: string, init?: RequestInit) {
  try {
    return await fetch(url, init);
  } catch (error) {
    failures.push(`${url} was unreachable: ${String(error)}`);
    return null;
  }
}

for (const path of ["/", "/projects", "/contact", "/privacy", "/imprint"]) {
  const response = await fetchChecked(new URL(path, webOrigin).href);
  if (!response) continue;
  check(response.ok, `${path} returns a successful response`);
  check(Boolean(response.headers.get("content-security-policy")), `${path} has a CSP`);
  check(Boolean(response.headers.get("cache-control")), `${path} has an explicit cache policy`);
}

const robots = await fetchChecked(new URL("/robots.txt", webOrigin).href);
if (robots) {
  const body = await robots.text();
  check(robots.ok, "/robots.txt is available");
  check(body.includes("Disallow: /admin"), "/robots.txt excludes the admin surface");
  check(body.includes("/sitemap.xml"), "/robots.txt names the sitemap");
}

const manifest = await fetchChecked(new URL("/manifest.webmanifest", webOrigin).href);
if (manifest) {
  check(manifest.ok, "/manifest.webmanifest is available");
}

const admin = await fetchChecked(new URL("/admin", webOrigin).href, { redirect: "manual" });
if (admin) {
  check(admin.status === 302, "anonymous /admin requests redirect on the server");
  check(
    admin.headers.get("location")?.startsWith("/login?returnTo=") === true,
    "the admin redirect preserves a safe return path",
  );
  check(
    admin.headers.get("x-robots-tag")?.includes("noindex") === true,
    "private responses send X-Robots-Tag: noindex",
  );
}

const serverHealth = await fetchChecked(serverOrigin);
if (serverHealth) check(serverHealth.ok, "the API Worker health endpoint is available");

const apiReference = await fetchChecked(new URL("/api-reference", serverOrigin).href);
if (apiReference) {
  check(apiReference.status === 404, "the API reference is not mounted in production");
}

const cors = await fetchChecked(new URL("/api/auth/get-session", serverOrigin).href, {
  method: "OPTIONS",
  headers: {
    Origin: webOrigin,
    "Access-Control-Request-Method": "GET",
  },
});
if (cors) {
  check(
    cors.headers.get("access-control-allow-origin") === webOrigin,
    "CORS allows only this web origin",
  );
  check(
    cors.headers.get("access-control-allow-credentials") === "true",
    "credentialed auth requests are enabled",
  );
}

if (failures.length > 0) {
  console.error(`\nDeployment verification failed (${failures.length} checks).`);
  process.exit(1);
}

console.log("\nDeployment verification passed.");
