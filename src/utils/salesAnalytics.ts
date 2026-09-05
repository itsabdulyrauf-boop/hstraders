import { Customer, ProductSale, PaymentLog } from "../types";

/**
 * Extracts normalized YYYY-MM-DD date from a customer's plan or creation date
 */
export function getCustomerSaleDate(customer: Partial<Customer>): string {
  if (customer?.plan?.startDate && /^\d{4}-\d{2}-\d{2}/.test(customer.plan.startDate)) {
    return customer.plan.startDate.slice(0, 10);
  }
  if (customer?.createdAt) {
    try {
      const d = new Date(customer.createdAt);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    } catch {
      // fallback below
    }
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Extracts month key (YYYY-MM) from a customer's sale date
 */
export function getCustomerSaleMonthKey(customer: Partial<Customer>): string {
  const saleDate = getCustomerSaleDate(customer);
  return saleDate.slice(0, 7); // e.g. "2026-08"
}

/**
 * Formats a month key (e.g. "2026-08") into readable label like "August 2026"
 */
export function formatMonthKeyToLabel(monthKey: string): string {
  if (!monthKey || monthKey === "all") return "All Time";
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return monthKey;
  }
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Formats a month key to a compact short label (e.g. "Aug 2026")
 */
export function formatMonthKeyToShortLabel(monthKey: string): string {
  if (!monthKey || monthKey === "all") return "All Time";
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return monthKey;
  }
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export interface MonthOption {
  key: string; // "2026-08"
  label: string; // "August 2026"
  shortLabel: string; // "Aug 2026"
  salesCount: number;
  totalSalesValue: number;
}

/**
 * Returns all unique month options available across registered customer sales and payments,
 * sorted descending (latest months first). Always includes current month.
 */
export function getAvailableMonthKeys(customers: Customer[] = []): MonthOption[] {
  const monthMap = new Map<string, { salesCount: number; totalSalesValue: number }>();

  // Ensure current month is always present
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  monthMap.set(currentMonthKey, { salesCount: 0, totalSalesValue: 0 });

  // Gather months from all customers
  for (const c of customers) {
    const mKey = getCustomerSaleMonthKey(c);
    const existing = monthMap.get(mKey) || { salesCount: 0, totalSalesValue: 0 };
    existing.salesCount += 1;
    existing.totalSalesValue += c.product?.value || 0;
    monthMap.set(mKey, existing);

    // Also include months where payments occurred
    for (const p of c.payments || []) {
      if (p.date && /^\d{4}-\d{2}/.test(p.date)) {
        const pKey = p.date.slice(0, 7);
        if (!monthMap.has(pKey)) {
          monthMap.set(pKey, { salesCount: 0, totalSalesValue: 0 });
        }
      }
    }
  }

  // Sort descending by YYYY-MM
  const sortedKeys = Array.from(monthMap.keys()).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key) => {
    const stats = monthMap.get(key) || { salesCount: 0, totalSalesValue: 0 };
    return {
      key,
      label: formatMonthKeyToLabel(key),
      shortLabel: formatMonthKeyToShortLabel(key),
      salesCount: stats.salesCount,
      totalSalesValue: stats.totalSalesValue
    };
  });
}

export interface MonthlySalesSummary {
  monthKey: string; // "2026-08" or "all"
  monthLabel: string;
  isAllTime: boolean;
  totalSalesValue: number; // Sum of product.value for sales registered in this month
  salesCount: number; // Number of sales booked in this month
  totalAdvanceCollected: number; // Down payments collected on sales in this month
  totalInstallmentCreditExtended: number; // Remaining balance booked in this month
  installmentsCollectedInMonth: number; // Installment payments received during this month (from payment.date)
  installmentsCountInMonth: number; // Number of payment transactions in this month
  totalCashInflow: number; // Advance collected + Installments received during this month
  activeAccountsCount: number;
  completedAccountsCount: number;
  customersInMonth: Customer[]; // Customers registered in this month
  categoryBreakdown: { category: string; count: number; value: number }[];
  previousMonthComparison?: {
    prevMonthKey: string;
    prevMonthLabel: string;
    prevSalesValue: number;
    prevSalesCount: number;
    growthPercentage: number;
  };
}

/**
 * Calculates comprehensive sales and collections metrics for a given month key (or all-time)
 */
export function calculateMonthlySalesSummary(
  customers: Customer[] = [],
  selectedMonthKey: string = "all"
): MonthlySalesSummary {
  const isAllTime = !selectedMonthKey || selectedMonthKey === "all";

  // Filter customers by sale date if a specific month is selected
  const customersInMonth = isAllTime
    ? customers
    : customers.filter((c) => getCustomerSaleMonthKey(c) === selectedMonthKey);

  // Total sales value and units
  const salesCount = customersInMonth.length;
  const totalSalesValue = customersInMonth.reduce((sum, c) => sum + (c.product?.value || 0), 0);

  // Advance / Down payments collected on these sales
  const totalAdvanceCollected = customersInMonth.reduce((sum, c) => {
    const advReq = c.product?.advance || 0;
    const advPaid = c.product?.downPaymentPaid ?? advReq;
    return sum + advPaid;
  }, 0);

  // Installment credit extended
  const totalInstallmentCreditExtended = customersInMonth.reduce(
    (sum, c) => sum + (c.product?.remaining || 0),
    0
  );

  // Installment payments received during the selected month
  let installmentsCollectedInMonth = 0;
  let installmentsCountInMonth = 0;

  for (const c of customers) {
    for (const p of c.payments || []) {
      if (p.isDownPayment) continue; // skip down payment logs to avoid double counting with advance
      if (isAllTime) {
        installmentsCollectedInMonth += p.amount || 0;
        installmentsCountInMonth += 1;
      } else if (p.date && p.date.startsWith(selectedMonthKey)) {
        installmentsCollectedInMonth += p.amount || 0;
        installmentsCountInMonth += 1;
      }
    }
  }

  // Total cash received during this period
  const totalCashInflow = totalAdvanceCollected + installmentsCollectedInMonth;

  // Account status counts among customers of this month
  const activeAccountsCount = customersInMonth.filter((c) => c.status === "active").length;
  const completedAccountsCount = customersInMonth.filter((c) => c.status === "completed").length;

  // Product Category breakdown
  const categoryMap = new Map<string, { count: number; value: number }>();
  for (const c of customersInMonth) {
    const cat = c.product?.type || "General";
    const existing = categoryMap.get(cat) || { count: 0, value: 0 };
    existing.count += 1;
    existing.value += c.product?.value || 0;
    categoryMap.set(cat, existing);
  }

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      value: data.value
    }))
    .sort((a, b) => b.value - a.value);

  // Previous month calculation if a specific month is selected
  let previousMonthComparison: MonthlySalesSummary["previousMonthComparison"];
  if (!isAllTime && /^\d{4}-\d{2}$/.test(selectedMonthKey)) {
    const [yStr, mStr] = selectedMonthKey.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const prevCustomers = customers.filter((c) => getCustomerSaleMonthKey(c) === prevMonthKey);
    const prevSalesValue = prevCustomers.reduce((sum, c) => sum + (c.product?.value || 0), 0);
    const prevSalesCount = prevCustomers.length;

    let growthPercentage = 0;
    if (prevSalesValue > 0) {
      growthPercentage = Math.round(((totalSalesValue - prevSalesValue) / prevSalesValue) * 100);
    } else if (totalSalesValue > 0) {
      growthPercentage = 100;
    }

    previousMonthComparison = {
      prevMonthKey,
      prevMonthLabel: formatMonthKeyToLabel(prevMonthKey),
      prevSalesValue,
      prevSalesCount,
      growthPercentage
    };
  }

  return {
    monthKey: selectedMonthKey,
    monthLabel: formatMonthKeyToLabel(selectedMonthKey),
    isAllTime,
    totalSalesValue,
    salesCount,
    totalAdvanceCollected,
    totalInstallmentCreditExtended,
    installmentsCollectedInMonth,
    installmentsCountInMonth,
    totalCashInflow,
    activeAccountsCount,
    completedAccountsCount,
    customersInMonth,
    categoryBreakdown,
    previousMonthComparison
  };
}
