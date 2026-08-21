export type Surface =
  | "hero"
  | "navbar"
  | "menu_overlay"
  | "footer"
  | "contact_section"
  | "contact_page"
  | "project_detail"
  | "projects_index"
  | "home_grid";

export type ContactChannel = "phone" | "whatsapp" | "email";

type EventProperties = Record<string, string | number | boolean | undefined>;

type CaptureFn = (event: string, properties?: EventProperties) => void;

let captureImpl: CaptureFn = () => {};

export function setAnalyticsCapture(fn: CaptureFn) {
  captureImpl = fn;
}

function capture(event: string, properties?: EventProperties) {
  try {
    captureImpl(event, properties);
  } catch (error) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
      console.warn("[analytics] capture failed", event, error);
    }
  }
}

export function trackContactCtaClicked(params: {
  surface: Surface;
  label: string;
  destination?: string;
}) {
  capture("contact_cta_clicked", params);
}

export function trackContactFormStarted(params: { first_field: string }) {
  capture("contact_form_started", params);
}

export function trackContactFormSubmitted(params: {
  outcome: "success" | "error";
  message_length?: number;
  duration_ms?: number;
  error_reason?: string;
}) {
  capture("contact_form_submitted", params);
}

export function trackContactChannelClicked(params: { channel: ContactChannel; surface: Surface }) {
  capture("contact_channel_clicked", params);
}

export function trackProjectCardViewed(params: {
  project_slug: string;
  project_title?: string;
  surface?: Surface;
}) {
  capture("project_card_viewed", params);
}

export function trackProjectOpened(params: {
  project_slug: string;
  project_title?: string;
  surface?: Surface;
  position?: number;
}) {
  capture("project_opened", params);
}

export function trackScrollDepthReached(params: {
  depth: number;
  page: string;
  project_slug?: string;
}) {
  capture("scroll_depth_reached", params);
}

export function trackNavigationClicked(params: {
  label: string;
  destination: string;
  surface: Surface;
}) {
  capture("navigation_clicked", params);
}

export function trackMenuToggled(params: { state: "opened" | "closed" }) {
  capture("menu_toggled", params);
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

  capture("outbound_link_clicked", { ...params, destination_host: host });
}

export function trackFaqOpened(params: { question: string; position: number }) {
  capture("faq_opened", params);
}

export function trackSectionViewed(params: { section_id: string; page: string }) {
  capture("section_viewed", params);
}

export function trackAnalyticsConsentUpdated(params: { decision: "accepted" | "rejected" }) {
  capture("analytics_consent_updated", params);
}
