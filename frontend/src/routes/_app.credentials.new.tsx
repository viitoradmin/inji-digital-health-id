import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FARMER_CREDENTIAL_CONFIG } from "@/lib/credential-config-defaults";
import { createCredentialConfig } from "@/lib/credential-config-api";
import { CredentialConfigForm } from "@/components/credentials/CredentialConfigForm";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/credentials/new")({
  head: () => ({ meta: [{ title: "New Credential Configuration — Inji Certify" }] }),
  component: NewCredentialConfigPage,
});

function NewCredentialConfigPage() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6 w-full">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/credentials" className="hover:text-foreground">
          Credentials
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">New configuration</span>
      </nav>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Create credential configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          POST the full configuration body to Inji Certify. Defaults are pre-filled from the Farmer
          LDP-VC example.
        </p>
      </div>

      {notice && (
        <p className="text-sm rounded-lg border border-accent/30 bg-accent/10 text-foreground px-3 py-2">
          {notice}
        </p>
      )}

      <CredentialConfigForm
        initial={{
          ...structuredClone(FARMER_CREDENTIAL_CONFIG),
          credentialConfigKeyId: "",
        }}
        submitLabel="Create configuration"
        onCancel={() => navigate({ to: "/credentials" })}
        onSubmit={async (config) => {
          const result = await createCredentialConfig(config);
          if (!result.ok) throw new Error(result.error ?? "Create failed");
          if (result.offline) {
            setNotice(
              "Saved locally — certify API was unreachable. Start inji-certify on port 8090 to sync.",
            );
          }
          await navigate({
            to: "/credentials/$id",
            params: { id: result.id ?? config.credentialConfigKeyId! },
          });
        }}
      />
    </div>
  );
}
