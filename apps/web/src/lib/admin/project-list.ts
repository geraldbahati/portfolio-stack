export const ADMIN_PROJECT_PAGE_SIZE = 20;

export type AdminProjectListStatus = "all" | "published" | "draft";

export type AdminProjectListQuery = {
  search: string;
  status: AdminProjectListStatus;
  page: number;
};

export const ADMIN_PROJECT_NOTICES: Readonly<Record<string, string>> = {
  created: "Project draft created successfully.",
  saved: "Project changes saved.",
  published: "Project published successfully.",
  unpublished: "Project unpublished successfully.",
};

export const ADMIN_PROJECT_ERRORS: Readonly<Record<string, string>> = {
  "not-found": "That project could not be found.",
  "save-failed": "The project could not be saved. Please try again.",
};

const dateFormatter = new Intl.DateTimeFormat("en-KE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function parsePage(value: string | null): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;

  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

export function parseAdminProjectListQuery(params: URLSearchParams): AdminProjectListQuery {
  const search = params.get("q")?.trim().slice(0, 100) ?? "";
  const rawStatus = params.get("status");
  const status = rawStatus === "published" || rawStatus === "draft" ? rawStatus : "all";

  return {
    search,
    status,
    page: parsePage(params.get("page")),
  };
}

export function hasActiveAdminProjectFilters(query: AdminProjectListQuery): boolean {
  return Boolean(query.search || query.status !== "all");
}

export function adminProjectPageHref(
  query: Pick<AdminProjectListQuery, "search" | "status">,
  targetPage: number,
): string {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.status !== "all") params.set("status", query.status);
  if (targetPage > 1) params.set("page", String(targetPage));

  const search = params.toString();
  return `/admin/projects${search ? `?${search}` : ""}`;
}

export function formatAdminProjectDate(value: Date | string | number): string {
  return dateFormatter.format(new Date(value));
}
