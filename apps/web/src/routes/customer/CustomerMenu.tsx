import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingBag } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ItemSheet } from "@/features/menu/ItemSheet";
import { useMenu } from "@/lib/hooks/useMenu";
import { useLocalized } from "@/lib/hooks/useLocale";
import { useTableCart, cartSubtotal } from "@/features/cart/cartStore";
import { formatPriceCAD } from "@/lib/utils";
import type { MenuItem } from "@/lib/types";

export function CustomerMenu() {
  const { tableId = "" } = useParams<{ tableId: string }>();
  const { t } = useTranslation();
  const tx = useLocalized();
  const { categories, itemsByCategory, loading } = useMenu();
  const cart = useTableCart(tableId);
  const subtotal = useMemo(() => cartSubtotal(cart), [cart]);
  const cartCount = cart.reduce((n, l) => n + l.qty, 0);

  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function openSheet(item: MenuItem) {
    setOpenItem(item);
    setSheetOpen(true);
  }

  const totalItems = Object.values(itemsByCategory).reduce(
    (n, list) => n + list.length,
    0,
  );

  return (
    <PageShell
      title={`${t("nav.menu")} · ${tableId}`}
      back={{ to: `/t/${tableId}` }}
      className="pb-28"
    >
      {loading ? (
        <p className="text-muted-foreground">{t("customer.menuLoading")}</p>
      ) : totalItems === 0 ? (
        <p className="text-muted-foreground">{t("customer.menuEmpty")}</p>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => {
            const items = itemsByCategory[cat.id] ?? [];
            if (items.length === 0) return null;
            return (
              <section key={cat.id} className="space-y-3">
                <h2 className="font-display text-xl font-semibold">
                  {cat.icon && <span className="mr-2">{cat.icon}</span>}
                  {tx(cat.name)}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((item) => (
                    <Card
                      key={item.id}
                      role="button"
                      tabIndex={item.available ? 0 : -1}
                      onClick={() => item.available && openSheet(item)}
                      onKeyDown={(e) => {
                        if (
                          item.available &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          openSheet(item);
                        }
                      }}
                      className={
                        item.available
                          ? "cursor-pointer transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus:outline-none"
                          : "cursor-not-allowed opacity-60"
                      }
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle>{tx(item.name)}</CardTitle>
                          {!item.available && (
                            <Badge variant="warning">
                              {t("customer.soldOut")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tx(item.description)}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="font-display text-base font-semibold">
                          {formatPriceCAD(item.basePrice)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ItemSheet
        item={openItem}
        tableId={tableId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
          <div className="container flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5" />
              <div>
                <div className="text-sm font-semibold">
                  {cartCount} {cartCount === 1 ? "item" : "items"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatPriceCAD(subtotal)}
                </div>
              </div>
            </div>
            <Button asChild>
              <Link to={`/t/${tableId}/cart`}>{t("nav.cart")}</Link>
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
