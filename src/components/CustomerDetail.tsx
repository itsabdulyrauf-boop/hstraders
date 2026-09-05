/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */ 

import React, { useState } from "react";
import {
  ArrowLeft,
  User,
  UserPlus,
  Phone,
  MapPin,
  FileText,
  Clock,
  Printer,
  ShieldCheck,
  AlertTriangle,
  FileDigit,
  Calendar,
  DollarSign,
  PlusCircle,
  X,
  Trash2,
  CheckCircle,
  FileSpreadsheet,
  MessageCircle,
  Edit3
} from "lucide-react";
import { Customer, PaymentLog, PaymentMethodType, InstallmentPromise } from "../types";
import { getLedgerSerialNumber } from "../utils/ledger";
import { printCustomerLedger, printCustomerPaymentHistory } from "../utils/export";
import { getFormattedSms } from "../config";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface CustomerDetailProps {
  customer: Customer;
  currency: string;
  allCustomers?: Customer[];
  onBack: () => void;
  onEdit: () => void;
  onDeleteCustomer: (id: string) => void;
  onLogPayment: (payment: PaymentLog) => void;
  onDeletePayment: (paymentId: string) => void;
  onUpdateStatus: (status: "active" | "completed" | "overdue") => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onRegisterNewSaleForCustomer?: (customer: Customer) => void;
  onSelectCustomer?: (id: string) => void;
  appName: string;
}

export default function CustomerDetail({
  customer,
  currency,
  allCustomers = [],
  onBack,
  onEdit,
  onDeleteCustomer,
  onLogPayment,
  onDeletePayment,
  onUpdateStatus,
  onUpdateCustomer,
  onRegisterNewSaleForCustomer,
  onSelectCustomer,
  appName
}: CustomerDetailProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteCustomerModalOpen, setIsDeleteCustomerModalOpen] = useState(false);
  const [paymentIdToDelete, setPaymentIdToDelete] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | "">(customer.plan.monthlyAmount);

  // Promise to Pay Modal state
  const [isPromiseModalOpen, setIsPromiseModalOpen] = useState(false);
  const [targetMonthIndex, setTargetMonthIndex] = useState<number>(1);
  const [targetOriginalDueDate, setTargetOriginalDueDate] = useState<string>("");
  const [promiseDate, setPromiseDate] = useState<string>(
    customer.promiseToPay?.date || new Date().toISOString().split("T")[0]
  );
  const [promiseNote, setPromiseNote] = useState<string>(customer.promiseToPay?.note || "");

  // Helper to distinguish down payment / partial advance settlement logs from monthly installment logs
  const isDownPaymentLog = (p: PaymentLog): boolean => {
    if (p.isDownPayment) return true;
    if (p.id && p.id.includes("_dp_")) return true;
    if (p.receiptNumber && (p.receiptNumber.startsWith("DP-") || p.receiptNumber.startsWith("#DP-"))) return true;
    if (p.notes && (p.notes.toLowerCase().includes("down payment") || p.notes.toLowerCase().includes("advance"))) return true;
    return false;
  };

  // Separate monthly installment payments from down payment settlement payments
  const installmentPayments = React.useMemo(() => {
    return customer.payments.filter((p) => !isDownPaymentLog(p));
  }, [customer.payments]);

  const downPaymentLogs = React.useMemo(() => {
    return customer.payments.filter((p) => isDownPaymentLog(p));
  }, [customer.payments]);

  // Down Payment Settlement Modal state
  const reqAdvance = customer.product.advance || 0;
  const paidAdvance = customer.product.downPaymentPaid ?? reqAdvance;
  const remainingDownPayment = Math.max(0, reqAdvance - paidAdvance);
  const isDownPaymentPartial = remainingDownPayment > 0 && !customer.product.downPaymentCleared;

  const [isSettleDownPaymentModalOpen, setIsSettleDownPaymentModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState<number | "">(remainingDownPayment);
  const [settleNotes, setSettleNotes] = useState<string>("");

  // Compute next unpaid installment due date (STRICTLY for monthly installments)
  const getNextDueDate = () => {
    const totalPaid = installmentPayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingDue = customer.product.remaining - totalPaid;
    const planStart = new Date(customer.plan.startDate);
    
    for (let i = 0; i < customer.plan.numberOfInstallments; i++) {
      const dueDate = new Date(planStart);
      dueDate.setMonth(planStart.getMonth() + i);
      dueDate.setDate(customer.plan.dueDay);
      
      const isPaid = i < installmentPayments.length || (i === customer.plan.numberOfInstallments - 1 && remainingDue <= 0);
      
      if (!isPaid) {
        return {
          dueDateString: dueDate.toISOString().split("T")[0],
          index: i + 1
        };
      }
    }
    
    const lastInstallmentIndex = customer.plan.numberOfInstallments;
    const dueDate = new Date(planStart);
    dueDate.setMonth(planStart.getMonth() + lastInstallmentIndex);
    dueDate.setDate(customer.plan.dueDay);
    return {
      dueDateString: dueDate.toISOString().split("T")[0],
      index: lastInstallmentIndex + 1
    };
  };

  const initialDueInfo = getNextDueDate();
  const [paymentDate, setPaymentDate] = useState(initialDueInfo.dueDateString);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("Cash");

  // Sync state when modal opens or customer changes
  React.useEffect(() => {
    setPaymentAmount(customer.plan.monthlyAmount);
    const dueInfo = getNextDueDate();
    setPaymentDate(dueInfo.dueDateString);
  }, [customer.plan.monthlyAmount, customer.payments.length, isPaymentModalOpen]);

  // Financial Calculations
  const totalInstallmentPaid = installmentPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingDue = Math.max(0, customer.product.remaining - totalInstallmentPaid);
  const isFullyPaid = remainingDue <= 0;

  // Render individual installment checklist items dynamically based on plan
  const installmentTermList = [];
  const planStart = new Date(customer.plan.startDate);
  const allPromises = customer.installmentPromises || [];

  for (let i = 0; i < customer.plan.numberOfInstallments; i++) {
    const monthIndex = i + 1;
    const dueDate = new Date(planStart);
    dueDate.setMonth(planStart.getMonth() + i);
    dueDate.setDate(customer.plan.dueDay);
    const originalDueDateString = dueDate.toISOString().split("T")[0];
    
    // Check if this installment month has a logged monthly installment payment receipt
    const isPaid = i < installmentPayments.length || (i === customer.plan.numberOfInstallments - 1 && remainingDue <= 0);
    const amount = isPaid && installmentPayments[i] ? installmentPayments[i].amount : customer.plan.monthlyAmount;

    // Find promise for this specific month
    const promisesForMonth = allPromises.filter((p) => p.monthIndex === monthIndex);
    const activePromise: InstallmentPromise | undefined = promisesForMonth.length > 0
      ? promisesForMonth[promisesForMonth.length - 1]
      : (customer.promiseToPay && monthIndex === initialDueInfo.index ? {
          id: `legacy_${monthIndex}`,
          monthIndex,
          originalDueDate: originalDueDateString,
          promisedDate: customer.promiseToPay.date,
          note: customer.promiseToPay.note,
          createdAt: customer.promiseToPay.createdAt || new Date().toISOString(),
          status: isPaid ? "fulfilled" : "pending"
        } : undefined);

    installmentTermList.push({
      index: monthIndex,
      originalDueDateString,
      effectiveDueDateString: activePromise?.promisedDate || originalDueDateString,
      amount,
      isPaid,
      activePromise,
      promiseHistory: promisesForMonth
    });
  }

  // Find next unpaid installment due date for display inside render
  const nextUnpaidInstallment = installmentTermList.find(term => !term.isPaid);
  const nextInstallmentDueDate = nextUnpaidInstallment 
    ? nextUnpaidInstallment.effectiveDueDateString 
    : (() => {
        const lastInstallmentIndex = customer.plan.numberOfInstallments;
        const dueDate = new Date(planStart);
        dueDate.setMonth(planStart.getMonth() + lastInstallmentIndex);
        dueDate.setDate(customer.plan.dueDay);
        return dueDate.toISOString().split("T")[0];
      })();
  const nextInstallmentIndex = nextUnpaidInstallment 
    ? nextUnpaidInstallment.index 
    : customer.plan.numberOfInstallments + 1;

  const handleLogPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    const uniqueReceipt = `RCP-${Date.now().toString().slice(-6)}`;
    const newPayment: PaymentLog = {
      id: `pay_${Date.now()}`,
      amount: Number(paymentAmount),
      date: paymentDate,
      notes: paymentNotes.trim() || undefined,
      receiptNumber: uniqueReceipt,
      method: paymentMethod
    };

    onLogPayment(newPayment);
    setIsPaymentModalOpen(false);
    setPaymentAmount(customer.plan.monthlyAmount);
    setPaymentNotes("");
    setPaymentMethod("Cash");
  };

  const handlePrint = () => {
    printCustomerLedger(customer, appName, currency);
  };

  const handlePrintPaymentsOnly = () => {
    printCustomerPaymentHistory(customer, appName, currency);
  };

  // Send pre-written Urdu Message via regular SMS (opens device default SMS app like Ufone, Jazz, Telenor, etc.)
  const handleSendSMS = () => {
    const phone = customer.primaryPhone.replace(/[\s\-\(\)]/g, "");
    const urduMessage = getFormattedSms("reminder", {
      name: customer.fullName,
      appName: appName,
      amount: customer.plan.monthlyAmount,
      phone: customer.primaryPhone,
      cnic: customer.cnic
    });
    const smsUrl = `sms:${phone}?body=${encodeURIComponent(urduMessage)}`;
    window.location.href = smsUrl;
  };

  // Handle Promise to Pay
  const openPromiseModalForMonth = (
    monthIndex: number,
    originalDueDate: string,
    existingPromise?: InstallmentPromise
  ) => {
    setTargetMonthIndex(monthIndex);
    setTargetOriginalDueDate(originalDueDate);
    setPromiseDate(existingPromise?.promisedDate || originalDueDate);
    setPromiseNote(existingPromise?.note || "");
    setIsPromiseModalOpen(true);
  };

  const handleSavePromise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promiseDate) {
      alert("Please select a promised payment date.");
      return;
    }

    const newPromiseRecord: InstallmentPromise = {
      id: `prom_${Date.now()}_m${targetMonthIndex}`,
      monthIndex: targetMonthIndex,
      originalDueDate: targetOriginalDueDate || nextInstallmentDueDate,
      promisedDate: promiseDate,
      note: promiseNote.trim() || undefined,
      createdAt: new Date().toISOString(),
      status: "pending"
    };

    const existingPromises = customer.installmentPromises || [];
    const updatedPromises = [...existingPromises, newPromiseRecord];

    const updatedCustomer: Customer = {
      ...customer,
      installmentPromises: updatedPromises,
      promiseToPay: {
        date: promiseDate,
        note: promiseNote.trim() || undefined,
        createdAt: new Date().toISOString()
      }
    };

    if (onUpdateCustomer) {
      onUpdateCustomer(updatedCustomer);
    }
    setIsPromiseModalOpen(false);
  };

  const handleClearPromise = () => {
    const updatedCustomer: Customer = {
      ...customer,
      promiseToPay: undefined,
      installmentPromises: []
    };
    if (onUpdateCustomer) {
      onUpdateCustomer(updatedCustomer);
    }
  };

  const handleClearSinglePromise = (promiseId: string) => {
    const existingPromises = customer.installmentPromises || [];
    const updatedPromises = existingPromises.filter((p) => p.id !== promiseId);
    const latestRemaining = updatedPromises.length > 0 ? updatedPromises[updatedPromises.length - 1] : undefined;

    const updatedCustomer: Customer = {
      ...customer,
      installmentPromises: updatedPromises,
      promiseToPay: latestRemaining
        ? {
            date: latestRemaining.promisedDate,
            note: latestRemaining.note,
            createdAt: latestRemaining.createdAt
          }
        : undefined
    };

    if (onUpdateCustomer) {
      onUpdateCustomer(updatedCustomer);
    }
  };

  // Handle Partial Down Payment Settlement
  const handleSettleDownPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(settleAmount) || 0;
    if (amount <= 0) {
      alert("Please enter a valid settlement amount.");
      return;
    }

    const currentPaid = customer.product.downPaymentPaid ?? customer.product.advance;
    const newPaid = currentPaid + amount;
    const isCleared = newPaid >= customer.product.advance;

    // Log a payment receipt log
    const uniqueReceipt = `DP-${Date.now().toString().slice(-6)}`;
    const dpPayment: PaymentLog = {
      id: `pay_dp_${Date.now()}`,
      amount: amount,
      date: new Date().toISOString().split("T")[0],
      notes: settleNotes.trim() ? `Down Payment Settle: ${settleNotes.trim()}` : "Cleared remaining down payment",
      receiptNumber: uniqueReceipt,
      method: "Cash",
      isDownPayment: true
    };

    const updatedCustomer: Customer = {
      ...customer,
      product: {
        ...customer.product,
        downPaymentPaid: newPaid,
        downPaymentCleared: isCleared
      },
      payments: [dpPayment, ...customer.payments]
    };

    if (onUpdateCustomer) {
      onUpdateCustomer(updatedCustomer);
    }
    setIsSettleDownPaymentModalOpen(false);
  };

  // Find all sales registered for this customer (matching CNIC or primary phone)
  const otherSales = (allCustomers || []).filter(
    (c) =>
      (c.cnic && c.cnic.trim() === customer.cnic?.trim()) ||
      (c.primaryPhone && c.primaryPhone.trim() === customer.primaryPhone?.trim())
  );

  return (
    <div className="space-y-6">
      {/* Top action header bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Customer Name & Account Info */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            id="detail-btn-back"
            onClick={onBack}
            className="p-2.5 hover:bg-slate-100 text-slate-700 rounded-2xl transition-all border border-slate-200 cursor-pointer shadow-2xs shrink-0 active:scale-95"
            title="Back to customer list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">{customer.fullName}</h2>
              <span className="bg-emerald-100 text-emerald-950 font-sans font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border-2 border-emerald-500 shadow-2xs whitespace-nowrap flex items-center gap-1.5">
                <span className="text-emerald-900 font-black text-[11px] uppercase tracking-wider">Account No:</span>
                <strong className="font-sans font-black text-slate-900 text-xs sm:text-sm tracking-wide">{getLedgerSerialNumber(customer)}</strong>
              </span>
              <span className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                customer.status === "completed"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : customer.status === "overdue"
                  ? "bg-red-100 text-red-800 border-red-300"
                  : "bg-blue-100 text-blue-800 border-blue-300"
              }`}>
                {customer.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
              <span>CNIC: <strong className="font-mono text-slate-800 font-bold">{customer.cnic}</strong></span>
              <span className="text-slate-300">•</span>
              <span>Phone: <strong className="font-mono text-slate-800 font-bold">{customer.primaryPhone}</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Primary and Secondary Action Buttons */}
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2.5">
          {/* Group 1: Sales & Collection CTAs */}
          <div className="flex items-center gap-2">
            {!isFullyPaid && (
              <button
                id="detail-btn-collect"
                onClick={() => setIsPaymentModalOpen(true)}
                className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-blue-600/20 active:scale-95 whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4" /> Collect Installment
              </button>
            )}

            {onRegisterNewSaleForCustomer && (
              <button
                id="detail-btn-register-new-sale"
                onClick={() => onRegisterNewSaleForCustomer(customer)}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-indigo-600/20 active:scale-95 whitespace-nowrap"
                title="Register another new product sale for this customer"
              >
                <UserPlus className="w-4 h-4" /> Register Sale
              </button>
            )}
          </div>

          {/* Group 2: Communications & Reports */}
          <div className="flex items-center gap-2">
            <button
              id="detail-btn-send-sms"
              onClick={handleSendSMS}
              className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
              title="Send SMS Payment Reminder"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" /> SMS
            </button>

            {/* Statements Group */}
            <div className="flex items-center rounded-2xl border border-slate-200/80 bg-slate-50 p-1 gap-0.5">
              <button
                id="detail-btn-print"
                onClick={handlePrint}
                className="px-3 py-1.5 hover:bg-white hover:shadow-2xs text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="Print full ledger agreement & statement"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" /> Statement
              </button>
              <button
                id="detail-btn-print-payments"
                onClick={handlePrintPaymentsOnly}
                className="px-3 py-1.5 hover:bg-white hover:shadow-2xs text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="Print payment receipt summary"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Receipts
              </button>
            </div>
          </div>

          {/* Group 3: Profile Management */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200/80">
            <button
              id="detail-btn-edit"
              onClick={onEdit}
              className="px-3 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 whitespace-nowrap"
              title="Edit customer profile"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Edit
            </button>

            <button
              id="detail-btn-delete-customer"
              onClick={() => setIsDeleteCustomerModalOpen(true)}
              className="p-2 bg-white border border-slate-200/80 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-2xl transition-all cursor-pointer shadow-2xs shrink-0"
              title="Delete customer ledger profile"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Multiple Accounts / Sales Banner for same customer */}
      {otherSales.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-blue-500/20 text-blue-300 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg border border-blue-500/30">
              Multiple Accounts ({otherSales.length})
            </span>
            <span className="text-xs text-slate-300 font-medium">
              Registered Sales for <strong className="text-white">{customer.fullName}</strong>:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {otherSales.map((sale) => {
              const isCurrent = sale.id === customer.id;
              const serial = getLedgerSerialNumber(sale);
              return (
                <button
                  key={sale.id}
                  onClick={() => {
                    if (!isCurrent && onSelectCustomer) {
                      onSelectCustomer(sale.id);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    isCurrent
                      ? "bg-blue-600 text-white cursor-default shadow-xs"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                  }`}
                  title={isCurrent ? "Currently viewing this account" : `Switch to ${serial} (${sale.product.type})`}
                >
                  <strong className="font-black">{serial}</strong>
                  <span className="font-sans font-medium text-[11px] opacity-80">({sale.product.type})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Partial Down Payment Pending Warning Banner */}
      {isDownPaymentPartial && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-extrabold text-amber-950">Partial Down Payment Remaining</h4>
                <span className="bg-amber-200/80 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Pending</span>
              </div>
              <p className="text-xs text-amber-900 mt-0.5">
                Paid <strong className="font-mono">{currency} {paidAdvance.toLocaleString()}</strong> of required <strong className="font-mono">{currency} {reqAdvance.toLocaleString()}</strong> down payment. Remaining balance: <strong className="font-mono text-amber-950 font-black">{currency} {remainingDownPayment.toLocaleString()}</strong>
                {customer.product.downPaymentDueDate && ` • Promised Due Date: ${customer.product.downPaymentDueDate}`}
              </p>
              {customer.product.downPaymentNotes && (
                <p className="text-xs text-amber-800 italic mt-1 bg-amber-100/50 px-2.5 py-1 rounded-xl border border-amber-200/60 inline-block">
                  💬 "{customer.product.downPaymentNotes}"
                </p>
              )}
            </div>
          </div>
          <button
            id="detail-btn-settle-downpayment"
            onClick={() => {
              setSettleAmount(remainingDownPayment);
              setIsSettleDownPaymentModalOpen(true);
            }}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-2xl shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            Clear / Settle Down Payment
          </button>
        </div>
      )}

      {/* Promise to Pay / Commitment Card */}
      <div className="bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/60 border border-blue-200/70 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-blue-600 text-white rounded-2xl shrink-0 shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-900">Promise to Pay / Commitment Status</h4>
              {customer.promiseToPay ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  🤝 Active Commitment
                </span>
              ) : (
                <span className="bg-slate-200/80 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  None Recorded
                </span>
              )}
            </div>
            {customer.promiseToPay ? (
              <div className="mt-1 space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  Promised Date: <span className="font-mono text-blue-700 text-sm font-black underline">{customer.promiseToPay.date}</span>
                </p>
                {customer.promiseToPay.note && (
                  <p className="text-xs text-slate-600 bg-white/80 p-2 rounded-xl border border-blue-100 font-medium">
                    💬 "{customer.promiseToPay.note}"
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5">
                Record customer's promised payment date and commitment notes if installment payment is delayed.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="detail-btn-promise-modal"
            onClick={() => {
              const defaultIndex = nextInstallmentIndex <= customer.plan.numberOfInstallments ? nextInstallmentIndex : 1;
              const defaultTerm = installmentTermList.find((t) => t.index === defaultIndex) || installmentTermList[0];
              openPromiseModalForMonth(
                defaultIndex,
                defaultTerm ? defaultTerm.originalDueDateString : nextInstallmentDueDate,
                defaultTerm?.activePromise
              );
            }}
            className="px-4 py-2.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-2xs whitespace-nowrap"
          >
            {customer.promiseToPay ? "Update Promise" : "+ Record Promise Date"}
          </button>
          {customer.promiseToPay && (
            <button
              id="detail-btn-clear-promise"
              onClick={handleClearPromise}
              className="p-2.5 bg-white border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-2xl transition-all cursor-pointer shadow-2xs"
              title="Clear Promise to Pay commitment"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Customer Details & references (8cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Client Bio Profile Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" /> Customer Information
              </h3>
              {customer.profileImage && (
                <div className="flex items-center gap-2 bg-slate-50 p-1 pr-3 rounded-2xl border border-slate-200/80">
                  <img src={customer.profileImage} alt={customer.fullName} className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-2xs" />
                  <span className="text-xs font-bold text-slate-700">Verified ID Photo</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Full Name</span>
                <p className="text-base font-extrabold text-slate-900">{customer.fullName}</p>
              </div>

              <div className="space-y-1 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">CNIC (National ID)</span>
                <p className="text-sm font-bold text-slate-800 font-mono tracking-wider">{customer.cnic}</p>
              </div>

              <div className="space-y-1 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Primary Contact Phone</span>
                <p className="text-sm font-extrabold text-slate-800 font-mono flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" /> {customer.primaryPhone}
                </p>
              </div>

              <div className="space-y-1 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Alternate Contact Phone</span>
                <p className="text-sm font-bold text-slate-700 font-mono">
                  {customer.secondaryPhone ? (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.secondaryPhone}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic font-sans font-normal text-xs">Not Provided</span>
                  )}
                </p>
              </div>

              <div className="md:col-span-2 space-y-1 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Registered Home Address</span>
                <p className="text-sm text-slate-800 font-bold flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> {customer.address}
                </p>
              </div>
            </div>
          </div>

          {/* References block list */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-slate-600" /> Guaranteed References
            </h3>

            {customer.references.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-slate-200 rounded-2xl">
                <p className="text-xs text-slate-400 italic">No reference details logged for this profile.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.references.map((ref, idx) => (
                  <div
                    key={ref.id}
                    className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl space-y-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                      <span className="text-xs font-bold text-slate-500">Reference #{idx + 1}</span>
                      <span className="bg-slate-200/80 text-slate-700 text-[10px] px-2.5 py-0.5 rounded-lg font-bold uppercase tracking-wider">
                        Guarantor
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <p className="text-slate-900 font-black text-sm">{ref.name}</p>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        <span className="bg-white text-slate-700 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-slate-200/60">
                          CNIC: {ref.cnic || "N/A"}
                        </span>
                        <span className="bg-white text-slate-700 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-slate-200/60">
                          Phone: {ref.phone || "N/A"}
                        </span>
                      </div>
                      {ref.address && (
                        <p className="text-slate-500 text-[11px] pt-1">
                          <span className="font-bold text-slate-400 uppercase text-[9px]">Address:</span> {ref.address}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ledger Checklist Payment Log Feed */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" /> Collection Installment Schedule
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Click <strong className="text-blue-600 font-bold">Record Promise</strong> on any month to update due date
              </span>
            </div>

            <div className="overflow-x-auto -mx-2 px-2 pb-2">
              <table className="w-full text-left text-sm border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                    <th className="py-3 px-3.5 rounded-l-xl whitespace-nowrap w-24">Month</th>
                    <th className="py-3 px-3 whitespace-nowrap w-32">Original Due</th>
                    <th className="py-3 px-3 whitespace-nowrap min-w-[180px] max-w-[240px]">Promised Payment Date</th>
                    <th className="py-3 px-3 whitespace-nowrap w-32">Installment Due</th>
                    <th className="py-3 px-3 whitespace-nowrap w-28">Status</th>
                    <th className="py-3 px-3.5 text-right rounded-r-xl whitespace-nowrap w-36">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/90">
                  {installmentTermList.map((term) => (
                    <tr key={term.index} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3.5 px-3.5 font-extrabold text-slate-800 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200/60 inline-block">
                          Month {term.index}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs whitespace-nowrap">
                        {term.activePromise ? (
                          <span className="text-slate-400 line-through decoration-slate-300">{term.originalDueDateString}</span>
                        ) : (
                          <span className="text-slate-700 font-bold">{term.originalDueDateString}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {term.activePromise ? (
                          <div className="space-y-1 max-w-[220px]">
                            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-xl border border-blue-200/80 font-mono shadow-2xs whitespace-nowrap">
                              🤝 {term.activePromise.promisedDate}
                            </span>
                            {term.activePromise.note && (
                              <p className="text-[11px] text-amber-950 bg-amber-50/90 border border-amber-200/80 p-2 rounded-xl max-w-[220px] font-medium italic break-words shadow-2xs leading-snug">
                                💬 "{term.activePromise.note}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic font-medium">No promise set</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-black text-slate-900 font-mono whitespace-nowrap text-sm">
                        {currency} {term.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {term.isPaid ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] px-2.5 py-1 rounded-xl font-extrabold uppercase tracking-wider border border-emerald-200/80 shadow-2xs">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Settled
                          </span>
                        ) : term.activePromise ? (
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 text-[11px] px-2.5 py-1 rounded-xl font-extrabold uppercase tracking-wider border border-blue-200/80 shadow-2xs">
                            🤝 Promised
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-[11px] px-2.5 py-1 rounded-xl font-extrabold uppercase tracking-wider border border-red-200/80 shadow-2xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                        {!term.isPaid ? (
                          <button
                            type="button"
                            onClick={() =>
                              openPromiseModalForMonth(
                                term.index,
                                term.originalDueDateString,
                                term.activePromise
                              )
                            }
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-bold transition-all border border-blue-200/80 hover:border-blue-600 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                          >
                            {term.activePromise ? "✏️ Edit Promise" : "🤝 Record Promise"}
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-100">
                            ✓ Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Promise to Pay History & Commitment Audit Log */}
          {(customer.installmentPromises && customer.installmentPromises.length > 0) && (
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4 border border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-amber-400">
                  <Clock className="w-4 h-4 text-amber-400" /> Promise to Pay History & Record Log
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {customer.installmentPromises.length} Record(s) Logged
                </span>
              </div>

              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider bg-slate-800/50">
                      <th className="py-2.5 px-3 rounded-l-lg whitespace-nowrap">Month</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Original Due</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Promised Date</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Commitment Comment / Reason</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Recorded On</th>
                      <th className="py-2.5 px-3 text-right rounded-r-lg whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {customer.installmentPromises.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 font-black text-amber-300 whitespace-nowrap">Month {p.monthIndex}</td>
                        <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">{p.originalDueDate}</td>
                        <td className="py-3 px-3 font-mono font-black text-blue-400 whitespace-nowrap">{p.promisedDate}</td>
                        <td className="py-3 px-3 text-slate-300 italic max-w-[240px] break-words">{p.note || "No comment added"}</td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[10px] whitespace-nowrap">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleClearSinglePromise(p.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Remove promise record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Deal metrics & logged payments feed (4cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Account Status Card selector */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Account Status</h3>
            <div className="flex items-center justify-between">
              <div>
                {customer.status === "completed" ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold text-sm">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" /> Completed
                  </div>
                ) : customer.status === "overdue" ? (
                  <div className="flex items-center gap-1.5 text-red-600 font-extrabold text-sm">
                    <AlertTriangle className="w-5 h-5 text-red-600" /> Overdue
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-blue-600 font-extrabold text-sm">
                    <Clock className="w-5 h-5 text-blue-600" /> Active
                  </div>
                )}
              </div>

              {/* Status override toggle dropdown */}
              <select
                id="select-customer-status-override"
                value={customer.status}
                onChange={(e) => onUpdateStatus(e.target.value as any)}
                className="text-xs font-bold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer transition-colors outline-none shadow-2xs"
              >
                <option value="active">Active</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Pricing Ledger Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">Product Deal Terms</h3>

            <div className="space-y-4">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Product Type / Category</span>
                <span className="text-base font-extrabold text-slate-800">{customer.product.type}</span>
              </div>

              {/* Product Specifications & Identifiers Box */}
              {(customer.product.model ||
                customer.product.brand ||
                customer.product.modelYear ||
                customer.product.bikeType ||
                customer.product.chassisNumber ||
                customer.product.engineNumber ||
                customer.product.registrationNumber ||
                customer.product.serialNumber ||
                customer.product.imei2 ||
                customer.product.color ||
                customer.product.specsNote) && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                    <span>🛠️ Product Specifications & Identifiers</span>
                    <span className="text-[10px] font-normal text-slate-400">Verifiable Specs</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {customer.product.brand && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Bike Brand (برانڈ):</span>
                        <span className="font-bold text-amber-900 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/60 inline-block">{customer.product.brand}</span>
                      </div>
                    )}

                    {customer.product.modelYear && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Bike Model / Year (سال):</span>
                        <span className="font-mono font-bold text-amber-900 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/60 inline-block">{customer.product.modelYear}</span>
                      </div>
                    )}

                    {customer.product.bikeType && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Bike Type (قسم):</span>
                        <span className="font-semibold text-amber-900 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/60 inline-block">{customer.product.bikeType}</span>
                      </div>
                    )}

                    {customer.product.model && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Model / Variant (ماڈل):</span>
                        <span className="font-bold text-slate-800">{customer.product.model}</span>
                      </div>
                    )}

                    {customer.product.registrationNumber && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Reg / Bike No. (گاڑی نمبر):</span>
                        <span className="font-mono font-black text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">{customer.product.registrationNumber}</span>
                      </div>
                    )}

                    {customer.product.chassisNumber && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Chassis No. (چیسس نمبر):</span>
                        <span className="font-mono font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-300 inline-block">{customer.product.chassisNumber}</span>
                      </div>
                    )}

                    {customer.product.engineNumber && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Engine No. (انجن نمبر):</span>
                        <span className="font-mono font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-300 inline-block">{customer.product.engineNumber}</span>
                      </div>
                    )}

                    {customer.product.serialNumber && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">IMEI 1 / Serial No.:</span>
                        <span className="font-mono font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-300 inline-block">{customer.product.serialNumber}</span>
                      </div>
                    )}

                    {customer.product.imei2 && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">IMEI 2:</span>
                        <span className="font-mono font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-300 inline-block">{customer.product.imei2}</span>
                      </div>
                    )}

                    {customer.product.color && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Color / Finish (رنگ):</span>
                        <span className="font-semibold text-slate-700">{customer.product.color}</span>
                      </div>
                    )}
                  </div>

                  {customer.product.specsNote && (
                    <div className="pt-1.5 border-t border-slate-200/60 text-[11px]">
                      <span className="text-[10px] text-slate-400 block font-semibold">Warranty & Notes:</span>
                      <span className="text-slate-700 font-medium">{customer.product.specsNote}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Retail Price</span>
                  <span className="text-sm font-bold text-slate-800 font-mono">
                    {currency} {customer.product.value.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Down Payment</span>
                  <span className="text-sm font-bold text-emerald-600 font-mono">
                    {currency} {customer.product.advance.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Installments Balance</span>
                  <span className="text-sm font-bold text-slate-800 font-mono">
                    {currency} {customer.product.remaining.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Plan Amortization</span>
                  <span className="text-sm font-semibold text-indigo-600">
                    {customer.plan.numberOfInstallments} Mo. Duration
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <div className="flex justify-between items-start text-xs">
                  <span className="text-slate-400 font-medium mt-0.5">Monthly Installment Amount:</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 font-mono text-sm bg-blue-50/80 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100 inline-block">
                      {currency} {customer.plan.monthlyAmount.toLocaleString()}
                    </span>
                    {installmentPayments.length > 0 && !isFullyPaid && (
                      <span className="block text-[10px] text-slate-400 font-normal mt-1">
                        Adjusted for {Math.max(0, customer.plan.numberOfInstallments - installmentPayments.length)} remaining installments
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">Recurring Monthly Due Day:</span>
                  <span className="font-bold text-slate-800">Day {customer.plan.dueDay} of each month</span>
                </div>
              </div>
            </div>

            {/* Visual Balance Bar */}
            <div className="border-t border-slate-100 pt-4 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-400 uppercase">Paid progress</span>
                <span className="text-blue-600 font-mono">
                  {currency} {(paidAdvance + totalInstallmentPaid).toLocaleString()} / {customer.product.value.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((paidAdvance + totalInstallmentPaid) / customer.product.value) * 100
                      )
                    )}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Logged Payment Receipts list */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-emerald-500" /> Payment Receipts Log
                </h3>
                <p className="text-[10px] text-slate-400">
                  {installmentPayments.length} Monthly Installments • {downPaymentLogs.length} Down Payment Settlements
                </p>
              </div>
              {customer.payments.length > 0 && (
                <button
                  id="detail-btn-print-payments-history"
                  onClick={handlePrintPaymentsOnly}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Print payment history summary PDF"
                >
                  <Printer className="w-3.5 h-3.5" /> Print PDF Summary
                </button>
              )}
            </div>

            {/* Section 1: Down Payment Settlement Receipts (if any) */}
            {downPaymentLogs.length > 0 && (
              <div className="space-y-2.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Down Payment / Advance Receipts ({downPaymentLogs.length})
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                    Separate from Monthly Installments
                  </span>
                </div>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {downPaymentLogs
                    .slice()
                    .reverse()
                    .map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 bg-white border border-amber-200/60 rounded-xl space-y-1 shadow-2xs"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                              #{log.receiptNumber}
                            </span>
                            <span className="text-[10px] bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                              Down Payment
                            </span>
                          </div>
                          <button
                            id={`detail-btn-delete-payment-${log.id}`}
                            onClick={() => setPaymentIdToDelete(log.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                            title="Delete settlement receipt"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex justify-between items-end pt-0.5">
                          <div>
                            <p className="text-[11px] text-slate-400 font-medium">{log.date}</p>
                            {log.notes && (
                              <p className="text-[11px] text-amber-900 italic font-medium max-w-[180px] truncate" title={log.notes}>
                                {log.notes}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-extrabold text-amber-700 font-mono">
                            +{currency} {log.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Section 2: Monthly Installments Receipts */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Monthly Installment Receipts ({installmentPayments.length})
                </span>
              </div>

              {installmentPayments.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-100 rounded-2xl">
                  <p className="text-xs text-slate-400 italic">No monthly installment payments have been logged yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {installmentPayments
                    .slice()
                    .reverse()
                    .map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-2xl relative space-y-1 hover:bg-slate-100/50 transition-colors"
                      >
                        {/* Receipt number and delete button */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                              #{log.receiptNumber}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              log.method === "JazzCash" ? "bg-purple-100 text-purple-700" :
                              log.method === "EasyPaisa" ? "bg-emerald-100 text-emerald-700" :
                              log.method === "Bank Transfer" ? "bg-blue-100 text-blue-700" :
                              "bg-amber-100 text-amber-800"
                            }`}>
                              {log.method || "Cash"}
                            </span>
                          </div>
                          <button
                            id={`detail-btn-delete-payment-${log.id}`}
                            onClick={() => setPaymentIdToDelete(log.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                            title="Delete payment receipt"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Payment values */}
                        <div className="flex justify-between items-end pt-1">
                          <div>
                            <p className="text-xs text-slate-400 font-medium">{log.date}</p>
                            {log.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5 max-w-[180px] truncate" title={log.notes}>
                                {log.notes}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-extrabold text-emerald-600 font-mono">
                            +{currency} {log.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Log Payment Receipt Modal Overlay */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl max-w-md w-full relative animate-in fade-in zoom-in-95 duration-150">
            {/* Close */}
            <button
              id="payment-modal-close"
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-1.5">
              <PlusCircle className="w-5 h-5 text-blue-600" /> Record Installment Receipt
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Add a payment to the transaction ledger of <strong className="font-bold text-slate-700">{customer.fullName}</strong>
            </p>

            {/* Next Installment Due Date display instead of last paid date */}
            <div className="mt-4 p-3.5 bg-blue-50/70 border border-blue-100/50 rounded-2xl flex items-center justify-between">
              <div>
                <span className="block text-[10px] text-blue-500 font-bold uppercase tracking-wider">
                  Next Installment Due Date
                </span>
                <span className="text-sm font-extrabold text-blue-800 font-mono">
                  {nextInstallmentDueDate.split("-").reverse().join("/")}
                </span>
              </div>
              <span className="bg-blue-100 text-blue-700 text-[10px] px-2.5 py-1 rounded-lg font-bold">
                Month {nextInstallmentIndex}
              </span>
            </div>

            <form onSubmit={handleLogPaymentSubmit} className="space-y-4 mt-5">
              {/* Receipt Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Amount ({currency}) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    {currency}
                  </span>
                  <input
                    id="input-payment-amount"
                    type="number"
                    min="1"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold outline-none focus:border-blue-500"
                    placeholder="e.g. 10000"
                  />
                </div>
                <div className="flex gap-2 mt-1.5">
                  <button
                    id="payment-btn-preset-monthly"
                    type="button"
                    onClick={() => setPaymentAmount(customer.plan.monthlyAmount)}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 px-2 py-0.5 rounded-md cursor-pointer"
                  >
                    Preset: Monthly {customer.plan.monthlyAmount}
                  </button>
                  <button
                    id="payment-btn-preset-remaining"
                    type="button"
                    onClick={() => setPaymentAmount(remainingDue)}
                    className="text-[10px] bg-indigo-50 hover:bg-indigo-100 font-bold text-indigo-600 px-2 py-0.5 rounded-md cursor-pointer"
                  >
                    Preset: Total Due {remainingDue}
                  </button>
                </div>
              </div>

              {/* Payment Channel Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Payment Collection Channel <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["Cash", "JazzCash", "EasyPaisa", "Bank Transfer"] as PaymentMethodType[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === m
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {m === "Cash" ? "💵 Cash" : m === "JazzCash" ? "📱 JazzCash" : m === "EasyPaisa" ? "📱 EasyPaisa" : "🏦 Bank"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Log Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Receipt Memo/Notes (Optional)
                </label>
                <input
                  id="input-payment-notes"
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Received via Bank Transfer, Cash"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  id="payment-btn-modal-cancel"
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="payment-btn-modal-submit"
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Save Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promise to Pay Modal */}
      {isPromiseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-150">
            <button
              id="btn-close-promise-modal"
              type="button"
              onClick={() => setIsPromiseModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" /> Promise to Pay – Installment Schedule
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Set or update promised payment date & comment for <strong className="text-slate-700">{customer.fullName}</strong>
            </p>

            <form onSubmit={handleSavePromise} className="space-y-4 mt-5">
              {/* Installment Month Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Installment Month <span className="text-red-500">*</span>
                </label>
                <select
                  id="select-promise-month"
                  value={targetMonthIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    const term = installmentTermList.find((t) => t.index === idx);
                    if (term) {
                      setTargetMonthIndex(idx);
                      setTargetOriginalDueDate(term.originalDueDateString);
                      setPromiseDate(term.activePromise?.promisedDate || term.originalDueDateString);
                      setPromiseNote(term.activePromise?.note || "");
                    }
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 bg-slate-50"
                >
                  {installmentTermList.map((term) => (
                    <option key={term.index} value={term.index}>
                      Month {term.index} {term.isPaid ? "(Paid)" : `(Original Due: ${term.originalDueDateString})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Original Scheduled Due Date Display */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Original Scheduled Due Date:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {targetOriginalDueDate || "N/A"}
                </span>
              </div>

              {/* New Promised Payment Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Promised Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-promise-date"
                  type="date"
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-blue-500 font-bold text-blue-700 bg-blue-50/30"
                />
              </div>

              {/* Commitment Comment / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Commitment Comment / Delay Reason
                </label>
                <textarea
                  id="input-promise-note"
                  rows={3}
                  value={promiseNote}
                  onChange={(e) => setPromiseNote(e.target.value)}
                  placeholder="e.g. Requested delay until 15th due to salary deposit. Promised to pay full installment."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 text-slate-700"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {customer.promiseToPay || (customer.installmentPromises && customer.installmentPromises.length > 0) ? (
                  <button
                    id="btn-clear-promise-inside-modal"
                    type="button"
                    onClick={() => {
                      handleClearPromise();
                      setIsPromiseModalOpen(false);
                    }}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Clear All Promises
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    id="btn-cancel-promise-modal"
                    type="button"
                    onClick={() => setIsPromiseModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-save-promise-modal"
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    Save Commitment
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Remaining Down Payment Modal */}
      {isSettleDownPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-150">
            <button
              id="btn-close-settle-dp-modal"
              type="button"
              onClick={() => setIsSettleDownPaymentModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-extrabold text-amber-950 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-600" /> Settle Remaining Down Payment
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Collect remaining down payment cash for customer <strong className="text-slate-700">{customer.fullName}</strong>
            </p>

            <form onSubmit={handleSettleDownPaymentSubmit} className="space-y-4 mt-5">
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900">
                <span>Pending Down Payment Balance: </span>
                <strong className="font-mono text-sm font-bold text-amber-950">{currency} {remainingDownPayment.toLocaleString()}</strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Collection Amount ({currency}) <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-settle-amount"
                  type="number"
                  min="1"
                  max={remainingDownPayment}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-amber-300 rounded-xl text-sm font-mono font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Collection Notes / Memo
                </label>
                <input
                  id="input-settle-notes"
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. Customer paid remaining advance balance in cash"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  id="btn-cancel-settle-modal"
                  type="button"
                  onClick={() => setIsSettleDownPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-settle-modal"
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Record Down Payment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteCustomerModalOpen}
        title="Delete Customer Account?"
        itemName={customer.fullName}
        itemDetails={`Serial: #${getLedgerSerialNumber(customer)}`}
        message={`Are you sure you want to delete customer "${customer.fullName}"? All associated installment plans, ledger entries, and payment history will be permanently deleted.`}
        confirmButtonText="Yes, Delete Customer"
        cancelButtonText="Cancel"
        onConfirm={() => {
          setIsDeleteCustomerModalOpen(false);
          onDeleteCustomer(customer.id);
        }}
        onCancel={() => setIsDeleteCustomerModalOpen(false)}
      />

      {/* Payment Receipt Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!paymentIdToDelete}
        title="Delete Payment Receipt?"
        itemName={paymentIdToDelete ? `Receipt #${customer.payments.find(p => p.id === paymentIdToDelete)?.receiptNumber || paymentIdToDelete}` : undefined}
        message="Are you sure you want to delete this payment record from the customer ledger history?"
        confirmButtonText="Yes, Delete Receipt"
        cancelButtonText="Cancel"
        onConfirm={() => {
          if (paymentIdToDelete) {
            onDeletePayment(paymentIdToDelete);
            setPaymentIdToDelete(null);
          }
        }}
        onCancel={() => setPaymentIdToDelete(null)}
      />
    </div>
  );
}
