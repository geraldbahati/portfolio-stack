export type Surface =
  | "hero"
  | "navbar"
  | "menu_overlay"
  | "footer"
  | "contact_section"
  | "contact_page"
  | "project_detail"
  | "project_detail_sticky"
  | "projects_index"
  | "home_grid";

export type ContactChannel = "phone" | "whatsapp" | "email";

import { getConsent } from "./consent";
import { scrubUrlProperties } from "./privacy/url";

type EventProperties = Record<string, string | number | boolean | undefined>;

export type CaptureOptions = { timestamp?: Date };

type CaptureFn = (event: string, properties?: EventProperties, options?: CaptureOptions) => void;

type QueuedEvent = { event: string; properties?: EventProperties; timestamp: Date };

/**
 * Interactions that happen while PostHog is still loading are held here, but
 * only once the visitor has accepted analytics. The cap bounds memory on a
 * page where the SDK never loads (blocked, offline); later events are dropped.
 */
const MAX_QUEUED_EVENTS = 50;

let captureImpl: CaptureFn | null = null;
const queue: QueuedEvent[] = [];

/** Connect the loaded SDK and replay anything captured before it arrived. */
export function setAnalyticsCapture(fn: CaptureFn | null) {
  captureImpl = fn;
  if (!fn) return;

  const pending = queue.splice(0);
  for (const queued of pending) {
    deliver(queued.event, queued.properties, { timestamp: queued.timestamp });
  }
}

/** Discard queued events, e.g. when the visitor declines analytics. */
export function clearAnalyticsQueue() {
  queue.length = 0;
}

function deliver(event: string, properties?: EventProperties, options?: CaptureOptions) {
  try {
    captureImpl?.(event, properties, options);
  } catch (error) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
      console.warn("[analytics] capture failed", event, error);
    }
  }
}

/**
 * Returns whether the event was delivered or queued. Callers that record an
 * event once (impressions) use `false` to try again later.
 */
function capture(event: string, properties?: EventProperties): boolean {
  const safeProperties = properties ? scrubUrlProperties(properties) : undefined;

  if (captureImpl) {
    deliver(event, safeProperties);
    return true;
  }

  if (getConsent() !== "accepted" || queue.length >= MAX_QUEUED_EVENTS) {
    return false;
  }

  queue.push({ event, properties: safeProperties, timestamp: new Date() });
  return true;
}

export function trackContactCtaClicked(params: {
  surface: Surface;
  label: string;
  destination?: string;
}) {
  return capture("contact_cta_clicked", params);
}

export function trackContactFormStarted(params: { first_field: string }) {
  return capture("contact_form_started", params);
}

export function trackContactFormSubmitted(params: {
  outcome: "success" | "error";
  message_length?: number;
  duration_ms?: number;
  error_reason?: string;
}) {
  return capture("contact_form_submitted", params);
}

export function trackContactChannelClicked(params: { channel: ContactChannel; surface: Surface }) {
  return capture("contact_channel_clicked", params);
}

export function trackProjectCardViewed(params: {
  project_slug: string;
  project_title?: string;
  surface?: Surface;
}) {
  return capture("project_card_viewed", params);
}

export function trackProjectOpened(params: {
  project_slug: string;
  project_title?: string;
  surface?: Surface;
  position?: number;
}) {
  return capture("project_opened", params);
}

export function trackScrollDepthReached(params: {
  depth: number;
  page: string;
  project_slug?: string;
}) {
  return capture("scroll_depth_reached", params);
}

export function trackNavigationClicked(params: {
  label: string;
  destination: string;
  surface: Surface;
}) {
  return capture("navigation_clicked", params);
}

export function trackMenuToggled(params: { state: "opened" | "closed" }) {
  return capture("menu_toggled", params);
}

export function trackOutboundLinkClicked(params: {
  destination: string;
  surface: Surface;
  platform?: string;
}) {
  let host: string | undefined;
  try {
    host = new URL(params.destination).hostname;
  } catch {
    host = undefined;
  }

  return capture("outbound_link_clicked", { ...params, destination_host: host });
}

export function trackFaqOpened(params: { question: string; position: number }) {
  return capture("faq_opened", params);
}

export function trackSectionViewed(params: { section_id: string; page: string }) {
  return capture("section_viewed", params);
}

export function trackAnalyticsConsentUpdated(params: { decision: "accepted" | "rejected" }) {
  return capture("analytics_consent_updated", params);
}
