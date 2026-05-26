export type AuthUser = {
  email: string;
  name: string;
  loggedInAt: string;
};

const AUTH_KEY = "inji:auth-user";

export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function getUserInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setAuthUser(user: Omit<AuthUser, "loggedInAt">) {
  if (typeof window === "undefined") return;
  const session: AuthUser = { ...user, loggedInAt: new Date().toISOString() };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function clearAuthUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
}
