import {
  ADMIN_MEDIA_MAX_BYTES,
  isAdminImageType,
  isAdminMediaFolder,
} from "@portfolio-stack/media/admin";

function setStatus(element: HTMLElement, message: string, isError = false) {
  element.textContent = message;
  element.dataset.error = String(isError);
}

const uploadForm = document.querySelector<HTMLFormElement>("[data-media-upload]");
if (uploadForm) {
  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = uploadForm.querySelector<HTMLElement>("[data-upload-status]");
    const submit = uploadForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    const fileInput = uploadForm.elements.namedItem("file");
    const folderInput = uploadForm.elements.namedItem("folder");
    const altInput = uploadForm.elements.namedItem("alt");
    if (
      !status ||
      !(fileInput instanceof HTMLInputElement) ||
      !(folderInput instanceof HTMLSelectElement) ||
      !(altInput instanceof HTMLInputElement)
    ) {
      return;
    }

    const file = fileInput.files?.[0];
    const folder = folderInput.value;
    const alt = altInput.value.trim();
    if (!file) return setStatus(status, "Choose an image to upload.", true);
    if (!isAdminImageType(file.type)) {
      return setStatus(status, "Choose an AVIF, GIF, JPEG, PNG, or WebP image.", true);
    }
    if (file.size < 1 || file.size > ADMIN_MEDIA_MAX_BYTES) {
      return setStatus(status, "Images must be 25 MiB or smaller.", true);
    }
    if (!isAdminMediaFolder(folder) || alt.length < 2 || alt.length > 240) {
      return setStatus(status, "Choose a folder and provide concise alt text.", true);
    }

    submit?.setAttribute("disabled", "");
    uploadForm.setAttribute("aria-busy", "true");
    setStatus(status, `Uploading ${file.name}…`);
    try {
      const response = await fetch(uploadForm.dataset.uploadUrl ?? "", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": file.type,
          "x-media-folder": encodeURIComponent(folder),
          "x-media-filename": encodeURIComponent(file.name),
          "x-media-alt": encodeURIComponent(alt),
        },
        body: file,
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "The image could not be uploaded.");
      window.location.assign("/admin/media?notice=uploaded");
    } catch (error) {
      setStatus(
        status,
        error instanceof Error ? error.message : "The image could not be uploaded.",
        true,
      );
      submit?.removeAttribute("disabled");
      uploadForm.removeAttribute("aria-busy");
    }
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy-media-url]")) {
  button.addEventListener("click", async () => {
    const inputId = button.dataset.copyMediaUrl;
    const input = inputId ? document.getElementById(inputId) : null;
    if (!(input instanceof HTMLInputElement)) return;
    try {
      await navigator.clipboard.writeText(input.value);
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy URL";
      }, 1800);
    } catch {
      input.focus();
      input.select();
    }
  });
}
