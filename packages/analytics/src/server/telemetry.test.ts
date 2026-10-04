import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createServerTelemetry } from "./telemetry";

type Batch = {
  api_key: string;
  batch: Array<{ event: string; distinct_id: string; properties: Record<string, unknown> }>;
};

const fetchMock = vi.fn<typeof fetch>();
let deferred: Promise<unknown>[] = [];

function telemetry(apiKey: string | undefined = "phc_test_project_token") {
  return createServerTelemetry({
    apiKey,
    service: "api",
    environment: "production",
    release: "version-1",
    defer: (task) => {
      deferred.push(task);
    },
  });
}

async function sentBatches(): Promise<Batch[]> {
  await Promise.all(deferred);
  return fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as Batch);
}

beforeEach(() => {
  deferred = [];
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createServerTelemetry", () => {
  it("defers delivery instead of blocking the caller", () => {
    telemetry().capture("inquiry_email_status_changed", { distinctId: "email-1" });
    expect(deferred).toHaveLength(1);
  });

  it("sends exceptions with operation, correlation context, and base properties", async () => {
    telemetry()
      .withContext({ request_id: "req-1", actor_id: "user-1" })
      .captureException(new Error("D1 unavailable"), {
        operation: "rpc.admin.projects.update",
        handled: false,
      });

    const [batch] = await sentBatches();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://eu.i.posthog.com/batch/");
    const event = batch?.batch[0];
    expect(event?.event).toBe("$exception");
    expect(event?.distinct_id).toBe("user-1");
    expect(event?.properties).toMatchObject({
      operation: "rpc.admin.projects.update",
      request_id: "req-1",
      service: "api",
      environment: "production",
      release: "version-1",
      $process_person_profile: false,
      $geoip_disable: true,
      $exception_level: "error",
    });
  });

  it("reports the same error object only once", async () => {
    const error = new Error("boom");
    const client = telemetry();
    client.captureException(error, { operation: "contact.send_inquiry" });
    client.captureException(error, { operation: "rpc.contact.submit" });

    expect(await sentBatches()).toHaveLength(1);
  });

  it("scrubs URL context and bounds long strings", async () => {
    telemetry().capture("server_event", {
      distinctId: "d",
      properties: { $current_url: "https://x.dev/a?token=1", note: "y".repeat(400) },
    });

    const [batch] = await sentBatches();
    expect(batch?.batch[0]?.properties.$current_url).toBe("https://x.dev/a");
    expect(String(batch?.batch[0]?.properties.note)).toHaveLength(256);
  });

  it("still writes a structured log when no project token is configured", () => {
    telemetry("").captureException(new Error("Resend rejected sender@example.com"), {
      operation: "contact.send_inquiry",
    });

    expect(deferred).toHaveLength(0);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "exception",
        operation: "contact.send_inquiry",
        error_message: "Resend rejected [email]",
      }),
    );
  });

  it("never throws when delivery fails", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    telemetry().capture("event", { distinctId: "d" });
    await expect(Promise.all(deferred)).resolves.toEqual([false]);
  });
});
