import { describe, expect, it } from "vitest";

import { describeEnvFailure } from "./validate";

const valid = {
  BETTER_AUTH_SECRET: "a-secret",
  BETTER_AUTH_URL: "https://portfolio-api.geraldbahati.dev",
  CORS_ORIGIN: "https://www.geraldbahati.dev",
  ENVIRONMENT: "production",
};

describe("describeEnvFailure", () => {
  it("accepts a complete environment", () => {
    expect(describeEnvFailure(valid)).toBeNull();
  });

  it("accepts every environment the stack deploys", () => {
    for (const ENVIRONMENT of ["development", "test", "production"]) {
      expect(describeEnvFailure({ ...valid, ENVIRONMENT })).toBeNull();
    }
  });

  it("ignores bindings, which are not attached when Workers validates startup", () => {
    expect(describeEnvFailure({ ...valid, DB: undefined, MEDIA: undefined })).toBeNull();
  });

  it("reports a missing secret rather than accepting an empty string", () => {
    expect(describeEnvFailure({ ...valid, BETTER_AUTH_SECRET: "" })).toContain(
      "BETTER_AUTH_SECRET",
    );
  });

  it("rejects an auth URL that is not a URL", () => {
    expect(describeEnvFailure({ ...valid, BETTER_AUTH_URL: "portfolio-api" })).toContain(
      "BETTER_AUTH_URL",
    );
  });

  it("rejects an unknown environment name", () => {
    expect(describeEnvFailure({ ...valid, ENVIRONMENT: "staging" })).toContain("ENVIRONMENT");
  });

  it("collects every problem at once so one deploy surfaces them all", () => {
    const failure = describeEnvFailure({ ENVIRONMENT: "production" });
    for (const key of ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "CORS_ORIGIN"]) {
      expect(failure).toContain(key);
    }
  });

  it("leaves optional configuration alone", () => {
    expect(describeEnvFailure({ ...valid, RESEND_API_KEY: undefined })).toBeNull();
  });
});
