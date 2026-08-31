/**
 * Copy for the floating live-site shortcut. The bare host reads as the link
 * itself, which is what the hint beside it promises.
 */
export function siteHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/**
 * Keeps the visible text inside the accessible name, so speech input can act
 * on what it reads (WCAG 2.5.3 Label in Name).
 */
export function liveJumpLabel(host: string | null, title: string): string {
  return host ? `Visit ${host}, the live ${title} site` : `Visit the live ${title} site`;
}
