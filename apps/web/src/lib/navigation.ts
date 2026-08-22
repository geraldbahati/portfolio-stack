// Navigation data shared by the navbar, footer, and FAQ section.
export const MENU_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Contact", href: "/contact" },
] as const;

export const SOCIAL_LINKS = [
  {
    id: "instagram",
    href: "https://www.instagram.com/ace._gb/",
    label: "Instagram",
  },
  {
    id: "linkedin",
    href: "https://www.linkedin.com/in/geraldbahati/",
    label: "LinkedIn",
  },
  { id: "x", href: "https://x.com/gerald_baha", label: "X" },
  {
    id: "whatsapp",
    href: "https://wa.me/254704713070",
    label: "WhatsApp",
  },
  { id: "github", href: "https://github.com/geraldbahati", label: "GitHub" },
] as const;
