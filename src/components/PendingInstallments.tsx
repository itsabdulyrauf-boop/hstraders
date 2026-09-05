/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  AlertCircle,
  Clock,
  Phone,
  ArrowRight,
  MessageCircle,
  User,
  Calendar,
  DollarSign,
  Filter,
  CheckCircle2,
  FileText
} from "lucide-react";
import { Customer } from "../types";
import { getFormattedSms } from "../config";
import { getLedgerSerialNumber, sortCustomersBySerialNumber } from "../utils/ledger";

interface PendingInstallmentsProps {
  customers: Customer[];
  currency: string;
  onSelectCustomer: (id: string) => void;
  appName: string;
}

export default function PendingInstallments({
  customers,
  currency,
  onSelectCustomer,
  appName
}: PendingInstallmentsProps) {
  const [filterTab, setFilterTab] = useState<"all" | "1m" | "2m" | "3m" | "promise">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Compute pending installments count and details for each customer
  const analyzedCustomers = customers
    .map((c) => {
      if (c.status === "completed") return null;

      const totalPaid = c.payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingDue = c.product.remaining - totalPaid;
      if (remainingDue <= 0) return null;

      const planStart = new Date(c.plan.startDate);
      let missedCount = 0;
      const missedDates: string[] = [];

      for (let i = 0; i < c.plan.numberOfInstallments; i++) {
        const dueDate = new Date(planStart);
        dueDate.setMonth(planStart.getMonth() + i);
        dueDate.setDate(c.plan.dueDay);
        dueDate.setHours(0, 0, 0, 0);

        const isPaid = i < c.payments.length;
        if (!isPaid && dueDate <= today) {
          missedCount++;
          missedDates.push(
            dueDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            })
          );
        }
      }

      const hasPromise = !!c.promiseToPay || (!!c.installmentPromises && c.installmentPromises.length > 0);

      if (missedCount === 0 && !hasPromise) return null;

      return {
        customer: c,
        missedCount,
        missedDates,
        pendingAmount: missedCount > 0 ? missedCount * c.plan.monthlyAmount : c.plan.monthlyAmount,
        hasPromise
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Filter based on active tab and search
  const filteredRaw = analyzedCustomers.filter((item) => {
    if (filterTab === "1m" && item.missedCount !== 1) return false;
    if (filterTab === "2m" && item.missedCount !== 2) return false;
    if (filterTab === "3m" && item.missedCount < 3) return false;
    if (filterTab === "promise" && !item.hasPromise) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const c = item.customer;
      const serial = getLedgerSerialNumber(c).toLowerCase();
      const promiseNotes = (c.installmentPromises || []).map((p) => `${p.note || ""} ${p.promisedDate}`).join(" ").toLowerCase();
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.primaryPhone.includes(q) ||
        c.cnic.includes(q) ||
        serial.includes(q) ||
        (c.promiseToPay?.note && c.promiseToPay.note.toLowerCase().includes(q)) ||
        (c.promiseToPay?.date && c.promiseToPay.date.toLowerCase().includes(q)) ||
        promiseNotes.includes(q)
      );
    }
    return true;
  });

  // Sort filtered list sequentially by customer serial number
  const sortedCustomerObjects = sortCustomersBySerialNumber(filteredRaw.map((item) => item.customer));
  const sortedCustomerMap = new Map(sortedCustomerObjects.map((c, index) => [c.id, index]));
  const filteredList = [...filteredRaw].sort((a, b) => {
    const idxA = sortedCustomerMap.get(a.customer.id) ?? 0;
    const idxB = sortedCustomerMap.get(b.customer.id) ?? 0;
    return idxA - idxB;
  });

  const count1m = analyzedCustomers.filter((item) => item.missedCount === 1).length;
  const count2m = analyzedCustomers.filter((item) => item.missedCount === 2).length;
  const count3m = analyzedCustomers.filter((item) => item.missedCount >= 3).length;
  const countPromises = analyzedCustomers.filter((item) => item.hasPromise).length;

  const handleSendSMS = (c: Customer, count: number) => {
    const phone = c.primaryPhone.replace(/[\s\-\(\)]/g, "");
    const message = getFormattedSms("overdue", {
      name: c.fullName,
      appName: appName,
      months: count,
      amount: c.plan.monthlyAmount * count,
      phone: c.primaryPhone,
      cnic: c.cnic
    });
    const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Installments Tracker
          </div>
          <h2 className="text-2xl sm:text-3xl font-black">
            Missed & Overdue Installment Ledger
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 max-w-2xl font-medium">
            Monitor customers who have missed their scheduled monthly installments for the last 1 or 2+ months. Quickly trigger SMS reminders or open accounts to collect pending arrears.
          </p>
        </div>
      </div>

      {/* Stats Cards / Filter Presets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={`p-4 rounded-3xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            filterTab === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-lg"
              : "bg-white border-slate-100 text-slate-700 hover:bg-slate-50 shadow-sm"
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider opacity-70">
            Total Pending Accounts
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono">
              {analyzedCustomers.length}
            </span>
            <AlertCircle className={`w-6 h-6 ${filterTab === "all" ? "text-amber-400" : "text-amber-500"}`} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("1m")}
          className={`p-4 rounded-3xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            filterTab === "1m"
              ? "bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20"
              : "bg-white border-slate-100 text-slate-700 hover:bg-slate-50 shadow-sm"
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">
            1 Month Missed
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono">
              {count1m}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${filterTab === "1m" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800"}`}>
              Recent
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("2m")}
          className={`p-4 rounded-3xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            filterTab === "2m"
              ? "bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-600/20"
              : "bg-white border-slate-100 text-slate-700 hover:bg-slate-50 shadow-sm"
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">
            2 Months Missed
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono">
              {count2m}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${filterTab === "2m" ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-800"}`}>
              Action Needed
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("3m")}
          className={`p-4 rounded-3xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            filterTab === "3m"
              ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20"
              : "bg-white border-slate-100 text-slate-700 hover:bg-slate-50 shadow-sm"
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">
            3+ Months Missed
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono">
              {count3m}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${filterTab === "3m" ? "bg-red-500 text-white" : "bg-red-100 text-red-800"}`}>
              Critical
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("promise")}
          className={`p-4 rounded-3xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            filterTab === "promise"
              ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20"
              : "bg-white border-slate-100 text-slate-700 hover:bg-slate-50 shadow-sm"
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1">
            🤝 Promises Recorded
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono">
              {countPromises}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${filterTab === "promise" ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-800"}`}>
              Promised
            </span>
          </div>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search pending customer by Name, CNIC, or Phone..."
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-blue-500"
        />
        {filterTab !== "all" && (
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-colors"
          >
            Show All Pending
          </button>
        )}
      </div>

      {/* Pending Ledger Cards List */}
      {filteredList.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Pending Installments Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Great job! No customer accounts match the selected pending criteria ({filterTab === "all" ? "All" : `${filterTab} missed`}).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((item) => {
            const c = item.customer;
            return (
              <div
                key={c.id}
                onClick={() => onSelectCustomer(c.id)}
                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all border-l-4 border-l-amber-500 hover:border-l-red-500 cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {c.profileImage ? (
                        <img
                          src={c.profileImage}
                          alt={c.fullName}
                          className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-extrabold flex items-center justify-center text-base shadow-sm shrink-0">
                          {c.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors">
                            {c.fullName}
                          </h4>
                          <span className="bg-slate-100 text-slate-900 font-sans text-xs font-black px-2.5 py-0.5 rounded-md border-2 border-slate-300">
                            #{getLedgerSerialNumber(c)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">
                          {c.primaryPhone} | {c.cnic}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono shrink-0 flex items-center gap-1 ${
                        item.missedCount === 1
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : item.missedCount === 2
                          ? "bg-orange-100 text-orange-800 border border-orange-200"
                          : "bg-red-100 text-red-800 border border-red-200 animate-pulse"
                      }`}
                    >
                      ⚠️ {item.missedCount} Month{item.missedCount > 1 ? "s" : ""} Missed
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 my-3" />

                  {/* Deal & Pending breakdown */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-2xl">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">
                        Product & Monthly
                      </span>
                      <span className="font-bold text-slate-700 block">
                        {c.product.brand ? `${c.product.brand} ` : ""}
                        {c.product.type || "Installment Deal"}
                        {c.product.model ? ` (${c.product.model})` : ""}
                        {c.product.modelYear ? ` [${c.product.modelYear}]` : ""}
                      </span>
                      {(c.product.bikeType || c.product.registrationNumber || c.product.engineNumber || c.product.chassisNumber || c.product.serialNumber) && (
                        <span className="block text-[10px] text-slate-500 font-mono">
                          {c.product.bikeType ? `${c.product.bikeType} | ` : ""}
                          {c.product.registrationNumber ? `Reg: ${c.product.registrationNumber}` : c.product.chassisNumber ? `Chassis: ${c.product.chassisNumber}` : c.product.engineNumber ? `Eng: ${c.product.engineNumber}` : `IMEI/SN: ${c.product.serialNumber}`}
                        </span>
                      )}
                      <span className="block text-[11px] text-slate-500 font-mono mt-0.5">
                        {currency} {c.plan.monthlyAmount.toLocaleString()} / mo
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-red-500 font-bold uppercase">
                        Total Pending Arrears
                      </span>
                      <span className="text-base font-extrabold text-red-600 font-mono">
                        {currency} {item.pendingAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Promise to Pay commitment badge */}
                  {c.promiseToPay && (
                    <div className="mt-2.5 p-2 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span>🤝 Promised Date:</span>
                        <strong className="font-mono text-blue-700 underline">{c.promiseToPay.date}</strong>
                      </div>
                      {c.promiseToPay.note && (
                        <span className="text-[11px] text-slate-600 truncate max-w-[200px]" title={c.promiseToPay.note}>
                          "{c.promiseToPay.note}"
                        </span>
                      )}
                    </div>
                  )}

                  {/* Missed Dates tags */}
                  <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      Due Dates:
                    </span>
                    {item.missedDates.map((d, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-red-50 text-red-700 font-bold font-mono px-2 py-0.5 rounded-md border border-red-100"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleSendSMS(c, item.missedCount)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-emerald-200/60"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> SMS Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(c.id)}
                    className="flex items-center gap-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <span>Open Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
