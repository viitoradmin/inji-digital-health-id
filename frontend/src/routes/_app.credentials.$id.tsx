import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  deleteCredentialConfig,
  getCredentialConfigurationById,
  updateCredentialConfig,
} from "@/lib/credential-config-api";
import { CredentialConfigForm } from "@/components/credentials/CredentialConfigForm";
import type { CredentialConfiguration } from "@/types/credential-config";
import { ChevronRight, Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/credentials/$id")({
  head: () => ({ meta: [{ title: "Edit Credential Configuration — Inji Certify" }] }),
  component: EditCredentialConfigPage,
});

function EditCredentialConfigPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState<CredentialConfiguration | null>(null);
  const [fromApi, setFromApi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getCredentialConfigurationById(id)
      .then(({ config: c, fromApi: live, error }) => {
        setConfig(c);
        setFromApi(live);
        if (error && !live) setNotice(`Using cached copy: ${error}`);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!config) {
    return (
      <div className="px-8 py-12 text-center">
        <p className="text-muted-foreground">Configuration not found.</p>
        <Link to="/credentials" className="text-primary text-sm mt-4 inline-block hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6 w-full">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/credentials" className="hover:text-foreground">
          Credentials
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-mono">{id}</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Edit configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            PUT updates to{" "}
            <code className="text-xs bg-secondary px-1 rounded">
              /credential-configurations/{id}
            </code>
            {fromApi ? " · loaded from API" : " · local cache"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/issuance"
            search={{ recordId: undefined, credentialConfigId: id }}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-medium shadow-elevated hover:opacity-90 transition-opacity"
          >
            <Send className="h-4 w-4" /> Issue Credential
          </Link>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="h-10 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete configuration?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes <strong className="font-mono">{id}</strong> from certify and your
                  local registry. Issuance using this configuration will stop working.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    await deleteCredentialConfig(id);
                    await navigate({ to: "/credentials" });
                  }}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {notice && (
        <p className="text-sm rounded-lg border border-border bg-secondary/50 px-3 py-2">
          {notice}
        </p>
      )}

      <CredentialConfigForm
        key={id + (config.vcTemplate?.slice(0, 8) ?? "")}
        initial={config}
        keyIdReadOnly
        submitLabel="Save changes"
        onCancel={() => navigate({ to: "/credentials" })}
        onSubmit={async (body) => {
          const result = await updateCredentialConfig(id, body);
          if (!result.ok) throw new Error(result.error ?? "Update failed");
          if (result.offline) {
            setNotice("Saved locally — certify API was unreachable.");
          } else {
            setNotice("Configuration updated successfully.");
          }
          setConfig(body);
          setFromApi(!result.offline);
        }}
      />
    </div>
  );
}
