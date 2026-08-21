export {
  type ConsentDecision,
  type ConsentState,
  getConsent,
  setConsent,
  subscribeToConsent,
} from "./consent";
export {
  type ContactChannel,
  type Surface,
  setAnalyticsCapture,
  trackAnalyticsConsentUpdated,
  trackContactChannelClicked,
  trackContactCtaClicked,
  trackContactFormStarted,
  trackContactFormSubmitted,
  trackFaqOpened,
  trackMenuToggled,
  trackNavigationClicked,
  trackOutboundLinkClicked,
  trackProjectCardViewed,
  trackProjectOpened,
  trackScrollDepthReached,
  trackSectionViewed,
} from "./events";
export { captureServerEvent } from "./server";
