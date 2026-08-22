import { describe, expect, it } from "vitest";

import { isSameOriginFormPost, mutationErrorKey, parseAdminProjectForm } from "./project-form";

function validForm() {
  const form = new FormData();
  form.set("id", "new-project");
  form.set("title", "New project");
  form.set("src", "https://media.geraldbahati.dev/new-project.webp");
  form.set("type", "gif");
  form.set("sortOrder", "4");
  form.set("services", "Design\nEngineering");
  form.set("features", "Fast, Accessible");
  form.set("badges", "Astro, Cloudflare");
  return form;
}

describe("admin project forms", () => {
  it("normalizes lists and nullable fields", () => {
    const value = parseAdminProjectForm(validForm());
    expect(value.details.services).toEqual(["Design", "Engineering"]);
    expect(value.details.features).toEqual(["Fast", "Accessible"]);
    expect(value.badges).toEqual([
      { text: "Astro", position: "bottom-left" },
      { text: "Cloudflare", position: "bottom-right" },
    ]);
    expect(value.poster).toBeNull();
  });

  it("uses the route identifier during edits", () => {
    expect(parseAdminProjectForm(validForm(), "existing-project").id).toBe("existing-project");
  });

  it("requires same-origin form submissions", () => {
    const request = new Request("https://example.com/admin/projects/create", {
      method: "POST",
      headers: { origin: "https://example.com" },
    });
    const crossOrigin = new Request("https://example.com/admin/projects/create", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    });
    expect(isSameOriginFormPost(request)).toBe(true);
    expect(isSameOriginFormPost(crossOrigin)).toBe(false);
  });

  it("maps mutation failures to non-sensitive query keys", () => {
    expect(mutationErrorKey({ code: "CONFLICT" })).toBe("duplicate");
    expect(mutationErrorKey(new Error("private details"))).toBe("save-failed");
  });
});
