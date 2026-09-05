/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Users,
  CircleDollarSign,
  HandCoins,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  CalendarCheck2
} from "lucide-react";
import { Customer, AppStats } from "../types";
import InstallmentCalculator from "./InstallmentCalculator";
import MonthlySalesOverview from "./MonthlySalesOverview";

interface DashboardProps {
  stats: AppStats;
  customers: Customer[];
  currency: string;
  onNavigate: (tab: string) => void;
  onSelectCustomer: (id: string) => void;
  onApplyPlan?: (plan: {
    productValue: number;
    advancePayment: number;
    numberOfInstallments: number;
  }) => void;
}

export default function Dashboard({
  stats,
  customers,
  currency,
  onNavigate,
  onSelectCustomer,
  onApplyPlan
}: DashboardProps) {
  // Helper to display amounts in compact format (e.g., 100,000 -> 100K)
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

  // Collection rate percentage
  const collectionRate =
    stats.totalReceivables > 0
      ? Math.round((stats.totalCollected / stats.totalReceivables) * 100)
      : 0;

  // Find overdue customers
  const overdueCustomers = customers.filter((c) => c.status === "overdue");

  // Get all payments flattened with customer names
  const allPayments = customers
    .flatMap((c) =>
      c.payments.map((p) => ({
        ...p,
        customerName: c.fullName,
        customerId: c.id,
        productType: c.product.type
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5); // top 5 recent payments

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 text-white p-6 sm:p-8">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Business Intelligence Dashboard
            </h2>
            <p className="text-slate-400 mt-2 text-sm max-w-xl">
              Track custom product sales, installment accounts, down payments, and due collections securely. No limits, dynamic structures, instant search.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              id="dash-btn-add-customer"
              onClick={() => onNavigate("add_customer")}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-2xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              Add New Sale <ArrowRight className="w-4 h-4" />
            </button>
            <button
              id="dash-btn-view-customers"
              onClick={() => onNavigate("customers")}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded-2xl border border-slate-700/80 transition-all cursor-pointer"
            >
              View All Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Stats KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Accounts
            </p>
            <p className="text-2xl font-bold text-slate-800 tracking-tight">
              {stats.totalCustomers}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="text-emerald-500 font-semibold">{stats.completedAccounts} completed</span>
              <span>•</span>
              <span className="text-blue-500 font-semibold">{stats.activeAccounts} active</span>
            </div>
          </div>
          <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Total Receivables */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Installments Value
            </p>
            <p className="text-2xl font-bold text-slate-800 tracking-tight" title={`${currency} ${stats.totalReceivables.toLocaleString()}`}>
              {currency} {formatCompact(stats.totalReceivables)}
            </p>
            <p className="text-[11px] text-slate-400">Excluding cash down payments</p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl">
            <CircleDollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Amount Collected */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Collected Amount
            </p>
            <p className="text-2xl font-bold text-slate-800 tracking-tight" title={`${currency} ${stats.totalCollected.toLocaleString()}`}>
              {currency} {formatCompact(stats.totalCollected)}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{collectionRate}% collection rate</span>
            </div>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl">
            <HandCoins className="w-6 h-6" />
          </div>
        </div>

        {/* Outstanding Pending Amount */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Outstanding Balance
            </p>
            <p className="text-2xl font-bold text-slate-800 tracking-tight" title={`${currency} ${stats.pendingAmount.toLocaleString()}`}>
              {currency} {formatCompact(stats.pendingAmount)}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-red-500 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{overdueCustomers.length} accounts overdue</span>
            </div>
          </div>
          <div className="bg-orange-50 text-orange-600 p-3 rounded-2xl">
            <CalendarCheck2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Module Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => onNavigate("pending")}
          className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-5 text-white shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Arrears Tracker
            </span>
            <h4 className="text-lg font-black group-hover:underline">1 & 2+ Months Missed Ledger</h4>
            <p className="text-xs text-amber-100 max-w-sm">
              View customers who have missed installments and send Urdu reminder SMS.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
        </div>

        <div
          onClick={() => onNavigate("expenses")}
          className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-5 text-white shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group border border-slate-800"
        >
          <div className="space-y-1">
            <span className="bg-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Cost Management
            </span>
            <h4 className="text-lg font-black group-hover:underline">Business Expense Ledger</h4>
            <p className="text-xs text-slate-300 max-w-sm">
              Track staff salaries, utility bills, rent, shop repairs, and miscellaneous costs.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-indigo-500/30">
            <CircleDollarSign className="w-6 h-6 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Monthly Sales & Collections Overview */}
      <MonthlySalesOverview
        customers={customers}
        currency={currency}
        onSelectCustomer={onSelectCustomer}
        onNavigate={onNavigate}
      />

      {/* Main Grid: Overdue list & Collection progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Overdue customer accounts */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Overdue / Delayed Installments</h3>
                <p className="text-xs text-slate-500">Accounts which require collection follow-ups</p>
              </div>
              <span className="bg-red-50 text-red-600 text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border border-red-100/80">
                <ShieldAlert className="w-3.5 h-3.5" /> Action Required
              </span>
            </div>

            {overdueCustomers.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-100 rounded-2xl">
                <div className="bg-emerald-50 text-emerald-600 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-700">All accounts are fully up-to-date!</p>
                <p className="text-xs text-slate-400 mt-1">Excellent portfolio quality.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                {overdueCustomers.map((c) => {
                  const paidSum = c.payments.reduce((sum, p) => sum + p.amount, 0);
                  const rem = c.product.remaining - paidSum;
                  return (
                    <div
                      key={c.id}
                      onClick={() => onSelectCustomer(c.id)}
                      className="py-3 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-slate-800">{c.fullName}</p>
                        <p className="text-xs text-slate-400">
                          {c.product.brand ? `${c.product.brand} ` : ""}
                          {c.product.type}
                          {c.product.model ? ` (${c.product.model})` : ""}
                          {c.product.modelYear ? ` [${c.product.modelYear}]` : ""}
                          {c.product.registrationNumber ? ` • No: ${c.product.registrationNumber}` : c.product.chassisNumber ? ` • Chassis: ${c.product.chassisNumber}` : c.product.serialNumber ? ` • IMEI: ${c.product.serialNumber}` : ""} • CNIC: <span className="font-mono">{c.cnic}</span>
                        </p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-xs font-semibold text-slate-400">Remaining Balance</p>
                        <p className="text-sm font-bold text-red-600 font-mono" title={`${currency} ${rem.toLocaleString()}`}>
                          {currency} {formatCompact(rem)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Payments Feed */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-1">Recent Collections Ledger</h3>
            <p className="text-xs text-slate-500 mb-4">Latest installment payments logged in system</p>

            {allPayments.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-100 rounded-2xl">
                <p className="text-sm font-semibold text-slate-700">No transactions recorded yet</p>
                <p className="text-xs text-slate-400 mt-1">Collect installments to see log feed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allPayments.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onSelectCustomer(p.customerId)}
                    className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100">
                        <HandCoins className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-mono">Receipt: #{p.receiptNumber}</p>
                        <p className="text-sm font-bold text-slate-800">{p.customerName}</p>
                        <p className="text-[11px] text-slate-500">{p.productType} installment</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600 font-mono" title={`${currency} ${p.amount.toLocaleString()}`}>
                        +{currency} {formatCompact(p.amount)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">{p.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Standalone Installment Calculator Tool */}
          <InstallmentCalculator currency={currency} onApplyPlan={onApplyPlan} />
        </div>

        {/* Right column: Progress Ring and Quick insights */}
        <div className="lg:col-span-4 space-y-6">
          {/* Recovery Performance Ring */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-base font-bold text-slate-800 mb-1">Portofolio Health</h3>
            <p className="text-xs text-slate-500 mb-6">Aggregate collection rate efficiency</p>

            {/* SVG circular dial progress */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className="stroke-slate-100"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className="stroke-blue-600"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 62}`}
                  strokeDashoffset={`${2 * Math.PI * 62 * (1 - collectionRate / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold text-slate-800 font-mono">{collectionRate}%</span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-500">Collected</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 w-full border-t border-slate-100 pt-5">
              <div className="text-center" title={`${currency} ${stats.totalCollected.toLocaleString()}`}>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Collected</p>
                <p className="text-sm font-extrabold text-slate-800 font-mono">
                  {currency} {formatCompact(stats.totalCollected)}
                </p>
              </div>
              <div className="text-center border-l border-slate-100" title={`${currency} ${stats.pendingAmount.toLocaleString()}`}>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Outstanding</p>
                <p className="text-sm font-extrabold text-slate-800 font-mono">
                  {currency} {formatCompact(stats.pendingAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Guidelines info card */}
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Portfolio Management Tip</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verify customer references and alternative contact details before completing a sale. Print customer installment statements directly as PDF files to act as hard-copy ledger proof and dynamic billing receipts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
