/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PaymentMethodType = "Cash" | "JazzCash" | "EasyPaisa" | "Bank Transfer" | "Other";

export interface Reference {
  id: string;
  name: string;
  phone: string;
  address: string;
  cnic: string;
}

export interface ProductSale {
  type: string; // Free text or auto-dropdown (e.g. Bike, Mobile Phone, TV, etc.)
  model?: string; // Model Name / Variant (e.g., "CG 125", "Galaxy A15")
  brand?: string; // Bike / Product Brand (e.g. "Honda", "Yamaha")
  modelYear?: string; // Bike Model / Year (e.g., "2005", "2010", "2022")
  bikeType?: string; // Bike Type (e.g., "Sports Bike", "Standard Bike", "Cruiser", "Scooter")
  serialNumber?: string; // Serial Number / IMEI 1
  imei2?: string; // IMEI 2 (for mobile phones)
  chassisNumber?: string; // Chassis / Frame No. (for bikes/vehicles)
  engineNumber?: string; // Engine No. (for bikes/vehicles)
  registrationNumber?: string; // Bike / Vehicle Registration No. (e.g. "LHR-26-9012")
  color?: string; // Color / Variant
  specsNote?: string; // Additional specs / warranty details
  value: number; // Actual product value/price
  advance: number; // Required down payment / advance payment amount
  remaining: number; // Auto-calculated (value - advance)
  downPaymentPaid?: number; // Actual amount paid on purchase date (defaults to advance if fully paid)
  downPaymentDueDate?: string; // Agreed due date for remaining down payment balance (YYYY-MM-DD)
  downPaymentNotes?: string; // Short note explaining partial down payment agreement
  downPaymentCleared?: boolean; // True if remaining down payment balance is settled
}

export interface PromiseToPay {
  date: string; // Promised payment date (YYYY-MM-DD)
  note?: string; // Short promise/commitment comment (e.g. "Salary delayed until 15th")
  createdAt?: string; // ISO timestamp when promise was recorded
}

export interface InstallmentPromise {
  id: string;
  monthIndex: number; // 1-based month index (e.g. Month 1 = 1)
  originalDueDate: string; // YYYY-MM-DD original scheduled due date
  promisedDate: string; // YYYY-MM-DD new promised payment date
  note?: string; // Short promise/commitment comment
  createdAt: string; // ISO timestamp when promise was recorded
  status?: "pending" | "fulfilled" | "broken";
}

export interface InstallmentPlan {
  numberOfInstallments: number; // e.g. 6, 12 months
  monthlyAmount: number; // Auto-calculated or manual override
  dueDay: number; // Day of the month (e.g. 5th, 10th)
  startDate: string; // ISO date string YYYY-MM-DD
}

export interface PaymentLog {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  receiptNumber: string; // Unique printable receipt ID
  method?: PaymentMethodType; // Channel tracking (e.g., JazzCash, EasyPaisa, Bank Account)
  isDownPayment?: boolean; // True if this payment is a partial advance/down payment settlement
}

export interface Customer {
  id: string;
  accountNumber?: string; // Unique Ledger Serial / Account No. (e.g., "HST-1")
  fullName: string;
  primaryPhone: string;
  secondaryPhone?: string;
  cnic: string;
  address: string;
  references: Reference[];
  product: ProductSale;
  plan: InstallmentPlan;
  payments: PaymentLog[];
  createdAt: string;
  status: "active" | "completed" | "overdue";
  profileImage?: string; // Highly compressed base64 / data URL image
  promiseToPay?: PromiseToPay; // Promise to pay / commitment record
  installmentPromises?: InstallmentPromise[]; // History & per-installment promise records
}

export type ExpenseCategory = "Salary" | "Utility Bill" | "Rent" | "Maintenance" | "Miscellaneous";

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod?: PaymentMethodType;
  notes?: string;
  createdAt?: string;
}

export interface AppStats {
  totalCustomers: number;
  activeAccounts: number;
  completedAccounts: number;
  totalReceivables: number; // sum of remaining balance
  totalCollected: number; // sum of payments
  pendingAmount: number; // totalReceivables - totalCollected
  overdueInstallmentsCount: number;
}

