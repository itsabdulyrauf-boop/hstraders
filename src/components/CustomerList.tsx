/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Search,
  Phone,
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Filter,
  FileSpreadsheet,
  MessageCircle,
  Trash2,
  Calendar,
  CircleDollarSign,
  TrendingUp,
  HandCoins,
  Receipt,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Customer } from "../types";
import { getLedgerSerialNumber, sortCustomersBySerialNumber } from "../utils/ledger";
import { getFormattedSms, getAppConfig } from "../config";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import {
  getAvailableMonthKeys,
  calculateMonthlySalesSummary,
  getCustomerSaleMonthKey,
  getCustomerSaleDate,
  formatMonthKeyToLabel
} from "../utils/salesAnalytics";

interface CustomerListProps {
  customers: Customer[];
  currency: string;
  onSelectCustomer: (id: string) => void;
  onDeleteCustomer?: (id: string) => void;
  onNavigate: (tab: string) => void;
  onExportExcel: () => void;
}

export default function CustomerList({
  customers, 
  currency,
  onSelectCustomer,
  onDeleteCustomer,
  onNavigate,
  onExportExcel
}: CustomerListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "overdue">("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const itemsPerPage = 20;

  // Available month options
  const availableMonths = useMemo(() => getAvailableMonthKeys(customers), [customers]);

  // Current and last month keys
  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const lastMonthKey = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // Reset pagination to page 1 whenever filters or search query change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, monthFilter]);

  // Send Message notification toast state
  const [notification, setNotification] = useState<{
    show: boolean;
    customerName: string;
  }>({ show: false, customerName: "" });

  const showNotification = (customerName: string) => {
    setNotification({ show: true, customerName });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  // Send pre-written Urdu Message via regular SMS
  const handleSendMessage = (customer: Customer) => {
    const phone = customer.primaryPhone.replace(/[\s\-\(\)]/g, "");
    const config = getAppConfig();
    const message = getFormattedSms("reminder", {
      name: customer.fullName,
      appName: config.appName,
      amount: customer.plan.monthlyAmount,
      phone: customer.primaryPhone,
      cnic: customer.cnic
    });
    const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
    showNotification(customer.fullName);
  };

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

  // Filter customers list
  const filteredRaw = useMemo(() => {
    return customers.filter((c) => {
      // Search query matches name, cnic, phone, serial number, or promise details
      const normalizedQuery = searchQuery.toLowerCase().trim();
      const serial = getLedgerSerialNumber(c).toLowerCase();
      const promiseNotes = (c.installmentPromises || []).map((p) => `${p.note || ""} ${p.promisedDate}`).join(" ").toLowerCase();
      const matchesSearch =
        c.fullName.toLowerCase().includes(normalizedQuery) ||
        c.cnic.includes(normalizedQuery) ||
        c.primaryPhone.includes(normalizedQuery) ||
        (c.secondaryPhone && c.secondaryPhone.includes(normalizedQuery)) ||
        serial.includes(normalizedQuery) ||
        (c.promiseToPay?.note && c.promiseToPay.note.toLowerCase().includes(normalizedQuery)) ||
        (c.promiseToPay?.date && c.promiseToPay.date.toLowerCase().includes(normalizedQuery)) ||
        promiseNotes.includes(normalizedQuery);

      // Status filter matches
      const hasPromise = !!c.promiseToPay || (!!c.installmentPromises && c.installmentPromises.length > 0);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "promised" ? hasPromise : c.status === statusFilter);

      // Month filter matches
      const matchesMonth =
        monthFilter === "all" || getCustomerSaleMonthKey(c) === monthFilter;

      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [customers, searchQuery, statusFilter, monthFilter]);

  // Compute monthly sales summary stats for the current month filter
  const monthlyStats = useMemo(() => {
    return calculateMonthlySalesSummary(customers, monthFilter);
  }, [customers, monthFilter]);

  // Sort sequentially by serial number (HST-1, HST-2, HST-3...)
  const filteredCustomers: Customer[] = sortCustomersBySerialNumber(filteredRaw as Customer[]);

  // Pagination calculation (20 customers per page)
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedCustomers: Customer[] = filteredCustomers.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Customer Accounts Ledger</h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse, search, and manage installment details of {customers.length} registered customer accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {customers.length > 0 && (
            <button
              id="list-btn-export"
              onClick={onExportExcel}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/50"
              title="Export statement to Excel CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Sheet
            </button>
          )}
          <button
            id="list-btn-add-new"
            onClick={() => onNavigate("add_customer")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/10"
          >
            <Plus className="w-4 h-4" /> Add Register
          </button>
        </div>
      </div>

      {/* Filter and Search Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="md:col-span-5 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            id="input-list-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, CNIC, HST-#..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:border-blue-500 outline-none shadow-sm transition-all"
          />
        </div>

        {/* Status Dropdown Filter */}
        <div className="md:col-span-3 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <Filter className="w-4 h-4" />
          </span>
          <select
            id="select-list-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:border-blue-500 outline-none shadow-sm cursor-pointer transition-all appearance-none font-medium text-slate-700 truncate"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="promised">🤝 Promised</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Month Dropdown Filter */}
        <div className="md:col-span-4 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <Calendar className="w-4 h-4 text-blue-600" />
          </span>
          <select
            id="select-list-month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-blue-200 rounded-2xl text-sm focus:border-blue-500 outline-none shadow-sm cursor-pointer transition-all appearance-none font-bold text-slate-800 truncate"
          >
            <option value="all">All Months ({customers.length} Accounts)</option>
            {availableMonths.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} ({m.salesCount} {m.salesCount === 1 ? "Sale" : "Sales"})
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Monthly Sales Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
        {/* Banner Top Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-400">
                  {monthFilter === "all" ? "All-Time Sales Overview" : `${monthlyStats.monthLabel} Sales Report`}
                </span>
                <span className="bg-white/10 text-slate-300 font-bold text-[10px] px-2 py-0.5 rounded-full">
                  {monthlyStats.salesCount} {monthlyStats.salesCount === 1 ? "Sale Booked" : "Sales Booked"}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                  {currency} {monthlyStats.totalSalesValue.toLocaleString()}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {monthFilter === "all" ? "Total product sales registered across all time" : `Total sales volume registered in ${monthlyStats.monthLabel}`}
              </p>
            </div>
          </div>

          {/* Quick Month Switch Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10 self-start lg:self-center">
            <button
              type="button"
              onClick={() => setMonthFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                monthFilter === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setMonthFilter(currentMonthKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                monthFilter === currentMonthKey
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setMonthFilter(lastMonthKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                monthFilter === lastMonthKey
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Last Month
            </button>
          </div>
        </div>

        {/* Financial Metrics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
          {/* Advance / Down Payments */}
          <div className="bg-emerald-950/40 border border-emerald-800/50 p-3.5 rounded-2xl backdrop-blur-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <HandCoins className="w-3.5 h-3.5 text-emerald-400" /> Advance Received
              </span>
            </p>
            <p className="text-lg sm:text-xl font-black text-emerald-300 font-mono mt-1" title={`${currency} ${monthlyStats.totalAdvanceCollected.toLocaleString()}`}>
              {currency} {formatCompact(monthlyStats.totalAdvanceCollected)}
            </p>
            <p className="text-[11px] text-emerald-400/80 mt-0.5">
              Down payments on {monthlyStats.salesCount} bookings
            </p>
          </div>

          {/* Installments Collected */}
          <div className="bg-blue-950/40 border border-blue-800/50 p-3.5 rounded-2xl backdrop-blur-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-blue-400" /> Installments Received
              </span>
            </p>
            <p className="text-lg sm:text-xl font-black text-blue-300 font-mono mt-1" title={`${currency} ${monthlyStats.installmentsCollectedInMonth.toLocaleString()}`}>
              {currency} {formatCompact(monthlyStats.installmentsCollectedInMonth)}
            </p>
            <p className="text-[11px] text-blue-400/80 mt-0.5">
              {monthlyStats.installmentsCountInMonth} monthly installment receipts
            </p>
          </div>

          {/* Total Cash Inflow */}
          <div className="bg-indigo-950/40 border border-indigo-800/50 p-3.5 rounded-2xl backdrop-blur-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Total Cash Inflow
              </span>
            </p>
            <p className="text-lg sm:text-xl font-black text-indigo-300 font-mono mt-1" title={`${currency} ${monthlyStats.totalCashInflow.toLocaleString()}`}>
              {currency} {formatCompact(monthlyStats.totalCashInflow)}
            </p>
            <p className="text-[11px] text-indigo-400/80 mt-0.5">
              Advance + Installments collected
            </p>
          </div>
        </div>
      </div>

      {/* Grid List View */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm">
          <div className="bg-slate-50 text-slate-400 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Customers Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords, clearing filters, or create a brand new customer registry.
          </p>
          <button
            id="list-btn-reset-filters"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="mt-4 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedCustomers.map((customer) => {
            // Calculations
            const totalPaidInstallments = customer.payments.reduce((sum, p) => sum + p.amount, 0);
            const remainingPrincipal = customer.product.remaining - totalPaidInstallments;
            
            // Total Deal Price is principal + advance
            const totalDealValue = customer.product.value;
            const absolutePaidToDate = customer.product.advance + totalPaidInstallments;
            
            // Progress percentage
            const progressPercent = totalDealValue > 0
              ? Math.round((absolutePaidToDate / totalDealValue) * 100)
              : 0;

            return (
              <div
                key={customer.id}
                id={`customer-card-${customer.id}`}
                onClick={() => onSelectCustomer(customer.id)}
                className="bg-white border border-slate-200/80 hover:border-blue-400 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 p-5 flex flex-col justify-between group cursor-pointer border-l-4 border-l-slate-300 hover:border-l-blue-600"
              >
                {/* Card Top Metadata Header Row (Serial No on Left, Status + Actions on Right) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100/80 gap-2">
                    {/* Serial Number Badge */}
                    <span className="bg-slate-100 text-slate-950 text-xs sm:text-sm font-sans font-black px-3 py-1 rounded-xl border-2 border-slate-300 shrink-0 flex items-center gap-1 shadow-2xs">
                      <span className="text-slate-700 font-black text-xs">#</span>
                      <strong className="font-sans font-black text-slate-900 text-xs sm:text-sm tracking-wide">{getLedgerSerialNumber(customer)}</strong>
                    </span>

                    {/* Status Pill & Delete Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {customer.status === "completed" ? (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2.5 py-1 rounded-xl font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-200/60 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid
                        </span>
                      ) : customer.status === "overdue" ? (
                        <span className="bg-red-50 text-red-700 text-[10px] px-2.5 py-1 rounded-xl font-bold uppercase tracking-wider flex items-center gap-1 border border-red-200/60 shadow-2xs animate-pulse">
                          <AlertCircle className="w-3 h-3 text-red-600" /> Overdue
                        </span>
                      ) : (
                        <span className="bg-blue-50 text-blue-700 text-[10px] px-2.5 py-1 rounded-xl font-bold uppercase tracking-wider flex items-center gap-1 border border-blue-200/60 shadow-2xs">
                          <Clock className="w-3 h-3 text-blue-600" /> Active
                        </span>
                      )}

                      {onDeleteCustomer && (
                        <button
                          type="button"
                          id={`btn-delete-customer-${customer.id}`}
                          title="Delete Customer Account"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomerToDelete(customer);
                          }}
                          className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Customer Main Profile Info Row */}
                  <div className="flex items-center gap-3 pt-0.5">
                    {customer.profileImage ? (
                      <img
                        src={customer.profileImage}
                        alt={customer.fullName}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200/80 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black flex items-center justify-center text-base shadow-sm shrink-0">
                        {customer.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors truncate">
                        {customer.fullName}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono tracking-wide mt-0.5 flex items-center gap-1.5">
                        <span className="text-slate-400 font-sans">CNIC:</span> {customer.cnic}
                      </p>
                    </div>
                  </div>

                  {/* Deal Details Box */}
                  <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-3.5 space-y-2.5 mt-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                      <div className="min-w-0">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          Item Sold
                        </span>
                        <span className="font-extrabold text-slate-800 text-xs truncate block">
                          {customer.product.brand ? `${customer.product.brand} ` : ""}
                          {customer.product.type}
                          {customer.product.model ? ` (${customer.product.model})` : ""}
                          {customer.product.modelYear ? ` [${customer.product.modelYear}]` : ""}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          Deal Price
                        </span>
                        <span className="font-extrabold text-slate-900 font-mono text-xs">
                          {currency} {customer.product.value.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Product Spec Badges (Brand, Year, Type, Chassis, Engine, Reg, Serial/IMEI, Sale Date) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-slate-200/80 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" /> Sale: {getCustomerSaleDate(customer)}
                      </span>
                      {customer.product.bikeType && (
                        <span className="bg-amber-100/70 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-amber-200/60">
                          {customer.product.bikeType}
                        </span>
                      )}
                      {customer.product.registrationNumber && (
                        <span className="bg-blue-100/70 text-blue-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-blue-200/60">
                          Reg: {customer.product.registrationNumber}
                        </span>
                      )}
                      {customer.product.chassisNumber && (
                        <span className="bg-amber-100/70 text-amber-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-amber-200/60">
                          Chassis: {customer.product.chassisNumber}
                        </span>
                      )}
                      {customer.product.engineNumber && (
                        <span className="bg-emerald-100/70 text-emerald-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-emerald-200/60">
                          Eng: {customer.product.engineNumber}
                        </span>
                      )}
                      {customer.product.serialNumber && !customer.product.chassisNumber && (
                        <span className="bg-purple-100/70 text-purple-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-purple-200/60">
                          IMEI/SN: {customer.product.serialNumber}
                        </span>
                      )}
                    </div>

                    {/* Promise to Pay or Partial Down Payment Badges */}
                    {(() => {
                      const reqAdv = customer.product.advance || 0;
                      const paidAdv = customer.product.downPaymentPaid ?? reqAdv;
                      const isDpPending = reqAdv > paidAdv && !customer.product.downPaymentCleared;
                      if (!customer.promiseToPay && !isDpPending) return null;

                      return (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {isDpPending && (
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-amber-200/80 flex items-center gap-1">
                              ⚠️ Down Payment Due: {currency} {(reqAdv - paidAdv).toLocaleString()}
                            </span>
                          )}
                          {customer.promiseToPay && (
                            <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-blue-200/80 flex items-center gap-1">
                              🤝 Promised: {customer.promiseToPay.date}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Payment Numbers Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-white/80 p-2 rounded-xl border border-slate-200/50">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          Monthly Plan
                        </span>
                        <span className="font-bold text-slate-700 font-mono text-[11px] block mt-0.5">
                          {currency} {customer.plan.monthlyAmount.toLocaleString()} × {customer.plan.numberOfInstallments}m
                        </span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl border border-slate-200/50">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          Payable Left
                        </span>
                        <span className={`font-black font-mono text-[11px] block mt-0.5 ${remainingPrincipal > 0 ? "text-slate-900" : "text-emerald-600"}`}>
                          {currency} {remainingPrincipal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Progress & Contact Footer Block */}
                <div className="mt-4 space-y-3">
                  {/* Progress Line */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-black">
                      <span className="text-slate-400 tracking-wider">COLLECTION STATUS</span>
                      <span className="text-blue-600 font-mono font-bold">{progressPercent}% PAID</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          customer.status === "completed"
                            ? "bg-emerald-500"
                            : customer.status === "overdue"
                            ? "bg-red-500"
                            : "bg-blue-600"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Contact Footer block */}
                  <div className="flex flex-col gap-2.5 pt-2.5 border-t border-slate-100 text-slate-500">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono font-bold">{customer.primaryPhone}</span>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                        Due Day {customer.plan.dueDay}
                      </span>
                    </div>

                    <button
                      id={`btn-send-message-${customer.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendMessage(customer);
                      }}
                      className="w-full mt-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-emerald-600/20 h-10 border border-emerald-700/20"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" /> Send Message (SMS)
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredCustomers.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm mt-6">
          <span className="text-xs font-semibold text-slate-500">
            Showing <strong className="text-slate-800">{(activePage - 1) * itemsPerPage + 1}</strong> to <strong className="text-slate-800">{Math.min(activePage * itemsPerPage, filteredCustomers.length)}</strong> of <strong className="text-slate-800">{filteredCustomers.length}</strong> total accounts
          </span>
          <div className="flex items-center gap-2">
            <button
              id="pagination-prev"
              disabled={activePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-bold text-slate-700 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono">
              Page {activePage} of {totalPages}
            </span>
            <button
              id="pagination-next"
              disabled={activePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-3 max-w-sm sm:max-w-md"
          >
            <div className="bg-emerald-500 text-white p-1.5 rounded-lg shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">Reminder Prepared!</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Urdu message opened for <strong className="text-white">{notification.customerName}</strong>.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Customer Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!customerToDelete}
        title="Delete Customer Account?"
        itemName={customerToDelete?.fullName}
        itemDetails={customerToDelete ? `Serial: #${getLedgerSerialNumber(customerToDelete)}` : undefined}
        message={
          customerToDelete
            ? `Are you sure you want to delete customer "${customerToDelete.fullName}"? All associated installment plans, ledger records, and payment history will be permanently deleted.`
            : "This action will permanently remove this customer account."
        }
        confirmButtonText="Yes, Delete Customer"
        cancelButtonText="Cancel"
        onConfirm={() => {
          if (customerToDelete && onDeleteCustomer) {
            onDeleteCustomer(customerToDelete.id);
            setCustomerToDelete(null);
          }
        }}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>
  );
}
