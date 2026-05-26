import { createFileRoute } from "@tanstack/react-router";
import { RecordsPage } from "@/components/records/RecordsPage";

export const Route = createFileRoute("/_app/records")({
  head: () => ({ meta: [{ title: "Records — Inji Certify" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    credentialConfigId:
      typeof search.credentialConfigId === "string" ? search.credentialConfigId : undefined,
  }),
  component: function RecordsRoute() {
    const { credentialConfigId } = Route.useSearch();
    return <RecordsPage credentialConfigId={credentialConfigId} />;
  },
});
