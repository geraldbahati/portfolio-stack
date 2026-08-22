export type AdminSessionUser = {
  id: string;
  email: string;
  name: string;
};

export function parseAdminSessionUser(value: unknown): AdminSessionUser | null {
  if (!value || typeof value !== "object" || !("user" in value)) return null;

  const user = value.user;
  if (!user || typeof user !== "object") return null;

  const id = "id" in user ? user.id : null;
  const email = "email" in user ? user.email : null;
  const name = "name" in user ? user.name : null;

  if (typeof id !== "string" || typeof email !== "string") return null;

  return {
    id,
    email,
    name: typeof name === "string" && name.trim() ? name : email.split("@")[0] || "Admin",
  };
}
