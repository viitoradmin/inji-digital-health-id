import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { clearAuthUser, getAuthUser, type AuthUser } from "@/lib/auth-session";

type AuthContextValue = {
  user: AuthUser | null;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getAuthUser());
  }, []);

  const logout = useCallback(() => {
    clearAuthUser();
    setUser(null);
    void navigate({ to: "/" });
  }, [navigate]);

  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
