import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/contexts/AuthContext";
import { getAuthUser } from "@/lib/auth-session";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (!getAuthUser()) {
      throw redirect({ to: "/" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
