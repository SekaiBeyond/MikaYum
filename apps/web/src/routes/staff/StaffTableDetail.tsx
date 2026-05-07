import { useParams } from "react-router-dom";
import { PageShell } from "@/components/PageShell";

export function StaffTableDetail() {
  const { tableId } = useParams<{ tableId: string }>();
  return (
    <PageShell title={`Table ${tableId}`} back={{ to: "/staff/tables" }}>
      <p className="text-muted-foreground">Table detail lands in M3.</p>
    </PageShell>
  );
}
