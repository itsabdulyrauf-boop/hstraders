/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Calculator, Percent, Calendar, ArrowRight, CircleDollarSign } from "lucide-react";

interface InstallmentCalculatorProps {
  currency: string;
  onApplyPlan?: (plan: {
    productValue: number;
    advancePayment: number;
    numberOfInstallments: number;
  }) => void;
}

export default function InstallmentCalculator({
  currency,
  onApplyPlan
}: InstallmentCalculatorProps) {
  const [totalPrice, setTotalPrice] = useState<number | "">(50000);
  const [downPayment, setDownPayment] = useState<number | "">(10000);
  const [duration, setDuration] = useState<number>(12);

  const priceVal = typeof totalPrice === "number" ? totalPrice : 0;
  const downVal = typeof downPayment === "number" ? downPayment : 0;
  
  const remaining = Math.max(0, priceVal - downVal);
  const monthlyInstallment = duration > 0 ? Math.round(remaining / duration) : 0;
  const downPaymentPercent = priceVal > 0 ? Math.round((downVal / priceVal) * 100) : 0;

  // Generate an estimated schedule preview
  const getSchedulePreview = () => {
    const list = [];
    const today = new Date();
    for (let i = 1; i <= Math.min(duration, 4); i++) {
      const nextDate = new Date(today);
      nextDate.setMonth(today.getMonth() + i);
      list.push({
        month: i,
        amount: monthlyInstallment,
        date: nextDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        })
      });
    }
    return list;
  };

  const handleApply = () => {
    if (onApplyPlan && priceVal > 0 && duration > 0) {
      onApplyPlan({
        productValue: priceVal,
        advancePayment: downVal,
        numberOfInstallments: duration
      });
    }
  };

  return (
    <div id="installment-calculator-container" className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
        <div className="bg-blue-50 text-blue-600 p-2.5 rounded-2xl">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">Installment Plan Calculator</h3>
          <p className="text-xs text-slate-500">Estimate monthly collections & structure sales instantly</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Input Controls */}
        <div className="space-y-4 min-w-0">
          {/* Total Product Price */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex justify-between">
              <span>Total Price ({currency})</span>
              {priceVal > 0 && (
                <span className="text-slate-400 font-mono text-[10px]">
                  100% value
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">
                {currency}
              </span>
              <input
                id="calc-input-total"
                type="number"
                min="0"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 150000"
                className="w-full pl-14 pr-4 py-2.5 border border-slate-200 focus:border-blue-500 rounded-2xl text-sm font-mono outline-none transition-colors"
              />
            </div>
          </div>

          {/* Down Payment */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex justify-between">
              <span>Down Payment / Advance</span>
              {priceVal > 0 && (
                <span className="text-blue-600 font-bold font-mono text-[10px] flex items-center gap-0.5">
                  <Percent className="w-3 h-3" /> {downPaymentPercent}%
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">
                {currency}
              </span>
              <input
                id="calc-input-down"
                type="number"
                min="0"
                max={priceVal}
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 30000"
                className="w-full pl-14 pr-4 py-2.5 border border-slate-200 focus:border-blue-500 rounded-2xl text-sm font-mono outline-none transition-colors"
              />
            </div>
            {/* Quick Down Payment Presets */}
            {priceVal > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[10, 15, 20, 25, 30, 40].map((pct) => {
                  const amt = Math.round((priceVal * pct) / 100);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDownPayment(amt)}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors border cursor-pointer bg-slate-50 hover:bg-slate-100/80 text-slate-600 border-slate-200/60"
                    >
                      {pct}% ({amt.toLocaleString()})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Duration (Months) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex justify-between">
              <span>Installment Term (Duration)</span>
              <span className="text-slate-800 font-bold font-mono text-xs">
                {duration} Months
              </span>
            </label>
            <input
              id="calc-input-duration-slider"
              type="range"
              min="1"
              max="36"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            {/* Quick Duration Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {[3, 6, 12, 18, 24, 36].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    duration === m
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Calculation Results */}
        <div className="bg-slate-50/70 border border-slate-100/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 min-w-0">
          <div className="space-y-4 min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Estimation Summary
            </h4>

            {/* Calculations Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <div className="bg-white p-3 rounded-xl border border-slate-100 min-w-0 truncate">
                <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wide truncate">
                  Remaining Balance
                </span>
                <span className="text-sm font-bold text-slate-800 font-mono block truncate">
                  {currency} {remaining.toLocaleString()}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 min-w-0 truncate">
                <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wide truncate">
                  Down Payment
                </span>
                <span className="text-sm font-bold text-slate-800 font-mono block truncate">
                  {currency} {downVal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Main result block */}
            <div className="bg-blue-50/70 border border-blue-100/50 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
              <div className="min-w-0 truncate">
                <span className="block text-[10px] text-blue-600 font-bold uppercase tracking-wide truncate">
                  Monthly Installment
                </span>
                <span className="text-xl sm:text-2xl font-black text-blue-700 font-mono block truncate">
                  {currency} {monthlyInstallment.toLocaleString()}
                </span>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0">
                For {duration} Months
              </span>
            </div>

            {/* Schedule preview list */}
            {duration > 0 && remaining > 0 && (
              <div className="space-y-2 border-t border-slate-200/50 pt-3 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate">
                  <Calendar className="w-3.5 h-3.5 shrink-0" /> Estimated Payment Schedule
                </p>
                <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                  {getSchedulePreview().map((item) => (
                    <div
                      key={item.month}
                      className="flex items-center justify-between text-xs py-1 px-1.5 hover:bg-white rounded transition-colors gap-2"
                    >
                      <span className="text-slate-500 font-medium truncate">Month {item.month} Due</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 font-mono text-[11px]">{item.date}</span>
                        <span className="font-bold text-slate-700 font-mono">
                          {currency} {item.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {duration > 4 && (
                    <p className="text-[10px] text-center text-slate-400 italic font-medium pt-1">
                      + {duration - 4} more installments...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Apply Action Button */}
          {onApplyPlan && priceVal > 0 && (
            <button
              id="calc-btn-apply"
              type="button"
              onClick={handleApply}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/10"
            >
              <ArrowRight className="w-4 h-4 shrink-0" /> Register Sale with this Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
