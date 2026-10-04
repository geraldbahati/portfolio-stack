import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleMonitoringRequest, MAX_REPORT_BYTES, readBoundedText } from "./monitoring-relay";

const report = {
  distinct_id: "page-1",
  properties: {
    $exception_list: [{ type: "TypeError", value: "x is undefined" }],
    $current_url: "https://www.geraldbahati.dev/contact?token=secret",
  },
};

const relay = vi.fn();
const limit = vi.fn();
const deps = () => ({
  enabled: true,
  telemetry: { relay } as never,
  limiter: { limit },
});

function request(body: BodyInit, headers: Record<string, string> = {}) {
  return new Request("https://www.geraldbahati.dev/monitoring", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.9", ...headers },
    body,
  });
}

beforeEach(() => {
  relay.mockReset();
  limit.mockReset();
  limit.mockResolvedValue({ success: true });
});

describe("handleMonitoringRequest", () => {
  it("relays a valid report as a browser exception after scrubbing it", async () => {
    const response = await handleMonitoringRequest(request(JSON.stringify(report)), deps());

    expect(response.status).toBe(202);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(limit).toHaveBeenCalledWith({ key: "monitoring:203.0.113.9" });
    expect(relay).toHaveBeenCalledWith({
      event: "$exception",
      distinct_id: "page-1",
      timestamp: undefined,
      properties: {
        $exception_list: report.properties.$exception_list,
        $current_url: "https://www.geraldbahati.dev/contact",
        service: "browser",
      },
    });
  });

  it("rejects an oversized declared length before rate limiting or reading", async () => {
    const response = await handleMonitoringRequest(
      request("{}", { "content-length": String(MAX_REPORT_BYTES + 1) }),
      deps(),
    );
    expect(response.status).toBe(413);
    expect(limit).not.toHaveBeenCalled();
  });

  it("stops reading a body that exceeds the limit without a declared length", async () => {
    const response = await handleMonitoringRequest(
      request(JSON.stringify({ padding: "x".repeat(MAX_REPORT_BYTES) })),
      deps(),
    );
    expect(response.status).toBe(413);
    expect(relay).not.toHaveBeenCalled();
  });

  it("rate limits per client", async () => {
    limit.mockResolvedValueOnce({ success: false });
    expect((await handleMonitoringRequest(request(JSON.stringify(report)), deps())).status).toBe(
      429,
    );
    expect(relay).not.toHaveBeenCalled();
  });

  it("refuses payloads that are not exception reports", async () => {
    const pageview = { ...report, event: "$pageview" };
    expect((await handleMonitoringRequest(request(JSON.stringify(pageview)), deps())).status).toBe(
      400,
    );
    expect((await handleMonitoringRequest(request("not json"), deps())).status).toBe(400);
    expect(
      (await handleMonitoringRequest(request("{}", { "content-type": "text/plain" }), deps()))
        .status,
    ).toBe(415);
  });

  it("is unavailable when error tracking is not configured", async () => {
    expect(
      (
        await handleMonitoringRequest(request(JSON.stringify(report)), {
          ...deps(),
          enabled: false,
        })
      ).status,
    ).toBe(503);
  });
});

describe("readBoundedText", () => {
  it("cancels the stream once the limit is crossed", async () => {
    const cancel = vi.fn();
    let pulls = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(1_024));
      },
      cancel,
    });

    expect(await readBoundedText(stream, 4_096)).toBeNull();
    expect(cancel).toHaveBeenCalled();
    expect(pulls).toBeLessThan(10);
  });
});
