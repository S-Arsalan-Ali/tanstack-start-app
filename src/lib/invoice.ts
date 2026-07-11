import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type InvoiceData = {
  store: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    currencySymbol?: string;
    invoice_terms?: string | null;
    logoUrl?: string | null;
    stampUrl?: string | null;
  };
  order: {
    number: string;
    created_at: string;
    customer_name?: string | null;
    customer_email?: string | null;
    shipping_address?: any;
    billing_address?: any;
    payment_mode: string;
    payment_status: string;
    status: string;
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
    tracking?: string | null;
    courier_name?: string | null;
    tracking_url?: string | null;
  };
  items: Array<{
    name_snapshot: string;
    qty: number;
    unit_price: number;
    line_total: number;
    size?: string | null;
    color?: string | null;
  }>;
};

const fmtAddr = (a: any) => {
  if (!a || typeof a !== "object") return "—";
  const streetStr = a.line1 || a.street || "";
  const street2Str = a.line2 || "";
  const zipStr = a.postal_code || a.zip || "";
  return [streetStr, street2Str, a.city, a.state, zipStr, a.country]
    .filter(Boolean)
    .join(", ");
};

const fmtDate = (dStr: string) => {
  const d = new Date(dStr);
  const date = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${date}/${month}/${year}`;
};

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

export async function buildInvoicePdf(d: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const sym = d.store.currencySymbol ?? "Rs.";
  const money = (n: number) => `${sym}${Number(n).toFixed(2)}`;

  let y = 40;

  // Load stamp image if available
  let stampImg: HTMLImageElement | null = null;
  if (d.store.stampUrl) {
    try {
      stampImg = await loadImage(d.store.stampUrl);
    } catch (e) {
      console.error("Error loading stamp image for invoice PDF:", e);
    }
  }

  // Render centered logo if available, fallback to centered text store name
  if (d.store.logoUrl) {
    try {
      const img = await loadImage(d.store.logoUrl);
      const aspect = img.height / img.width;
      const w = 100;
      const h = w * aspect;
      doc.addImage(img, "PNG", (595.28 - w) / 2, y, w, h);
      y += h + 10;
    } catch (e) {
      console.error("Error loading logo for invoice PDF:", e);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(d.store.name || "Invoice", 297.64, y + 15, { align: "center" });
      y += 25;
    }
  } else {
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(d.store.name || "Invoice", 297.64, y + 15, { align: "center" });
    y += 25;
  }

  // Centered Store Contact & Address details
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);

  if (d.store.address) {
    const addrLines = doc.splitTextToSize(d.store.address, 420);
    addrLines.forEach((line: string) => {
      doc.text(line, 297.64, y, { align: "center" });
      y += 11;
    });
  }

  const contactDetails = [d.store.email, d.store.phone].filter(Boolean).join("   ·   ");
  if (contactDetails) {
    doc.text(contactDetails, 297.64, y, { align: "center" });
    y += 15;
  }

  // Horizontal divider line
  doc.setDrawColor(230);
  doc.setLineWidth(1);
  doc.line(40, y, 555.28, y);
  y += 20;

  // Centered INVOICE title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text("INVOICE", 297.64, y + 5, { align: "center" });
  y += 18;

  // Underline separator below INVOICE title
  doc.setDrawColor(230);
  doc.setLineWidth(1);
  doc.line(40, y, 555.28, y);
  y += 20;

  // Metadata sections (3-column layout)
  const col1X = 40;
  const col2X = 215;
  const col3X = 390;

  // Set standard body font
  doc.setFontSize(8.5);
  doc.setTextColor(0);

  // Column 1: Invoice Details
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120);
  doc.text("INVOICE INFO", col1X, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text(`Invoice No: #${d.order.number}`, col1X, y + 15);
  doc.text(`Date: ${fmtDate(d.order.created_at)}`, col1X, y + 26);
  
  // Highlighted status
  doc.text("Payment: ", col1X, y + 37);
  doc.setFont("helvetica", "bold");
  if (d.order.payment_status === "paid") {
    doc.setTextColor(34, 197, 94); // Green
  } else if (d.order.payment_status === "failed") {
    doc.setTextColor(239, 68, 68); // Red
  } else {
    doc.setTextColor(120); // Gray
  }
  doc.text(d.order.payment_status.toUpperCase(), col1X + 45, y + 37);
  
  // Restore font & color
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  
  doc.text(`Mode: ${d.order.payment_mode.toUpperCase()}`, col1X, y + 48);

  // Column 2: Bill To Details
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120);
  doc.text("BILL TO", col2X, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text(d.order.customer_name || "—", col2X, y + 15);
  
  let billOffset = 26;
  if (d.order.customer_email) {
    doc.text(d.order.customer_email, col2X, y + billOffset);
    billOffset += 11;
  }
  if (d.order.shipping_address?.phone) {
    doc.text(d.order.shipping_address.phone, col2X, y + billOffset);
    billOffset += 11;
  }
  const billAddressLines = doc.splitTextToSize(fmtAddr(d.order.billing_address), 160);
  doc.text(billAddressLines, col2X, y + billOffset);

  // Column 3: Ship To Details
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120);
  doc.text("SHIP TO", col3X, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  const shipAddressLines = doc.splitTextToSize(fmtAddr(d.order.shipping_address), 165);
  doc.text(shipAddressLines, col3X, y + 15);

  let shipOffset = 15 + shipAddressLines.length * 11 + 6;
  if (d.order.courier_name) {
    doc.text(`Courier: ${d.order.courier_name}`, col3X, y + shipOffset);
    shipOffset += 11;
  }
  if (d.order.tracking) {
    doc.text(`Tracking: ${d.order.tracking}`, col3X, y + shipOffset);
    shipOffset += 11;
  }
  if (d.order.tracking_url) {
    const urlText = `Link: ${d.order.tracking_url}`;
    const urlLines = doc.splitTextToSize(urlText, 165);
    doc.text(urlLines, col3X, y + shipOffset);
    shipOffset += urlLines.length * 11;
  }

  const sectionHeight = Math.max(60, billOffset + billAddressLines.length * 11, shipOffset + 10);
  
  // Draw vertical separator lines between the metadata columns
  doc.setDrawColor(230);
  doc.setLineWidth(1);
  doc.line(201.5, y - 5, 201.5, y + sectionHeight - 10);
  doc.line(376.5, y - 5, 376.5, y + sectionHeight - 10);

  const tableTop = y + sectionHeight + 20;

  // Render Line Items Table
  autoTable(doc, {
    startY: tableTop,
    head: [["Item", "Qty", "Unit", "Total"]],
    body: d.items.map((it) => [
      it.name_snapshot + (it.size || it.color ? ` (${[it.size, it.color].filter(Boolean).join(" / ")})` : ""),
      String(it.qty),
      money(it.unit_price),
      money(it.line_total),
    ]),
    styles: { fontSize: 8.5, cellPadding: 6 },
    headStyles: { fillColor: [24, 24, 27], textColor: 255 },
    columnStyles: { 
      0: { halign: "left" }, 
      1: { halign: "center" }, 
      2: { halign: "center" }, 
      3: { halign: "right" } 
    },
    didParseCell: (data) => {
      if (data.column.index === 1 || data.column.index === 2) {
        data.cell.styles.halign = "center";
      } else if (data.column.index === 3) {
        data.cell.styles.halign = "right";
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  const rightX = 555.28;
  const labelX = 440;
  let ty = finalY;

  const renderTotalRow = (label: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, labelX, ty);
    doc.text(val, rightX, ty, { align: "right" });
    ty += 13;
  };

  doc.setFontSize(9);
  renderTotalRow("Subtotal", money(d.order.subtotal));
  if (d.order.discount) renderTotalRow("Discount", `-${money(d.order.discount)}`);
  if (d.order.tax > 0) renderTotalRow("Tax", money(d.order.tax));
  renderTotalRow("Shipping", money(d.order.shipping));
  ty += 3;
  doc.setFontSize(11);
  renderTotalRow("TOTAL", money(d.order.total), true);

  // Footer / Terms & Signature Block (Placed at the end of the page)
  const footerY = Math.max(ty + 30, 720);

  // Terms & Conditions (Left Bottom)
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120);
  doc.text("TERMS & CONDITIONS", 40, footerY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  const termsText = d.store.invoice_terms || "Thank you for your purchase!";
  const termsLines = doc.splitTextToSize(termsText, 515.28);
  doc.text(termsLines, 40, footerY + 12);

  // Centered Disclaimer & Stamp Block below Terms & Conditions
  const disclaimerY = footerY + 12 + (termsLines.length * 10) + 15;
  const stampWidth = 50;
  const stampHeight = 50;

  if (stampImg) {
    try {
      doc.addImage(stampImg, "PNG", (595.28 - stampWidth) / 2, disclaimerY, stampWidth, stampHeight);
    } catch (e) {
      console.error("Error rendering stamp in PDF:", e);
    }
  }

  const textOffset = stampImg ? stampHeight + 8 : 0;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  doc.text("COMPUTER GENERATED INVOICE", 297.64, disclaimerY + textOffset + 10, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140);
  doc.text("No physical signature required.", 297.64, disclaimerY + textOffset + 20, { align: "center" });

  return doc;
}
