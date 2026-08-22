export type AdminIconName =
  | "overview"
  | "activity"
  | "projects"
  | "messages"
  | "media"
  | "settings";

export type AdminNavigationItem = {
  label: string;
  href: string;
  icon: AdminIconName;
  description: string;
  available: boolean;
};

export const ADMIN_NAVIGATION: readonly AdminNavigationItem[] = [
  {
    label: "Overview",
    href: "/admin",
    icon: "overview",
    description: "Portfolio health at a glance",
    available: true,
  },
  {
    label: "Activity",
    href: "/admin/activity",
    icon: "activity",
    description: "Audited admin history",
    available: true,
  },
  {
    label: "Projects",
    href: "/admin/projects",
    icon: "projects",
    description: "Case studies and publishing",
    available: true,
  },
  {
    label: "Messages",
    href: "/admin/messages",
    icon: "messages",
    description: "Contact form submissions",
    available: true,
  },
  {
    label: "Media",
    href: "/admin/media",
    icon: "media",
    description: "Portfolio image library",
    available: true,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: "settings",
    description: "Public profile settings",
    available: true,
  },
] as const;

export function isAdminNavigationActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
