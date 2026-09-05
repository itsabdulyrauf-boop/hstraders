/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Calendar,
  CircleDollarSign,
  TrendingUp,
  HandCoins,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  User,
  ArrowRight,
  Filter,
  Layers,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Customer } from "../types";
import {
  getAvailableMonthKeys,
  calculateMonthlySalesSummary,
  getCustomerSaleDate,
  formatMonthKeyToLabel,
  formatMonthKeyToShortLabel
} from "../utils/salesAnalytics";
import { getLedgerSerialNumber } from "../utils/ledger";

interface MonthlySalesOverviewProps {
  customers: Customer[];
  currency: string;
  onSelectCustomer: (id: string) => void;
  onNavigate?: (tab: string) => void;
  initialMonthKey?: string;
}

export default function MonthlySalesOverview({
  customers,
  currency,
  onSelectCustomer,
  onNavigate,
  initialMonthKey
}: MonthlySalesOverviewProps) {
  // Current month key (YYYY-MM)
  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // Available months
  const availableMonths = useMemo(() => getAvailableMonthKeys(customers), [customers]);

  // Selected month state (default to current month or initialMonthKey)
  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialMonthKey || currentMonthKey
  );

  // Helper to format compact currency (e.g. 150K)
  const formatCompact = (num: number): string => {
    if (num === 0) return "0";
    if (Math.abs(num) >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
    }
    if (Math.abs(num) >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (Math.abs(num) >= 1_000) {
      return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return num.toLocaleString();
  };

  // Calculate summary stats for the selected month
  const summary = useMemo(
    () => calculateMonthlySalesSummary(customers, selectedMonth),
    [customers, selectedMonth]
  );

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === "all") {
      setSelectedMonth(availableMonths[0]?.key || currentMonthKey);
      return;
    }
    const [yStr, mStr] = selectedMonth.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const prevDate = new Date(y, m - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(prevKey);
  };

  const handleNextMonth = () => {
    if (selectedMonth === "all") {
      setSelectedMonth(availableMonths[0]?.key || currentMonthKey);
      return;
    }
    const [yStr, mStr] = selectedMonth.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const nextDate = new Date(y, m, 1);
    const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(nextKey);
  };

  // Quick preset pills
  const lastMonthKey = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
      {/* Header & Month Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Monthly Sales Performance
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Filter sales, advance payments, and installment collections by specific calendar month
          </p>
        </div>

        {/* Month Selector Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Pill Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setSelectedMonth(currentMonthKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedMonth === currentMonthKey
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth(lastMonthKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedMonth === lastMonthKey
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedMonth === "all"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Month Dropdown & Nav Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 py-1 px-2 focus:outline-none cursor-pointer"
            >
              <option value="all">All Months Combined</option>
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} ({m.salesCount} {m.salesCount === 1 ? "Sale" : "Sales"})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Month Status Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-100/80 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-xs flex flex-col items-center justify-center shadow-xs">
            <span>{selectedMonth === "all" ? "ALL" : formatMonthKeyToShortLabel(selectedMonth).split(" ")[0]}</span>
            <span className="text-[9px] font-medium opacity-90">{selectedMonth === "all" ? "TIME" : selectedMonth.split("-")[0]}</span>
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
              {summary.monthLabel} Sales Report
            </h4>
            <p className="text-xs text-slate-500">
              {summary.salesCount} product {summary.salesCount === 1 ? "sale registered" : "sales registered"} • {summary.installmentsCountInMonth} installment collection receipts
            </p>
          </div>
        </div>

        {summary.previousMonthComparison && (
          <div className="flex items-center gap-2 bg-white/90 border border-blue-200/70 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
            <span className="text-slate-500 text-[11px]">vs {summary.previousMonthComparison.prevMonthLabel.split(" ")[0]}:</span>
            {summary.previousMonthComparison.growthPercentage >= 0 ? (
              <span className="text-emerald-700 flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{summary.previousMonthComparison.growthPercentage}%
              </span>
            ) : (
              <span className="text-red-600 flex items-center gap-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" />
                {summary.previousMonthComparison.growthPercentage}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Monthly KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales Value for Month */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 w-24 h-24 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>Sales Value ({summary.isAllTime ? "Total" : "Month"})</span>
            <ShoppingBag className="w-4 h-4 text-blue-400" />
          </p>
          <p className="text-2xl font-black tracking-tight mt-2 text-white font-mono" title={`${currency} ${summary.totalSalesValue.toLocaleString()}`}>
            {currency} {formatCompact(summary.totalSalesValue)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-200">
            <span className="font-bold">{summary.salesCount}</span> sales units booked
          </div>
        </div>

        {/* Advance / Down Payments Collected */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 p-5 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center justify-between">
            <span>Advance Received</span>
            <HandCoins className="w-4 h-4 text-emerald-600" />
          </p>
          <p className="text-2xl font-black tracking-tight mt-2 text-emerald-950 font-mono" title={`${currency} ${summary.totalAdvanceCollected.toLocaleString()}`}>
            {currency} {formatCompact(summary.totalAdvanceCollected)}
          </p>
          <p className="mt-2 text-[11px] text-emerald-800 font-medium">
            Down payments from {summary.salesCount} sales
          </p>
        </div>

        {/* Installment Collections Received in Month */}
        <div className="bg-blue-50/70 border border-blue-200/80 p-5 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center justify-between">
            <span>Installments Collected</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </p>
          <p className="text-2xl font-black tracking-tight mt-2 text-blue-950 font-mono" title={`${currency} ${summary.installmentsCollectedInMonth.toLocaleString()}`}>
            {currency} {formatCompact(summary.installmentsCollectedInMonth)}
          </p>
          <p className="mt-2 text-[11px] text-blue-800 font-medium">
            {summary.installmentsCountInMonth} monthly installment receipts
          </p>
        </div>

        {/* Total Cash Inflow for Month */}
        <div className="bg-indigo-50/70 border border-indigo-200/80 p-5 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center justify-between">
            <span>Total Cash Inflow</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </p>
          <p className="text-2xl font-black tracking-tight mt-2 text-indigo-950 font-mono" title={`${currency} ${summary.totalCashInflow.toLocaleString()}`}>
            {currency} {formatCompact(summary.totalCashInflow)}
          </p>
          <p className="mt-2 text-[11px] text-indigo-800 font-medium">
            Advance + Monthly Installments
          </p>
        </div>
      </div>

      {/* Category Distribution for this Month */}
      {summary.categoryBreakdown.length > 0 && (
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" /> Category Breakdown ({summary.monthLabel})
            </span>
            <span className="text-[11px] font-medium text-slate-500 font-mono">
              Credit Extended: {currency} {formatCompact(summary.totalInstallmentCreditExtended)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.categoryBreakdown.map((cat) => (
              <div
                key={cat.category}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 shadow-2xs"
              >
                <span className="font-bold text-slate-800">{cat.category}</span>
                <span className="bg-blue-100 text-blue-800 font-black text-[10px] px-1.5 py-0.5 rounded-md">
                  {cat.count} {cat.count === 1 ? "Sale" : "Sales"}
                </span>
                <span className="font-mono text-slate-600 font-semibold">
                  {currency} {formatCompact(cat.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month's Registered Sales Ledger List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Sales Booked in {summary.monthLabel}
            </h4>
            <p className="text-[11px] text-slate-500">
              Detailed product sales records registered during this period
            </p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("add_customer")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              + New Sale <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {summary.customersInMonth.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700">No Sales Recorded in {summary.monthLabel}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
              Select another month from the top filter or register a new customer sale.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-2xs">
            {summary.customersInMonth.map((customer) => {
              const serial = getLedgerSerialNumber(customer);
              const saleDate = getCustomerSaleDate(customer);
              const paidInstallments = customer.payments.reduce((sum, p) => sum + p.amount, 0);
              const remainingDue = customer.product.remaining - paidInstallments;

              return (
                <div
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer.id)}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                >
                  {/* Customer & Product Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 text-emerald-950 font-mono font-black text-[11px] px-2 py-0.5 rounded-lg border border-emerald-200">
                        {serial}
                      </span>
                      <h5 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {customer.fullName}
                      </h5>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          customer.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : customer.status === "overdue"
                            ? "bg-red-100 text-red-800 border-red-200"
                            : "bg-blue-100 text-blue-800 border-blue-200"
                        }`}
                      >
                        {customer.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">
                        {customer.product.brand ? `${customer.product.brand} ` : ""}
                        {customer.product.type}
                        {customer.product.model ? ` (${customer.product.model})` : ""}
                      </span>
                      {customer.product.registrationNumber ? ` • Reg: ${customer.product.registrationNumber}` : ""}
                      {customer.product.serialNumber ? ` • IMEI: ${customer.product.serialNumber}` : ""}
                      {" • Date: "}
                      <span className="font-mono text-slate-500">{saleDate}</span>
                    </p>
                  </div>

                  {/* Financial Values */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Sale Price</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                        {currency} {customer.product.value.toLocaleString()}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Advance Paid</p>
                      <p className="text-xs sm:text-sm font-bold text-emerald-700 font-mono">
                        {currency} {(customer.product.downPaymentPaid ?? customer.product.advance).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Monthly Plan</p>
                      <p className="text-xs sm:text-sm font-bold text-blue-700 font-mono">
                        {currency} {customer.plan.monthlyAmount.toLocaleString()} <span className="text-[10px] text-slate-400">×{customer.plan.numberOfInstallments}m</span>
                      </p>
                    </div>

                    <div className="hidden md:flex items-center text-slate-400 group-hover:text-blue-600 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
