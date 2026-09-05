/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer } from "../types";
import { getLedgerSerialNumber, sortCustomersBySerialNumber } from "./ledger";

export function isDownPaymentLog(p: { receiptNumber?: string; isDownPayment?: boolean; notes?: string; id?: string }): boolean {
  if (p.isDownPayment) return true;
  if (p.id && p.id.includes("_dp_")) return true;
  if (p.receiptNumber && (p.receiptNumber.startsWith("DP-") || p.receiptNumber.startsWith("#DP-"))) return true;
  if (p.notes && (p.notes.toLowerCase().includes("down payment") || p.notes.toLowerCase().includes("advance"))) return true;
  return false;
}

// Export all customers to Excel-compatible CSV format
export function exportCustomersToCSV(customers: Customer[], appName: string): void {
  const sortedCustomers = sortCustomersBySerialNumber(customers);
  const headers = [
    "Ledger Serial No",
    "ID",
    "Customer Name",
    "Primary Phone",
    "Secondary Phone",
    "CNIC",
    "Address",
    "Product Type",
    "Bike Brand",
    "Bike Model/Year",
    "Bike Type",
    "Product Model",
    "Chassis Number",
    "Engine Number",
    "Registration / Bike No",
    "Serial / IMEI 1",
    "IMEI 2",
    "Color / Specs",
    "Product Price",
    "Advance Payment",
    "Remaining Balance",
    "Installment Period (Months)",
    "Monthly Installment Amount",
    "Due Day",
    "Total Paid",
    "Pending Balance",
    "Account Status",
    "Created Date"
  ];

  const rows = sortedCustomers.map((c) => {
    const installmentPayments = c.payments.filter((p) => !isDownPaymentLog(p));
    const totalPaid = installmentPayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingBalance = c.product.remaining - totalPaid;
    return [
      `"${getLedgerSerialNumber(c)}"`,
      c.id,
      `"${c.fullName.replace(/"/g, '""')}"`,
      c.primaryPhone,
      c.secondaryPhone || "N/A",
      c.cnic,
      `"${c.address.replace(/"/g, '""')}"`,
      `"${c.product.type.replace(/"/g, '""')}"`,
      `"${(c.product.brand || "").replace(/"/g, '""')}"`,
      `"${(c.product.modelYear || "").replace(/"/g, '""')}"`,
      `"${(c.product.bikeType || "").replace(/"/g, '""')}"`,
      `"${(c.product.model || "").replace(/"/g, '""')}"`,
      `"${(c.product.chassisNumber || "").replace(/"/g, '""')}"`,
      `"${(c.product.engineNumber || "").replace(/"/g, '""')}"`,
      `"${(c.product.registrationNumber || "").replace(/"/g, '""')}"`,
      `"${(c.product.serialNumber || "").replace(/"/g, '""')}"`,
      `"${(c.product.imei2 || "").replace(/"/g, '""')}"`,
      `"${(c.product.color || "").replace(/"/g, '""')}"`,
      c.product.value,
      c.product.advance,
      c.product.remaining,
      c.plan.numberOfInstallments,
      c.plan.monthlyAmount,
      c.plan.dueDay,
      totalPaid,
      pendingBalance,
      c.status.toUpperCase(),
      c.createdAt.split("T")[0]
    ];
  });

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `${appName.toLowerCase().replace(/\s+/g, "_")}_export_${new Date().toISOString().split("T")[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate printable customer statement/ledger
export function printCustomerLedger(
  customer: Customer,
  appName: string,
  currency: string
): void {
  const installmentPayments = customer.payments.filter((p) => !isDownPaymentLog(p));
  const totalPaid = installmentPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingDue = customer.product.remaining - totalPaid;
  const statusColors = {
    active: "color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe;", // blue
    completed: "color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0;", // green
    overdue: "color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca;" // red
  };

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print customer statement.");
    return;
  }

  const paymentsHTML =
    customer.payments.length === 0
      ? "<tr><td colspan='5' style='padding: 16px; text-align: center; color: #64748b; border-bottom: 1px solid #e2e8f0; font-style: italic;'>No payments recorded yet</td></tr>"
      : customer.payments
          .map((p, idx) => {
            const isDp = isDownPaymentLog(p);
            return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 12px; font-family: monospace; font-weight: bold; color: #475569;">#${idx + 1}</td>
        <td style="padding: 10px 12px; font-family: monospace; font-weight: 600; color: #1e293b;">${p.date}</td>
        <td style="padding: 10px 12px;">
          <span style="font-family: monospace; font-weight: 800; color: ${isDp ? '#92400e' : '#15803d'}; background: ${isDp ? '#fef3c7' : '#f0fdf4'}; border: 1px solid ${isDp ? '#fde68a' : '#bbf7d0'}; padding: 3px 10px; border-radius: 6px; display: inline-block;">
            +${currency} ${p.amount.toLocaleString()}
          </span>
        </td>
        <td style="padding: 10px 12px;">
          <span style="font-family: monospace; font-weight: 800; font-size: 11px; color: ${isDp ? '#92400e' : '#334155'}; background: ${isDp ? '#fffbeb' : '#f1f5f9'}; border: 1px solid ${isDp ? '#fef3c7' : '#cbd5e1'}; padding: 3px 8px; border-radius: 5px;">
            #${p.receiptNumber}
          </span>
        </td>
        <td style="padding: 10px 12px; color: #334155; font-size: 12px;">
          ${p.notes ? `<span style="font-style: italic; color: #475569;">${p.notes}</span>` : '<span style="color: #94a3b8;">-</span>'}
        </td>
      </tr>
    `;
          })
          .join("");

  const referencesHTML =
    customer.references.length === 0
      ? "<p style='color: #64748b; font-style: italic; font-size: 13px;'>No reference listed</p>"
      : customer.references
          .map(
            (r, idx) => `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; background-color: #f8fafc;">
        <p style="margin: 0 0 8px 0; font-weight: 800; font-size: 14px; color: #0f172a;">Reference #${idx + 1}: ${r.name}</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #334155;">
          <div><strong style="color: #64748b;">CNIC:</strong> <span style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">${r.cnic}</span></div>
          <div><strong style="color: #64748b;">Phone:</strong> <span style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">${r.phone}</span></div>
          <div style="grid-column: span 2;"><strong style="color: #64748b;">Address:</strong> <span style="font-weight: 600; color: #1e293b;">${r.address}</span></div>
        </div>
      </div>
    `
          )
          .join("");

  // Calculate dynamic monthly installment checklist for ledger statement
  const rows = [];
  const start = new Date(customer.plan.startDate);
  for (let i = 0; i < customer.plan.numberOfInstallments; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(start.getMonth() + i);
    dueDate.setDate(customer.plan.dueDay);
    
    // Check if this installment month has a logged payment receipt
    const isPaid = i < installmentPayments.length || (i === customer.plan.numberOfInstallments - 1 && remainingDue <= 0);
    const amount = isPaid && installmentPayments[i] ? installmentPayments[i].amount : customer.plan.monthlyAmount;
    
    rows.push(`
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 12px;">
          <span style="font-family: sans-serif; font-weight: 800; font-size: 12px; color: #0f172a; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 6px; display: inline-block;">
            Month ${i + 1}
          </span>
        </td>
        <td style="padding: 10px 12px; font-family: monospace; font-weight: 600; color: #334155;">${dueDate.toISOString().split("T")[0]}</td>
        <td style="padding: 10px 12px; font-family: monospace; font-weight: 800; color: #0f172a; font-size: 13px;">${currency} ${amount.toLocaleString()}</td>
        <td style="padding: 10px 12px; text-align: right;">
          ${isPaid ? `
            <span style="background: #dcfce7; color: #15803d; border: 1.5px solid #86efac; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;">
              ✓ PAID
            </span>
          ` : `
            <span style="background: #fee2e2; color: #b91c1c; border: 1.5px solid #fca5a5; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;">
              ⚠ PENDING
            </span>
          `}
        </td>
      </tr>
    `);
  }
  const scheduleHTML = rows.join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${customer.fullName} - ${appName} Statement</title>
      <style>
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          line-height: 1.5;
          padding: 30px;
          margin: 0;
          background-color: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #cbd5e1;
          padding-bottom: 20px;
          margin-bottom: 25px;
        }
        .brand {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: #0f172a;
        }
        .meta-tag {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .title {
          font-size: 16px;
          font-weight: 800;
          margin: 25px 0 12px 0;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 25px;
        }
        .card {
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 16px;
          background-color: #f8fafc;
        }
        .card-title {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #475569;
          margin-top: 0;
          margin-bottom: 12px;
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 6px;
        }
        .data-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          margin-bottom: 8px;
        }
        .data-label {
          color: #64748b;
          font-weight: 600;
        }
        .data-value {
          font-weight: 700;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
          font-size: 13px;
        }
        th {
          background-color: #f1f5f9;
          padding: 10px 12px;
          text-align: left;
          font-weight: 800;
          color: #334155;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #cbd5e1;
        }
        .total-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          background-color: #0f172a;
          color: white;
          padding: 20px 24px;
          border-radius: 12px;
          margin-bottom: 30px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .total-item {
          text-align: center;
        }
        .total-item:not(:last-child) {
          border-right: 1px solid #334155;
        }
        .total-item-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 6px;
          letter-spacing: 0.05em;
        }
        .total-item-value {
          font-size: 19px;
          font-weight: 800;
          font-family: monospace;
        }
        .no-print {
          margin-bottom: 20px;
          text-align: right;
        }
        .print-btn {
          background-color: #2563eb;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .print-btn:hover {
          background-color: #1d4ed8;
        }
        @media print {
          .no-print {
            display: none;
          }
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <button class="print-btn" onclick="window.print()">🖨️ Print Statement / Save PDF</button>
      </div>

      <div class="header">
        <div>
          <span class="brand">${appName}</span>
          <div class="meta-tag">Installment & Credit Management Ledger</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; color: #475569; margin-bottom: 4px;"><strong>Statement Date:</strong> ${new Date().toLocaleDateString()}</div>
          <div><strong>Account Status:</strong> <span style="${statusColors[customer.status]} font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; display: inline-block;">${customer.status.toUpperCase()}</span></div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-title">Customer Profile & Account</div>
          <div class="data-row">
            <span class="data-label">Ledger Serial No:</span>
            <span class="data-value" style="font-size: 15px; font-weight: 900; color: #0f172a; background-color: #dcfce7; padding: 4px 12px; border-radius: 6px; border: 2px solid #16a34a;">${getLedgerSerialNumber(customer)}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Full Name:</span>
            <span class="data-value" style="font-size: 15px; font-weight: 800; color: #0f172a;">${customer.fullName}</span>
          </div>
          <div class="data-row">
            <span class="data-label">CNIC (National ID):</span>
            <span class="data-value" style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.cnic}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Primary Phone:</span>
            <span class="data-value" style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.primaryPhone}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Secondary Phone:</span>
            <span class="data-value" style="font-family: monospace; font-weight: 700; color: #475569;">${customer.secondaryPhone || "N/A"}</span>
          </div>
          <div class="data-row" style="flex-direction: column; align-items: flex-start; margin-top: 8px;">
            <span class="data-label" style="margin-bottom: 2px;">Address:</span>
            <span class="data-value" style="font-weight: 600; color: #1e293b; font-size: 13px;">${customer.address}</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Deal & Installment Plan</div>
          <div class="data-row">
            <span class="data-label">Product Sold:</span>
            <span class="data-value" style="font-size: 14px; font-weight: 800; color: #0f172a;">${customer.product.brand ? `${customer.product.brand} ` : ""}${customer.product.type}${customer.product.model ? ` (${customer.product.model})` : ""}</span>
          </div>
          ${customer.product.modelYear ? `<div class="data-row"><span class="data-label">Bike Model / Year:</span><span class="data-value" style="font-weight: 800; color: #0f172a;">${customer.product.modelYear}</span></div>` : ""}
          ${customer.product.bikeType ? `<div class="data-row"><span class="data-label">Bike Type:</span><span class="data-value" style="font-weight: 700;">${customer.product.bikeType}</span></div>` : ""}
          ${customer.product.registrationNumber ? `<div class="data-row"><span class="data-label">Reg / Bike No:</span><span class="data-value" style="font-family: monospace; font-weight: 800; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.product.registrationNumber}</span></div>` : ""}
          ${customer.product.chassisNumber ? `<div class="data-row"><span class="data-label">Chassis No:</span><span class="data-value" style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.product.chassisNumber}</span></div>` : ""}
          ${customer.product.engineNumber ? `<div class="data-row"><span class="data-label">Engine No:</span><span class="data-value" style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.product.engineNumber}</span></div>` : ""}
          ${customer.product.serialNumber ? `<div class="data-row"><span class="data-label">IMEI / Serial:</span><span class="data-value" style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.product.serialNumber}</span></div>` : ""}
          ${customer.product.imei2 ? `<div class="data-row"><span class="data-label">IMEI 2:</span><span class="data-value" style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.product.imei2}</span></div>` : ""}
          ${customer.product.color ? `<div class="data-row"><span class="data-label">Color:</span><span class="data-value" style="font-weight: 700; color: #0f172a;">${customer.product.color}</span></div>` : ""}
          <div class="data-row">
            <span class="data-label">Original Price:</span>
            <span class="data-value" style="font-family: monospace; font-size: 13px; font-weight: 800; color: #0f172a;">${currency} ${customer.product.value.toLocaleString()}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Advance/Down Payment:</span>
            <span class="data-value" style="font-family: monospace; font-weight: 800; color: #15803d; background-color: #f0fdf4; padding: 2px 8px; border-radius: 5px; border: 1px solid #bbf7d0;">- ${currency} ${customer.product.advance.toLocaleString()}</span>
          </div>
          <div class="data-row" style="border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; margin-bottom: 6px;">
            <span class="data-label">Principal Balance:</span>
            <span class="data-value" style="font-family: monospace; font-weight: 800; color: #0f172a; font-size: 14px; background-color: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${currency} ${customer.product.remaining.toLocaleString()}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Plan Duration:</span>
            <span class="data-value" style="font-weight: 800; color: #0f172a;">${customer.plan.numberOfInstallments} Months</span>
          </div>
          <div class="data-row">
            <span class="data-label">Monthly Payment:</span>
            <span class="data-value" style="font-family: monospace; font-size: 14px; font-weight: 800; color: #1d4ed8; background-color: #eff6ff; padding: 3px 10px; border-radius: 6px; border: 1px solid #bfdbfe;">${currency} ${customer.plan.monthlyAmount.toLocaleString()} / mo</span>
          </div>
          <div class="data-row">
            <span class="data-label">Recurring Due Day:</span>
            <span class="data-value" style="font-weight: 800; color: #0f172a;">Day ${customer.plan.dueDay} of each month</span>
          </div>
        </div>
      </div>

      <div class="title">References Details</div>
      <div style="margin-bottom: 25px;">
        ${referencesHTML}
      </div>

      <div class="title">Payment & Collection History</div>
      <table>
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Date</th>
            <th>Amount Paid</th>
            <th>Receipt #</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${paymentsHTML}
        </tbody>
      </table>

      <div class="title">Installment Schedule Status</div>
      <table>
        <thead>
          <tr>
            <th>Installment Month</th>
            <th>Expected Due Date</th>
            <th>Expected Payment</th>
            <th style="text-align: right;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${scheduleHTML}
        </tbody>
      </table>

      <div class="total-summary">
        <div class="total-item">
          <div class="total-item-title">Total Product Value</div>
          <div class="total-item-value" style="color: #ffffff;">${currency} ${customer.product.value.toLocaleString()}</div>
        </div>
        <div class="total-item">
          <div class="total-item-title">Total Paid to Date</div>
          <div class="total-item-value" style="color: #4ade80;">${currency} ${(customer.product.advance + totalPaid).toLocaleString()}</div>
        </div>
        <div class="total-item">
          <div class="total-item-title">Remaining Payable</div>
          <div class="total-item-value" style="color: #f87171;">${currency} ${remainingDue.toLocaleString()}</div>
        </div>
      </div>

      <div style="margin-top: 60px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
        <div style="text-align: center; width: 220px; border-top: 1.5px solid #94a3b8; padding-top: 8px; font-weight: 700; color: #334155;">
          Customer Signature
        </div>
        <div style="text-align: center; width: 220px; border-top: 1.5px solid #94a3b8; padding-top: 8px; font-weight: 700; color: #334155;">
          Authorized Representative
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// Generate printable payment history summary receipt
export function printCustomerPaymentHistory(
  customer: Customer,
  appName: string,
  currency: string
): void {
  const totalPaid = customer.payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingDue = customer.product.remaining - totalPaid;
  const statusColors = {
    active: "color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe;", // blue
    completed: "color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0;", // green
    overdue: "color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca;" // red
  };

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print payment history.");
    return;
  }

  const paymentsHTML =
    customer.payments.length === 0
      ? "<tr><td colspan='5' style='padding: 20px; text-align: center; color: #64748b; border-bottom: 1px solid #e2e8f0; font-style: italic;'>No installment payments recorded yet</td></tr>"
      : customer.payments
          .map((p, idx) => {
            const isDp = isDownPaymentLog(p);
            return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 12px; font-family: monospace; font-weight: bold; color: #475569;">#${idx + 1}</td>
        <td style="padding: 10px 12px; font-family: monospace; font-weight: 600; color: #1e293b;">${p.date}</td>
        <td style="padding: 10px 12px;">
          <span style="font-family: monospace; font-weight: 800; color: ${isDp ? '#92400e' : '#15803d'}; background: ${isDp ? '#fef3c7' : '#f0fdf4'}; border: 1px solid ${isDp ? '#fde68a' : '#bbf7d0'}; padding: 3px 10px; border-radius: 6px; display: inline-block;">
            +${currency} ${p.amount.toLocaleString()}
          </span>
        </td>
        <td style="padding: 10px 12px;">
          <span style="font-family: monospace; font-weight: 800; font-size: 11px; color: ${isDp ? '#92400e' : '#334155'}; background: ${isDp ? '#fffbeb' : '#f1f5f9'}; border: 1px solid ${isDp ? '#fef3c7' : '#cbd5e1'}; padding: 3px 8px; border-radius: 5px;">
            #${p.receiptNumber}
          </span>
        </td>
        <td style="padding: 10px 12px; color: #334155; font-size: 12px;">
          ${p.notes ? `<span style="font-style: italic; color: #475569;">${p.notes}</span>` : '<span style="color: #94a3b8;">-</span>'}
        </td>
      </tr>
    `;
          })
          .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${customer.fullName} - Payment History Summary</title>
      <style>
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          line-height: 1.5;
          padding: 35px;
          margin: 0;
          background-color: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #cbd5e1;
          padding-bottom: 20px;
          margin-bottom: 25px;
        }
        .brand {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: #0f172a;
        }
        .meta-tag {
          font-size: 13px;
          color: #059669;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .title {
          font-size: 15px;
          font-weight: 800;
          margin: 25px 0 12px 0;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 6px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 25px;
        }
        .card {
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 16px;
          background-color: #f8fafc;
        }
        .card-title {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #475569;
          margin-top: 0;
          margin-bottom: 12px;
          border-bottom: 1.5px dashed #cbd5e1;
          padding-bottom: 6px;
        }
        .data-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          margin-bottom: 8px;
        }
        .data-label {
          color: #64748b;
          font-weight: 600;
        }
        .data-value {
          font-weight: 700;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
          font-size: 13px;
        }
        th {
          background-color: #f1f5f9;
          padding: 10px 12px;
          text-align: left;
          font-weight: 800;
          color: #334155;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #cbd5e1;
        }
        .total-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          background-color: #047857;
          color: white;
          padding: 20px 24px;
          border-radius: 12px;
          margin-bottom: 25px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .total-item {
          text-align: center;
        }
        .total-item:not(:last-child) {
          border-right: 1px solid #059669;
        }
        .total-item-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #a7f3d0;
          margin-bottom: 6px;
          letter-spacing: 0.05em;
        }
        .total-item-value {
          font-size: 20px;
          font-weight: 800;
          font-family: monospace;
        }
        .no-print {
          margin-bottom: 20px;
          text-align: right;
        }
        .print-btn {
          background-color: #10b981;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .print-btn:hover {
          background-color: #059669;
        }
        @media print {
          .no-print {
            display: none;
          }
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <button class="print-btn" onclick="window.print()">🖨️ Print Payment History / Save PDF</button>
      </div>

      <div class="header">
        <div>
          <span class="brand">${appName}</span>
          <div class="meta-tag">CUSTOMER PAYMENT HISTORY SUMMARY</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; color: #475569; margin-bottom: 4px;"><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</div>
          <div><strong>Account Status:</strong> <span style="${statusColors[customer.status]} font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; display: inline-block;">${customer.status.toUpperCase()}</span></div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-title">Customer Details</div>
          <div class="data-row">
            <span class="data-label">Ledger Serial No:</span>
            <span class="data-value" style="font-size: 14px; font-weight: 900; color: #0f172a; background-color: #dcfce7; padding: 3px 10px; border-radius: 6px; border: 2px solid #16a34a;">${getLedgerSerialNumber(customer)}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Full Name:</span>
            <span class="data-value" style="font-size: 14px; font-weight: 800; color: #0f172a;">${customer.fullName}</span>
          </div>
          <div class="data-row">
            <span class="data-label">CNIC (National ID):</span>
            <span class="data-value" style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.cnic}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Contact Phone:</span>
            <span class="data-value" style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.primaryPhone}</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Deal & Installment Structure</div>
          <div class="data-row">
            <span class="data-label">Product Bought:</span>
            <span class="data-value" style="font-size: 14px; font-weight: 800; color: #0f172a;">${customer.product.brand ? `${customer.product.brand} ` : ""}${customer.product.type}${customer.product.model ? ` (${customer.product.model})` : ""}</span>
          </div>
          ${customer.product.modelYear ? `<div class="data-row"><span class="data-label">Bike Model / Year:</span><span class="data-value" style="font-weight: 800; color: #0f172a;">${customer.product.modelYear}</span></div>` : ""}
          ${customer.product.bikeType ? `<div class="data-row"><span class="data-label">Bike Type:</span><span class="data-value" style="font-weight: 700;">${customer.product.bikeType}</span></div>` : ""}
          ${customer.product.registrationNumber ? `<div class="data-row"><span class="data-label">Reg / Bike No:</span><span class="data-value" style="font-family: monospace; font-weight: 800; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.product.registrationNumber}</span></div>` : ""}
          ${customer.product.chassisNumber ? `<div class="data-row"><span class="data-label">Chassis No:</span><span class="data-value" style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.product.chassisNumber}</span></div>` : ""}
          ${customer.product.engineNumber ? `<div class="data-row"><span class="data-label">Engine No:</span><span class="data-value" style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.product.engineNumber}</span></div>` : ""}
          ${customer.product.serialNumber ? `<div class="data-row"><span class="data-label">IMEI / Serial:</span><span class="data-value" style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.product.serialNumber}</span></div>` : ""}
          ${customer.product.imei2 ? `<div class="data-row"><span class="data-label">IMEI 2:</span><span class="data-value" style="font-family: monospace; font-weight: 700; color: #0f172a; background: #ffffff; padding: 2px 8px; border-radius: 5px; border: 1px solid #cbd5e1;">${customer.product.imei2}</span></div>` : ""}
          <div class="data-row">
            <span class="data-label">Retail Value:</span>
            <span class="data-value" style="font-family: monospace; font-size: 13px; font-weight: 800; color: #0f172a;">${currency} ${customer.product.value.toLocaleString()}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Installment Plan:</span>
            <span class="data-value" style="font-weight: 800; color: #1d4ed8; background-color: #eff6ff; padding: 2px 8px; border-radius: 5px; border: 1px solid #bfdbfe;">${customer.plan.numberOfInstallments} Months @ ${currency} ${customer.plan.monthlyAmount.toLocaleString()}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Recurring Due Date:</span>
            <span class="data-value" style="font-weight: 800; color: #0f172a;">Day ${customer.plan.dueDay} of each month</span>
          </div>
        </div>
      </div>

      <div class="title">Payment & Collection History Receipt Log</div>
      <table>
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Date Paid</th>
            <th>Amount Collected</th>
            <th>Receipt / TXN #</th>
            <th>Receipt Notes / Memo</th>
          </tr>
        </thead>
        <tbody>
          ${paymentsHTML}
        </tbody>
      </table>

      <div class="total-summary">
        <div class="total-item">
          <div class="total-item-title">Total Down Payment</div>
          <div class="total-item-value" style="color: #ffffff;">${currency} ${customer.product.advance.toLocaleString()}</div>
        </div>
        <div class="total-item">
          <div class="total-item-title">Total Installments Collected</div>
          <div class="total-item-value" style="color: #a7f3d0;">${currency} ${totalPaid.toLocaleString()}</div>
        </div>
        <div class="total-item">
          <div class="total-item-title">Total Remaining Payable</div>
          <div class="total-item-value" style="color: #fca5a5;">${currency} ${remainingDue.toLocaleString()}</div>
        </div>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px 18px; margin-bottom: 25px; font-size: 12px; color: #334155;">
        <p style="margin: 0; font-weight: 800; color: #0f172a; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em;">Summary Verification Certificate</p>
        This statement confirms the collection of a total of <strong>${currency} ${(customer.product.advance + totalPaid).toLocaleString()}</strong> (comprising down payment of ${currency} ${customer.product.advance.toLocaleString()} and installment payments of ${currency} ${totalPaid.toLocaleString()}) from the customer for the product <strong>${customer.product.type}</strong>. The remaining unpaid balance as of report generation is <strong>${currency} ${remainingDue.toLocaleString()}</strong>.
      </div>

      <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
        <div style="text-align: center; width: 220px; border-top: 1.5px solid #94a3b8; padding-top: 8px; font-weight: 700; color: #334155;">
          Customer Acknowledgment
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Sign & Date</div>
        </div>
        <div style="text-align: center; width: 220px; border-top: 1.5px solid #94a3b8; padding-top: 8px; font-weight: 700; color: #334155;">
          Authorized Representative
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Sign & Stamp</div>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

