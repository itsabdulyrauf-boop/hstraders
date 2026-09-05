/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  DollarSign,
  PlusCircle,
  Trash2,
  Calendar,
  Filter,
  Briefcase,
  Zap,
  Home,
  Wrench,
  HelpCircle,
  X,
  Search,
  CheckCircle2
} from "lucide-react";
import { Expense, ExpenseCategory, PaymentMethodType } from "../types";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface ExpenseManagementProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  currency: string;
}

export default function ExpenseManagement({
  expenses,
  onAddExpense,
  onDeleteExpense,
  currency
}: ExpenseManagementProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Salary");
  const [amount, setAmount] = useState<number | "">("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("Cash");
  const [notes, setNotes] = useState("");

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Calculations
  const totalAllTime = expenses.reduce((sum, e) => sum + e.amount, 0);

  const currentMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
  const totalThisMonth = expenses
    .filter((e) => e.date.startsWith(currentMonthPrefix))
    .reduce((sum, e) => sum + e.amount, 0);

  const salaryTotal = expenses.filter((e) => e.category === "Salary").reduce((sum, e) => sum + e.amount, 0);
  const utilityTotal = expenses.filter((e) => e.category === "Utility Bill").reduce((sum, e) => sum + e.amount, 0);
  const rentTotal = expenses.filter((e) => e.category === "Rent").reduce((sum, e) => sum + e.amount, 0);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) {
      alert("Please enter a valid expense title and amount.");
      return;
    }

    const newExp: Expense = {
      id: `exp_${Date.now()}`,
      title: title.trim(),
      category,
      amount: Number(amount),
      date,
      paymentMethod,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onAddExpense(newExp);
    setIsAddModalOpen(false);
    setTitle("");
    setAmount("");
    setNotes("");
    setCategory("Salary");
    setPaymentMethod("Cash");
  };

  const filteredExpenses = expenses
    .filter((e) => {
      if (filterCategory !== "all" && e.category !== filterCategory) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return e.title.toLowerCase().includes(q) || (e.notes && e.notes.toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const getCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case "Salary": return <Briefcase className="w-4 h-4 text-purple-600" />;
      case "Utility Bill": return <Zap className="w-4 h-4 text-amber-600" />;
      case "Rent": return <Home className="w-4 h-4 text-blue-600" />;
      case "Maintenance": return <Wrench className="w-4 h-4 text-indigo-600" />;
      default: return <HelpCircle className="w-4 h-4 text-slate-600" />;
    }
  };

  const getCategoryBg = (cat: ExpenseCategory) => {
    switch (cat) {
      case "Salary": return "bg-purple-50 text-purple-700 border-purple-200";
      case "Utility Bill": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Rent": return "bg-blue-50 text-blue-700 border-blue-200";
      case "Maintenance": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-indigo-300">
            <DollarSign className="w-3.5 h-3.5" /> Operational Expenses Ledger
          </div>
          <h2 className="text-2xl sm:text-3xl font-black">
            Business Expense Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Track salaries, utility bills, rent, shop maintenance, and general business costs to maintain accurate net profitability reports.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <PlusCircle className="w-5 h-5" /> Record New Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            This Month Expenses
          </span>
          <p className="text-2xl sm:text-3xl font-black text-slate-800 font-mono">
            {currency} {totalThisMonth.toLocaleString()}
          </p>
          <span className="text-[11px] text-blue-600 font-semibold block pt-1">
            {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
          </span>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Employee Salaries
          </span>
          <p className="text-2xl sm:text-3xl font-black text-purple-700 font-mono">
            {currency} {salaryTotal.toLocaleString()}
          </p>
          <span className="text-[11px] text-purple-600 font-semibold block pt-1">
            All-Time Salaries Paid
          </span>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Utility Bills & Rent
          </span>
          <p className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
            {currency} {(utilityTotal + rentTotal).toLocaleString()}
          </p>
          <span className="text-[11px] text-amber-600 font-semibold block pt-1">
            Shop Operational Overhead
          </span>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            All-Time Total Costs
          </span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {currency} {totalAllTime.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-500 font-semibold block pt-1">
            {expenses.length} Records In Ledger
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["all", "Salary", "Utility Bill", "Rent", "Maintenance", "Miscellaneous"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterCategory === cat
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search expenses..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Expense List / Table */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Expenses Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No business expenses match the current filter criteria. Click "Record New Expense" to add operational costs.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-5">Expense Title & Date</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Payment Channel</th>
                  <th className="py-3.5 px-5">Notes</th>
                  <th className="py-3.5 px-5 text-right">Amount</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <span className="font-bold text-slate-800 text-sm block">{exp.title}</span>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" /> {exp.date}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getCategoryBg(exp.category)}`}>
                        {getCategoryIcon(exp.category)}
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-lg text-[11px]">
                        {exp.paymentMethod || "Cash"}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-500 italic max-w-xs truncate">
                      {exp.notes || "—"}
                    </td>
                    <td className="py-4 px-5 text-right font-mono font-black text-slate-900 text-sm">
                      {currency} {exp.amount.toLocaleString()}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => setExpenseToDelete(exp)}
                        className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all cursor-pointer"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl max-w-md w-full relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" /> Record Business Expense
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Add operational costs, staff salaries, bills, or maintenance fees.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-4 mt-5 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Expense Title / Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Employee Salary - Usman, Shop Electricity Bill"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="Salary">Briefcase / Salary</option>
                    <option value="Utility Bill">Zap / Utility Bill</option>
                    <option value="Rent">Home / Rent</option>
                    <option value="Maintenance">Wrench / Maintenance</option>
                    <option value="Miscellaneous">Misc / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Amount ({currency}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 25000"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-mono font-bold text-sm outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1.5">
                  Payment Collection / Dispersal Channel
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Cash", "JazzCash", "EasyPaisa", "Bank Transfer"] as PaymentMethodType[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
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

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Notes / Memo (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Paid via JazzCash, Receipt #891"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Save Expense Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Expense Modal */}
      <ConfirmDeleteModal
        isOpen={!!expenseToDelete}
        title="Delete Expense Record?"
        itemName={expenseToDelete?.title}
        itemDetails={expenseToDelete ? `${currency} ${expenseToDelete.amount.toLocaleString()}` : undefined}
        message="Are you sure you want to remove this expense entry from your financial records?"
        confirmButtonText="Yes, Delete Expense"
        cancelButtonText="Cancel"
        onConfirm={() => {
          if (expenseToDelete) {
            onDeleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          }
        }}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  );
}
