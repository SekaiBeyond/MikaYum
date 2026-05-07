import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { useStaffTables } from "@/lib/hooks/useStaffTables";
import { Button } from "@/components/ui/button";
import type { Table } from "@/lib/types";

/**
 * Print-friendly 8-up sheet of QR codes (one per table). The customer URL
 * is the simple `/t/:tableId` form — qrToken is shown beneath as a sanity
 * cue but isn't validated by the SPA yet (revisit in M5 hardening).
 */
export function AdminTablesPrint() {
  const { t } = useTranslation();
  const { tables, loading } = useStaffTables();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <div className="min-h-screen bg-background p-6 print:p-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <div>
            <h1 className="font-display text-2xl font-semibold">
              {t("admin.printQr")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("admin.printNote")}
            </p>
          </div>
          <Button onClick={() => window.print()}>
            {t("admin.printQr")}
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : tables.length === 0 ? (
          <p className="text-muted-foreground">No tables to print.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 print:gap-0 sm:grid-cols-3 lg:grid-cols-4">
            {tables.map((tt) => (
              <QrCard key={tt.id} table={tt} origin={origin} />
            ))}
          </div>
        )}
      </div>
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}

interface QrCardProps {
  table: Table;
  origin: string;
}
function QrCard({ table, origin }: QrCardProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!origin) return;
    const target = `${origin}/t/${table.id}`;
    QRCode.toDataURL(target, { width: 320, margin: 1 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [origin, table.id]);

  return (
    <div className="flex flex-col items-center gap-2 break-inside-avoid rounded border border-border bg-white p-4 text-center print:border-0">
      {dataUrl ? (
        <img src={dataUrl} alt="" className="h-40 w-40" />
      ) : (
        <div className="h-40 w-40 bg-muted" />
      )}
      <div className="font-display text-xl font-semibold">{table.label}</div>
      <div className="text-xs text-muted-foreground">
        {origin}/t/{table.id}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {table.qrToken}
      </div>
    </div>
  );
}
