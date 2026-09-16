import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { PublicQuote } from "@/types";

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export function generateQuotePDF(quote: PublicQuote): jsPDF {
  const document = new jsPDF();
  const pageWidth = document.internal.pageSize.getWidth();
  const businessName = quote.business.business_name?.trim() || "FundiOS business";
  const total = quote.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  document.setFontSize(16);
  document.setFont("helvetica", "bold");
  document.text(businessName, 14, 18);
  document.setFontSize(10);
  document.setFont("helvetica", "normal");
  if (quote.business.phone) {
    document.text(quote.business.phone, pageWidth - 14, 18, { align: "right" });
  }

  document.setDrawColor(226, 232, 240);
  document.line(14, 25, pageWidth - 14, 25);

  document.setFontSize(20);
  document.setFont("helvetica", "bold");
  document.text("QUOTE", 14, 39);
  document.setFontSize(10);
  document.setFont("helvetica", "normal");
  document.text(new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date()), pageWidth - 14, 39, {
    align: "right",
  });

  document.setTextColor(71, 85, 105);
  document.text(`Prepared for: ${quote.customer.name}`, 14, 51);
  document.text(`Job: ${quote.job.title}`, 14, 59);
  document.setTextColor(15, 23, 42);

  autoTable(document, {
    startY: 69,
    head: [["Description", "Qty", "Unit Price", "Total"]],
    body: quote.items.map((item) => [
      item.description,
      String(item.quantity),
      money.format(item.unit_price),
      money.format(item.quantity * item.unit_price),
    ]),
    foot: [["", "", "Total", money.format(total)]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 3,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    footStyles: {
      fontStyle: "bold",
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  const tableDocument = document as jsPDF & { lastAutoTable?: { finalY: number } };
  const finalY = tableDocument.lastAutoTable?.finalY ?? 100;
  document.setFontSize(10);
  document.setTextColor(71, 85, 105);
  document.text("Thank you for your business", pageWidth / 2, Math.min(finalY + 20, 275), { align: "center" });

  return document;
}
