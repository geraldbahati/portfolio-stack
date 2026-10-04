import { describe, expect, it } from "vitest";

import { buildExceptionProperties } from "./exception";

function thrower(): never {
  throw new TypeError("Cannot read properties of undefined (reading 'id')");
}

function caught(fn: () => never): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
}

describe("buildExceptionProperties", () => {
  it("builds a PostHog exception list with parsed worker frames", () => {
    const properties = buildExceptionProperties(caught(thrower), {
      runtime: "worker",
      handled: false,
      mechanism: "middleware",
    });

    const [exception] = properties.$exception_list;
    expect(exception?.type).toBe("TypeError");
    expect(exception?.value).toContain("reading 'id'");
    expect(exception?.mechanism).toMatchObject({ handled: false, type: "middleware" });
    expect(exception?.stacktrace?.type).toBe("raw");
    expect(exception?.stacktrace?.frames?.length).toBeGreaterThan(0);
    expect(
      exception?.stacktrace?.frames?.every((frame) => frame.platform === "node:javascript"),
    ).toBe(true);
    expect(properties.$exception_level).toBe("error");
  });

  it("includes the cause chain", () => {
    const error = new Error("Public data unavailable", { cause: new Error("timed out") });
    const types = buildExceptionProperties(error, { runtime: "worker" }).$exception_list.map(
      (exception) => exception.value,
    );
    expect(types).toEqual(["Public data unavailable", "timed out"]);
  });

  it("redacts email addresses from exception messages", () => {
    const properties = buildExceptionProperties(new Error("UNIQUE failed for a@b.co"), {
      runtime: "worker",
    });
    expect(properties.$exception_list[0]?.value).toBe("UNIQUE failed for [email]");
  });

  it("accepts non-error values and an explicit fingerprint", () => {
    const properties = buildExceptionProperties("resend rejected the request", {
      runtime: "browser",
      fingerprint: "contact.send_inquiry",
      level: "warning",
    });
    expect(properties.$exception_list[0]?.value).toBe("resend rejected the request");
    expect(properties.$exception_fingerprint).toBe("contact.send_inquiry");
    expect(properties.$exception_level).toBe("warning");
  });
});
