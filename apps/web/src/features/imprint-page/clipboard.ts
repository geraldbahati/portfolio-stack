export function initImprintClipboard(root: ParentNode = document) {
  for (const button of root.querySelectorAll<HTMLButtonElement>(".imprint-copy-button")) {
    button.addEventListener("click", async () => {
      const value = button.dataset.copy;
      if (!value) return;

      try {
        await navigator.clipboard.writeText(value);
        button.dataset.copied = "true";
        button.setAttribute("aria-label", "Copied");
        window.setTimeout(() => {
          delete button.dataset.copied;
          button.setAttribute(
            "aria-label",
            value.includes("@") ? "Copy email address" : "Copy phone number",
          );
        }, 2000);
      } catch {
        // The email and phone links remain available if clipboard access is blocked.
      }
    });
  }
}
