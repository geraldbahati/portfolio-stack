import {
  trackMenuToggled,
  trackNavigationClicked,
  trackOutboundLinkClicked,
} from "@portfolio-stack/analytics/events";

import { hydrateDeferredPicture } from "../../lib/motion/deferred-media";
import { bindHoverScramble } from "../../lib/motion/text-scramble";

const EXIT_DURATION_MS = 800;
const ENTER_LOCK_MS = 600;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function duration(ms: number) {
  return prefersReducedMotion() ? 0 : ms;
}

function initNavbar() {
  const nav = document.querySelector<HTMLElement>("[data-site-nav]");
  const toggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  const overlay = document.querySelector<HTMLElement>("[data-site-menu]");
  const main = document.getElementById("main-content");
  const footer = document.querySelector("footer");
  const overlayImage = overlay?.querySelector<HTMLImageElement>("[data-deferred-image]");

  if (!nav || !toggle || !overlay) {
    return;
  }

  let isOpen = false;
  let isAnimating = false;
  let exitTimer = 0;

  const setExpanded = (open: boolean) => {
    isOpen = open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.toggleAttribute("data-open", open);
    nav.classList.toggle("mix-blend-difference", !open);
    document.body.style.overflow = open ? "hidden" : "";
    overlay.inert = !open;
    overlay.setAttribute("aria-hidden", String(!open));
    main?.toggleAttribute("inert", open);
    footer?.toggleAttribute("inert", open);
  };

  const loadOverlayImage = () => {
    if (overlayImage) {
      hydrateDeferredPicture(overlayImage);
    }
  };

  const playItemAnimations = (entering: boolean) => {
    overlay.querySelectorAll<HTMLElement>("[data-enter]").forEach((el) => {
      const enterClass = el.dataset.enter;
      const exitClass = el.dataset.exit;
      if (!enterClass || !exitClass) {
        return;
      }
      el.classList.remove(enterClass, exitClass);
      el.style.animationDelay = entering
        ? (el.dataset.enterDelay ?? "0s")
        : (el.dataset.exitDelay ?? "0s");
      void el.offsetWidth;
      el.classList.add(entering ? enterClass : exitClass);
    });
  };

  const openMenu = () => {
    loadOverlayImage();
    overlay.hidden = false;
    overlay.classList.remove("nav-overlay-exit");
    overlay.classList.remove("nav-overlay-enter");
    void overlay.offsetWidth;
    overlay.classList.add("nav-overlay-enter");
    playItemAnimations(true);
    setExpanded(true);
  };

  const closeMenu = () => {
    overlay.classList.remove("nav-overlay-enter");
    overlay.classList.remove("nav-overlay-exit");
    void overlay.offsetWidth;
    overlay.classList.add("nav-overlay-exit");
    playItemAnimations(false);
    setExpanded(false);
    window.clearTimeout(exitTimer);
    exitTimer = window.setTimeout(() => {
      overlay.hidden = true;
      isAnimating = false;
    }, duration(EXIT_DURATION_MS));
  };

  const setOpen = (open: boolean) => {
    if (isAnimating || open === isOpen) {
      return;
    }

    window.clearTimeout(exitTimer);
    isAnimating = true;
    trackMenuToggled({ state: open ? "opened" : "closed" });

    if (open) {
      openMenu();
      exitTimer = window.setTimeout(() => {
        isAnimating = false;
      }, duration(ENTER_LOCK_MS));
      return;
    }

    closeMenu();
  };

  toggle.addEventListener("click", () => setOpen(!isOpen));

  overlay.querySelectorAll<HTMLAnchorElement>("[data-menu-link]").forEach((link) => {
    link.addEventListener("click", () => {
      trackNavigationClicked({
        label: link.dataset.label || link.textContent || "",
        destination: link.getAttribute("href") || "",
        surface: "menu_overlay",
      });
      setOpen(false);
    });
  });

  overlay.querySelectorAll<HTMLAnchorElement>("[data-social-link]").forEach((link) => {
    link.addEventListener("click", () => {
      trackOutboundLinkClicked({
        destination: link.href,
        platform: link.dataset.label,
        surface: "menu_overlay",
      });
    });
  });

  document.querySelector("[data-nav-logo]")?.addEventListener("click", () => {
    trackNavigationClicked({
      label: "Logo",
      destination: "/",
      surface: "navbar",
    });
  });

  document.addEventListener("keydown", (event) => {
    if (!isOpen) {
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      toggle.focus();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = [toggle, ...overlay.querySelectorAll<HTMLElement>("a, button")].filter(
      (el) => !el.hasAttribute("disabled") && el.checkVisibility(),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function initFooter() {
  const grid = document.querySelector("[data-footer-grid]");
  if (grid) {
    const reveal = () => grid.classList.add("footer-visible");
    if (prefersReducedMotion()) {
      reveal();
    } else {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            reveal();
            observer.disconnect();
          }
        },
        { threshold: 0.1 },
      );
      observer.observe(grid);
    }
  }

  document.querySelectorAll<HTMLAnchorElement>("[data-footer-link]").forEach((link) => {
    bindHoverScramble(link);
    link.addEventListener("click", () => {
      const label = link.dataset.label || link.textContent || "";
      const href = link.getAttribute("href") || "";
      if (href.startsWith("/")) {
        trackNavigationClicked({ label, destination: href, surface: "footer" });
        return;
      }
      trackOutboundLinkClicked({
        destination: href,
        platform: label,
        surface: "footer",
      });
    });
  });
}

initNavbar();
initFooter();
