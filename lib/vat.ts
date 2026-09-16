import type { QuoteItem } from "@/types";

export const VAT_STANDARD = 16;
export const VAT_FUEL = 8;
export const VAT_ZERO = 0;

export function calculateLineVat(item: {
  quantity: number;
  unit_price: number;
  vat_applicable: boolean;
  vat_rate: number;
  price_includes_vat: boolean;
}) {
  const gross = item.quantity * item.unit_price;
  if (!item.vat_applicable) return { line_subtotal: gross, line_vat: 0, line_total: gross };
  if (item.price_includes_vat) {
    const line_subtotal = gross / (1 + item.vat_rate / 100);
    const line_vat = gross - line_subtotal;
    return { line_subtotal, line_vat, line_total: gross };
  }
  const line_vat = gross * (item.vat_rate / 100);
  return { line_subtotal: gross, line_vat, line_total: gross + line_vat };
}

export function calculateQuoteTotals(items: Array<Pick<QuoteItem, "quantity" | "unit_price" | "vat_applicable" | "vat_rate" | "price_includes_vat">>) {
  return items.reduce(
    (totals, item) => {
      const line = calculateLineVat({
        ...item,
        vat_applicable: item.vat_applicable ?? false,
        vat_rate: item.vat_rate ?? VAT_STANDARD,
        price_includes_vat: item.price_includes_vat ?? false,
      });
      return {
        subtotal: totals.subtotal + line.line_subtotal,
        vat_total: totals.vat_total + line.line_vat,
        total: totals.total + line.line_total,
      };
    },
    { subtotal: 0, vat_total: 0, total: 0 },
  );
}
