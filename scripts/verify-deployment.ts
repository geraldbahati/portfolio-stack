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

if (new URL(webOrigin).protocol !== "https:" || new URL(serverOrigin).protocol !== "https:") {
  console.error("Production verification requires HTTPS web and API origins.");
  process.exit(1);
}

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
  check(
    response.headers.get("x-content-type-options") === "nosniff",
    `${path} prevents MIME sniffing`,
  );
  check(Boolean(response.headers.get("referrer-policy")), `${path} has a referrer policy`);
  check(Boolean(response.headers.get("permissions-policy")), `${path} has a permissions policy`);
  check(
    response.headers.get("strict-transport-security")?.includes("max-age=") === true,
    `${path} enforces HTTPS with HSTS`,
  );
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
if (serverHealth) {
  check(serverHealth.ok, "the API Worker health endpoint is available");
  check((await serverHealth.text()) === "OK", "the API Worker returns the expected health body");
  check(
    serverHealth.headers.get("x-content-type-options") === "nosniff",
    "the API Worker prevents MIME sniffing",
  );
  check(
    serverHealth.headers.get("strict-transport-security")?.includes("max-age=") === true,
    "the API Worker enforces HTTPS with HSTS",
  );
}

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

const hostileCors = await fetchChecked(new URL("/api/auth/get-session", serverOrigin).href, {
  method: "OPTIONS",
  headers: {
    Origin: "https://attacker.invalid",
    "Access-Control-Request-Method": "GET",
  },
});
if (hostileCors) {
  check(
    hostileCors.headers.get("access-control-allow-origin") === null,
    "CORS does not reflect an untrusted origin",
  );
}

const adminSession = await fetchChecked(new URL("/internal/admin-session", serverOrigin).href);
if (adminSession) {
  check(adminSession.status === 401, "the anonymous admin session endpoint is unauthorized");
  check(
    adminSession.headers.get("cache-control")?.includes("no-store") === true,
    "anonymous admin API responses are not cached",
  );
  check(
    adminSession.headers.get("x-robots-tag")?.includes("noindex") === true,
    "anonymous admin API responses are not indexed",
  );
}

for (const path of ["/internal/seed-admin", "/internal/seed-projects"]) {
  const response = await fetchChecked(new URL(path, serverOrigin).href, { method: "POST" });
  if (response) check(response.status === 404, `${path} is disabled after bootstrap`);
}

const publicSettings = await fetchChecked(new URL("/rpc/settings/getPublic", serverOrigin).href, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
if (publicSettings) check(publicSettings.ok, "the public settings RPC is available");

const privateOverview = await fetchChecked(new URL("/rpc/admin/overview", serverOrigin).href, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
if (privateOverview) {
  check(
    privateOverview.status === 401 || privateOverview.status === 403,
    "the admin RPC rejects anonymous callers",
  );
}

if (failures.length > 0) {
  console.error(`\nDeployment verification failed (${failures.length} checks).`);
  process.exit(1);
}

console.log("\nDeployment verification passed.");
