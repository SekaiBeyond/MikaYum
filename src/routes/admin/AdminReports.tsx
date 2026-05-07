import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, functions } from "@/lib/firebase";
import { useLocalized } from "@/lib/hooks/useLocale";
import { formatPriceCAD } from "@/lib/utils";
import type { Localized } from "@/lib/types";
import { AdminNav } from "@/routes/admin/AdminNav";

interface ItemAgg {
    itemId: string;
    name: Localized;
    qty: number;
    revenue: number;
}

interface DailyReport {
    day: string;
    generatedAt: { toMillis?: () => number } | number | null;
    orderCount: number;
    deliveredCount: number;
    revenue: number;
    pendingRevenue: number;
    itemsTop: ItemAgg[];
    hourly: number[];
    hourlyRevenue: number[];
}

const endOfDayReportFn = httpsCallable<
    { day?: string },
    DailyReport
>(functions, "endOfDayReport");

function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

function csvEscape(value: string | number): string {
    const str = String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
}

export function AdminReports() {
    const { t } = useTranslation();
    const tx = useLocalized();
    const [day, setDay] = useState(todayKey());
    const [report, setReport] = useState<DailyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        setLoading(true);
        setReport(null);
        const unsub = onSnapshot(doc(db, "reports", day), (snap) => {
            if (snap.exists()) {
                setReport(snap.data() as DailyReport);
            } else {
                setReport(null);
            }
            setLoading(false);
        });
        return unsub;
    }, [day]);

    async function regenerate() {
        setRefreshing(true);
        try {
            await endOfDayReportFn({ day });
            toast.success("Report regenerated.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Generate failed");
        } finally {
            setRefreshing(false);
        }
    }

    function exportCsv() {
        if (!report) return;
        const lines: string[] = [];
        lines.push("section,key,value");
        lines.push(`summary,day,${csvEscape(report.day)}`);
        lines.push(`summary,orderCount,${report.orderCount}`);
        lines.push(`summary,deliveredCount,${report.deliveredCount}`);
        lines.push(
            `summary,revenue_cad,${(report.revenue / 100).toFixed(2)}`,
        );
        lines.push(
            `summary,pendingRevenue_cad,${(report.pendingRevenue / 100).toFixed(2)}`,
        );
        lines.push("");
        lines.push("topItems,itemId,nameEn,nameZh,qty,revenue_cad");
        for (const it of report.itemsTop) {
            lines.push(
                `topItems,${csvEscape(it.itemId)},${csvEscape(it.name.en)},${csvEscape(it.name["zh-CN"])},${it.qty},${(it.revenue / 100).toFixed(2)}`,
            );
        }
        lines.push("");
        lines.push("hourly,hour_utc,orders,revenue_cad");
        for (let h = 0; h < 24; h += 1) {
            lines.push(
                `hourly,${h},${report.hourly[h] ?? 0},${((report.hourlyRevenue[h] ?? 0) / 100).toFixed(2)}`,
            );
        }

        const blob = new Blob([lines.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mikayum-report-${report.day}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    const maxOrders = useMemo(
        () => (report ? Math.max(1, ...report.hourly) : 1),
        [report],
    );

    return (
        <PageShell title={t("admin.reports")}>
            <AdminNav/>
            <div className="mb-4 flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                    <Label>Day</Label>
                    <Input
                        type="date"
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                        className="w-44"
                    />
                </div>
                <Button onClick={regenerate} disabled={refreshing}>
                    <RefreshCw className="mr-1 h-4 w-4"/>
                    {refreshing ? t("common.loading") : t("admin.regenerateReport")}
                </Button>
                <Button
                    variant="outline"
                    onClick={exportCsv}
                    disabled={!report}
                >
                    <Download className="mr-1 h-4 w-4"/>
                    {t("admin.exportCsv")}
                </Button>
            </div>

            {loading ? (
                <p className="text-muted-foreground">{t("common.loading")}</p>
            ) : !report ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        {t("admin.noReportYet")}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Stat
                            label={t("admin.revenue")}
                            value={formatPriceCAD(report.revenue)}
                            hint={`${report.deliveredCount} ${t("admin.deliveredOrders").toLowerCase()}`}
                        />
                        <Stat
                            label={t("admin.openOrders")}
                            value={String(report.orderCount - report.deliveredCount)}
                            hint={formatPriceCAD(report.pendingRevenue)}
                        />
                        <Stat
                            label="Total orders"
                            value={String(report.orderCount)}
                        />
                    </div>

                    <section className="space-y-2">
                        <h2 className="font-display text-lg font-semibold">
                            {t("admin.topItems")}
                        </h2>
                        {report.itemsTop.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Nothing yet today.
                            </p>
                        ) : (
                            <Card>
                                <CardContent className="p-0">
                                    <table className="w-full text-sm">
                                        <thead className="border-b border-border bg-muted/40 text-left">
                                        <tr>
                                            <th className="px-3 py-2 font-medium">Item</th>
                                            <th className="px-3 py-2 text-right font-medium">
                                                Qty
                                            </th>
                                            <th className="px-3 py-2 text-right font-medium">
                                                Revenue
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {report.itemsTop.map((it) => (
                                            <tr key={it.itemId} className="border-b border-border last:border-0">
                                                <td className="px-3 py-2">{tx(it.name)}</td>
                                                <td className="px-3 py-2 text-right tabular-nums">
                                                    {it.qty}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums">
                                                    {formatPriceCAD(it.revenue)}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        )}
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-display text-lg font-semibold">
                            {t("admin.ordersByHour")}
                        </h2>
                        <Card>
                            <CardContent className="p-3">
                                <div className="grid grid-cols-12 gap-1 sm:grid-cols-24" style={{
                                    gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
                                }}>
                                    {report.hourly.map((count, h) => {
                                        const heightPct = (count / maxOrders) * 100;
                                        return (
                                            <div
                                                key={h}
                                                className="flex flex-col items-center gap-1"
                                            >
                                                <div className="flex h-20 w-full items-end">
                                                    <div
                                                        className="w-full rounded-sm bg-primary/80"
                                                        style={{ height: `${heightPct}%` }}
                                                        title={`${count} orders`}
                                                    />
                                                </div>
                                                <div className="text-[10px] tabular-nums text-muted-foreground">
                                                    {h}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Hours are UTC. Bars show order count placed in each hour.
                                </p>
                            </CardContent>
                        </Card>
                    </section>
                </div>
            )}
        </PageShell>
    );
}

interface StatProps {
    label: string;
    value: string;
    hint?: string;
}

function Stat({ label, value, hint }: StatProps) {
    return (
        <Card>
            <CardContent className="space-y-1 p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {label}
                </div>
                <div className="font-display text-2xl font-semibold tabular-nums">
                    {value}
                </div>
                {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
            </CardContent>
        </Card>
    );
}
