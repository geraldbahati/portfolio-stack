import { APIError } from "better-auth/api";
import { describe, expect, it } from "vitest";

import { signInAuditRecord } from "./audit";

const headers = new Headers({ "cf-ray": "ray-1" });

describe("signInAuditRecord", () => {
  it("attributes a successful sign-in to the user", () => {
    expect(
      signInAuditRecord({
        path: "/sign-in/email",
        returned: { token: "secret" },
        newSession: { user: { id: "user-1", email: "hello@geraldbahati.dev" } },
        body: { email: "hello@geraldbahati.dev", password: "never-recorded" },
        headers,
      }),
    ).toEqual({
      actor: { id: "user-1", email: "hello@geraldbahati.dev", requestId: "ray-1" },
      entry: { action: "auth.sign_in", entityType: "session", entityId: "user-1" },
    });
  });

  it("records a failed attempt with a reason category and no password", () => {
    const record = signInAuditRecord({
      path: "/sign-in/email",
      returned: new APIError("UNAUTHORIZED", { message: "Invalid email or password" }),
      newSession: null,
      body: { email: " Attacker@Example.com ", password: "hunter2" },
      headers,
    });
    expect(record).toEqual({
      actor: { id: null, email: "attacker@example.com", requestId: "ray-1" },
      entry: {
        action: "auth.sign_in",
        entityType: "session",
        outcome: "failed",
        metadata: { reason: "invalid_credentials" },
      },
    });
    expect(JSON.stringify(record)).not.toContain("hunter2");
  });

  it("classifies rate limiting", () => {
    expect(
      signInAuditRecord({
        path: "/sign-in/email",
        returned: new APIError("TOO_MANY_REQUESTS"),
        newSession: null,
        body: {},
        headers: undefined,
      })?.entry.metadata,
    ).toEqual({ reason: "rate_limited" });
  });

  it("ignores other endpoints", () => {
    expect(
      signInAuditRecord({
        path: "/get-session",
        returned: {},
        newSession: null,
        body: undefined,
        headers,
      }),
    ).toBeNull();
  });
});
