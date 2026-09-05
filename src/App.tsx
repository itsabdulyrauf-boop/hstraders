/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Settings as SettingsIcon,
  ShieldCheck,
  Menu,
  X,
  Lock,
  LogOut,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  Clock,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { AppConfig, getAppConfig, saveAppConfig } from "./config";
import { Customer, AppStats, PaymentLog, Expense } from "./types";

import { 
  isFirebaseConfigured, 
  fetchCustomersFromFirebase, 
  saveCustomerToFirebase, 
  deleteCustomerFromFirebase,
  fetchCatalogFromFirebase, 
  saveCatalogToFirebase,
  fetchExpensesFromFirebase,
  saveExpenseToFirebase,
  saveExpensesToFirebase,
  deleteExpenseFromFirebase,
  replaceFullDatabaseInFirebase
} from "./lib/firebase";

import Dashboard from "./components/Dashboard";
import CustomerForm from "./components/CustomerForm";
import CustomerDetail from "./components/CustomerDetail";
import CustomerList from "./components/CustomerList";
import AdminLogin from "./components/AdminLogin";
import Settings from "./components/Settings";
import PendingInstallments from "./components/PendingInstallments";
import ExpenseManagement from "./components/ExpenseManagement";
import BrandLogo from "./components/BrandLogo";
import shTradersLogo from "./assets/images/sh_traders_logo_1785735758298.jpg";
import { exportCustomersToCSV } from "./utils/export";
import { sortCustomersBySerialNumber } from "./utils/ledger";

// Rich default demo accounts to populate blank states instantly
const DEMO_CUSTOMERS: Customer[] = [];
/*
  {
    id: "cust_demo_1",
    fullName: "Muhammad Khurram",
    cnic: "37405-1111111-1",
    primaryPhone: "+92 300 9876543",
    secondaryPhone: "+92 312 9876543",
    address: "House 42, Satellite Town, Rawalpindi, Punjab, Pakistan",
    createdAt: "2026-02-10T10:00:00.000Z",
    status: "active",
    product: {
      type: "Refrigerator",
      value: 120000,
      advance: 20000,
      remaining: 100000
    },
    plan: {
      numberOfInstallments: 10,
      monthlyAmount: 10000,
      dueDay: 5,
      startDate: "2026-03-01"
    },
    payments: [
      {
        id: "pay_demo_1_1",
        amount: 10000,
        date: "2026-03-04",
        receiptNumber: "RCP-782910",
        notes: "Logged Cash - Month 1 payment"
      },
      {
        id: "pay_demo_1_2",
        amount: 10000,
        date: "2026-04-05",
        receiptNumber: "RCP-812301",
        notes: "Bank Transfer - Month 2 payment"
      },
      {
        id: "pay_demo_1_3",
        amount: 10000,
        date: "2026-05-05",
        receiptNumber: "RCP-845910",
        notes: "Logged Cash - Month 3 payment"
      }
    ],
    references: [
      {
        id: "ref_demo_1_1",
        name: "Yasir Ali",
        phone: "+92 321 5556677",
        cnic: "37405-9999999-9",
        address: "Street 5, G-9, Islamabad"
      }
    ]
  },
  {
    id: "cust_demo_2",
    fullName: "Abdul Rehman",
    cnic: "37405-2222222-2",
    primaryPhone: "+92 321 1112233",
    address: "Apartment 4B, Sector F-11, Islamabad, Pakistan",
    createdAt: "2026-04-15T14:30:00.000Z",
    status: "overdue",
    product: {
      type: "Mobile Phone (iPhone 14 Pro Max)",
      value: 280000,
      advance: 80000,
      remaining: 200000
    },
    plan: {
      numberOfInstallments: 10,
      monthlyAmount: 20000,
      dueDay: 10,
      startDate: "2026-05-01"
    },
    payments: [
      {
        id: "pay_demo_2_1",
        amount: 20000,
        date: "2026-05-09",
        receiptNumber: "RCP-912803",
        notes: "Cash collection"
      }
    ],
    references: [
      {
        id: "ref_demo_2_1",
        name: "Bilal Khan",
        phone: "+92 301 2345678",
        cnic: "37405-8888888-8",
        address: "G-8/1, Islamabad"
      }
    ]
  },
  {
    id: "cust_demo_3",
    fullName: "Hamza Shaukat",
    cnic: "37405-3333333-3",
    primaryPhone: "+92 333 4445566",
    address: "Block C, DHA Phase 6, Lahore, Pakistan",
    createdAt: "2025-11-01T09:00:00.000Z",
    status: "completed",
    product: {
      type: "Motorcycle (Honda 125)",
      value: 150000,
      advance: 50000,
      remaining: 100000
    },
    plan: {
      numberOfInstallments: 5,
      monthlyAmount: 20000,
      dueDay: 15,
      startDate: "2025-11-15"
    },
    payments: [
      {
        id: "pay_demo_3_1",
        amount: 20000,
        date: "2025-11-14",
        receiptNumber: "RCP-110291",
        notes: "First installment - advance cash"
      },
      {
        id: "pay_demo_3_2",
        amount: 20000,
        date: "2025-12-15",
        receiptNumber: "RCP-120482",
        notes: "Month 2 installment"
      },
      {
        id: "pay_demo_3_3",
        amount: 20000,
        date: "2026-01-15",
        receiptNumber: "RCP-130910",
        notes: "Month 3 installment"
      },
      {
        id: "pay_demo_3_4",
        amount: 20000,
        date: "2026-02-14",
        receiptNumber: "RCP-140520",
        notes: "Month 4 installment"
      },
      {
        id: "pay_demo_3_5",
        amount: 20000,
        date: "2026-03-15",
        receiptNumber: "RCP-150912",
        notes: "Final clearance payout"
      }
    ],
    references: [
      {
        id: "ref_demo_3_1",
        name: "Yasir Ali",
        phone: "+92 321 5556677",
        cnic: "37405-9999999-9",
        address: "Street 5, G-9, Islamabad"
      }
    ]
  }
];
*/

export default function App() {
  // Navigation & Config UI states
  const [config, setConfig] = useState<AppConfig>(getAppConfig());
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const currentConfig = getAppConfig();
    const authLockEnabled = currentConfig.features.authLock ?? true;
    if (!authLockEnabled) return false;
    const sessionExpiry = localStorage.getItem("khubaib_admin_session_expires");
    const isValidSession = sessionExpiry && Number(sessionExpiry) > Date.now();
    return !isValidSession;
  });
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Ledger Database states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [prefilledCustomerForSale, setPrefilledCustomerForSale] = useState<Customer | null>(null);
  const [prefilledPlan, setPrefilledPlan] = useState<{
    productValue: number;
    advancePayment: number;
    numberOfInstallments: number;
  } | null>(null);

  // Dynamic Product Dropdown grew dynamically
  const [productPresetCatalog, setProductPresetCatalog] = useState<string[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load state from localStorage on Mount and sync with Firebase
  useEffect(() => {
    const initData = async () => {
      // 1. App configuration sync
      const currentConfig = getAppConfig();
      setConfig(currentConfig);
      const authLockEnabled = currentConfig.features.authLock ?? true;
      if (authLockEnabled) {
        const sessionExpiry = localStorage.getItem("khubaib_admin_session_expires");
        const isValidSession = sessionExpiry && Number(sessionExpiry) > Date.now();
        setIsLocked(!isValidSession);
      } else {
        setIsLocked(false);
      }

      // 2. Customers database load (no demo data, local mirror fallback)
      let initialCustomers: Customer[] = [];
      const savedCustomers = localStorage.getItem("khubaib_installment_customers");
      if (savedCustomers) {
        try {
          const parsed = JSON.parse(savedCustomers);
          initialCustomers = Array.isArray(parsed) ? parsed.map(normalizeCustomerPlan) : [];
        } catch (e) {
          console.warn("Failed to parse local customers:", e);
        }
      }
      const sortedInitial = sortCustomersBySerialNumber(initialCustomers);
      setCustomers(sortedInitial);

      // 3. Product list presets sync (local first)
      let initialCatalog = currentConfig.defaultProductTypes;
      const savedCatalog = localStorage.getItem("khubaib_installment_product_catalog");
      if (savedCatalog) {
        try {
          initialCatalog = JSON.parse(savedCatalog);
        } catch (e) {
          console.warn("Failed to parse local catalog:", e);
        }
      }
      setProductPresetCatalog(initialCatalog);

      // 3.5 Expenses load
      let initialExpensesList: Expense[] = [];
      const savedExpenses = localStorage.getItem("khubaib_installment_expenses");
      if (savedExpenses) {
        try {
          const parsedExp = JSON.parse(savedExpenses);
          if (Array.isArray(parsedExp)) initialExpensesList = parsedExp;
        } catch (e) {
          console.warn("Failed to parse local expenses:", e);
        }
      }
      setExpenses(initialExpensesList);

      // 4. Firebase Cloud Sync (all project data managed through Firebase)
      if (isFirebaseConfigured()) {
        try {
          const hasSyncedBefore = localStorage.getItem("khubaib_has_synced_firebase") === "true";

          // --- CUSTOMERS CLOUD SYNC ---
          const cloudCustomers = await fetchCustomersFromFirebase();
          if (cloudCustomers !== null && Array.isArray(cloudCustomers)) {
            if (cloudCustomers.length > 0) {
              const normalizedCloud = cloudCustomers.map(normalizeCustomerPlan);
              const sortedCloud = sortCustomersBySerialNumber(normalizedCloud);

              setCustomers(sortedCloud);
              localStorage.setItem("khubaib_installment_customers", JSON.stringify(sortedCloud));
              localStorage.setItem("khubaib_has_synced_firebase", "true");
            } else if (!hasSyncedBefore && initialCustomers && initialCustomers.length > 0) {
              // Initial one-time sync for brand-new Firebase instance
              for (const cust of initialCustomers) {
                await saveCustomerToFirebase(cust);
              }
              localStorage.setItem("khubaib_has_synced_firebase", "true");
            } else {
              // Firestore database is empty (all customers deleted)
              setCustomers([]);
              localStorage.setItem("khubaib_installment_customers", JSON.stringify([]));
              localStorage.setItem("khubaib_has_synced_firebase", "true");
            }
          }

          // --- PRODUCT CATALOG CLOUD SYNC ---
          const cloudCatalog = await fetchCatalogFromFirebase();
          if (cloudCatalog && cloudCatalog.length > 0) {
            setProductPresetCatalog(cloudCatalog);
            localStorage.setItem("khubaib_installment_product_catalog", JSON.stringify(cloudCatalog));
          } else if (!hasSyncedBefore && initialCatalog.length > 0) {
            await saveCatalogToFirebase(initialCatalog);
          }

          // --- EXPENSES CLOUD SYNC ---
          const cloudExpenses = await fetchExpensesFromFirebase();
          if (cloudExpenses !== null && Array.isArray(cloudExpenses)) {
            if (cloudExpenses.length > 0) {
              setExpenses(cloudExpenses);
              localStorage.setItem("khubaib_installment_expenses", JSON.stringify(cloudExpenses));
            } else if (!hasSyncedBefore && initialExpensesList && initialExpensesList.length > 0) {
              await saveExpensesToFirebase(initialExpensesList);
            } else {
              setExpenses([]);
              localStorage.setItem("khubaib_installment_expenses", JSON.stringify([]));
            }
          }
        } catch (error) {
          console.warn("Firebase initial loading sync failed (using local offline mirror):", error);
        }
      }
    };

    initData();

    // Listen to configuration dynamic updates
    const handleConfigChange = () => {
      const updated = getAppConfig();
      setConfig(updated);
    };
    window.addEventListener("app-config-changed", handleConfigChange);
    return () => window.removeEventListener("app-config-changed", handleConfigChange);
  }, []);

  // Dynamically calculate adjusted monthly installment amount for upcoming payments
  const normalizeCustomerPlan = (c: Customer): Customer => {
    const paidSum = (c.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, (c.product?.remaining || 0) - paidSum);
    const remainingInstallments = (c.plan?.numberOfInstallments || 0) - (c.payments || []).length;
    
    let monthlyAmount = c.plan?.monthlyAmount || 0;
    if (remaining <= 0) {
      monthlyAmount = 0;
    } else if ((c.payments || []).length > 0 && remainingInstallments > 0) {
      monthlyAmount = Math.round(remaining / remainingInstallments);
    } else if ((c.payments || []).length === 0 && (c.plan?.numberOfInstallments || 0) > 0 && remaining > 0) {
      monthlyAmount = Math.round(remaining / c.plan.numberOfInstallments);
    }

    const status = remaining <= 0 ? "completed" : (c.status === "completed" && remaining > 0 ? "active" : c.status);

    return {
      ...c,
      status: status as any,
      plan: {
        ...c.plan,
        monthlyAmount
      }
    };
  };

  // Sync customers to localStore on changes
  const saveCustomersData = (updatedCustomers: Customer[]) => {
    const normalized = updatedCustomers.map(normalizeCustomerPlan);
    const sorted = sortCustomersBySerialNumber(normalized);
    setCustomers(sorted);
    localStorage.setItem("khubaib_installment_customers", JSON.stringify(sorted));
  };

  // Safe wrapper for syncing single customer documents to Firestore
  const syncCustomerToCloud = async (customer: Customer) => {
    if (isFirebaseConfigured()) {
      try {
        await saveCustomerToFirebase(customer);
      } catch (error) {
        console.warn(`Firebase Firestore sync error for customer ${customer.id}:`, error);
      }
    }
  };

  // KPI calculations
  const calculateStats = (): AppStats => {
    const totalCustomers = customers.length;
    const activeAccounts = customers.filter((c) => c.status === "active").length;
    const completedAccounts = customers.filter((c) => c.status === "completed").length;
    
    // Sum product remaining balances
    const totalReceivables = customers.reduce((sum, c) => sum + c.product.remaining, 0);
    // Sum logs of paid payments
    const totalCollected = customers.reduce(
      (sum, c) => sum + c.payments.reduce((pSum, p) => pSum + p.amount, 0),
      0
    );
    const pendingAmount = Math.max(0, totalReceivables - totalCollected);
    const overdueInstallmentsCount = customers.filter((c) => c.status === "overdue").length;

    return {
      totalCustomers,
      activeAccounts,
      completedAccounts,
      totalReceivables,
      totalCollected,
      pendingAmount,
      overdueInstallmentsCount
    };
  };

  // Add customer callback
  const handleSaveCustomer = (customer: Customer) => {
    let updated: Customer[];
    const normalizedCustomer = normalizeCustomerPlan(customer);

    if (customers.some((c) => c.id === normalizedCustomer.id)) {
      // Edit mode
      updated = customers.map((c) => (c.id === normalizedCustomer.id ? normalizedCustomer : c));
    } else {
      // Add mode
      updated = [...customers, normalizedCustomer];
      
      // Grow the dynamic product preset catalog with the new item types automatically!
      if (normalizedCustomer.product.type && !productPresetCatalog.includes(normalizedCustomer.product.type)) {
        const updatedPreset = [...productPresetCatalog, normalizedCustomer.product.type];
        setProductPresetCatalog(updatedPreset);
        localStorage.setItem(
          "khubaib_installment_product_catalog",
          JSON.stringify(updatedPreset)
        );
        if (isFirebaseConfigured()) {
          saveCatalogToFirebase(updatedPreset);
        }
      }
    }

    saveCustomersData(updated);
    syncCustomerToCloud(normalizedCustomer);
    setPrefilledPlan(null);
    setPrefilledCustomerForSale(null);
    setActiveTab("customers");
    setSelectedCustomerId(normalizedCustomer.id); // View details immediately
    setEditingCustomer(undefined);
  };

  // Log new payment from customer detailed receipt list
  const handleLogPayment = (customerId: string, payment: PaymentLog) => {
    const updated = customers.map((c) => {
      if (c.id === customerId) {
        const payments = [...c.payments, payment];
        return normalizeCustomerPlan({
          ...c,
          payments
        });
      }
      return c;
    });
    saveCustomersData(updated);
    const updatedCust = updated.map(normalizeCustomerPlan).find((c) => c.id === customerId);
    if (updatedCust) {
      syncCustomerToCloud(updatedCust);
    }
  };

  // Delete payment receipt log
  const handleDeletePayment = (customerId: string, paymentId: string) => {
    const updated = customers.map((c) => {
      if (c.id === customerId) {
        const payments = c.payments.filter((p) => p.id !== paymentId);
        return normalizeCustomerPlan({
          ...c,
          payments
        });
      }
      return c;
    });
    saveCustomersData(updated);
    const updatedCust = updated.map(normalizeCustomerPlan).find((c) => c.id === customerId);
    if (updatedCust) {
      syncCustomerToCloud(updatedCust);
    }
  };

  // Update customer deal status manually
  const handleUpdateStatus = (customerId: string, status: "active" | "completed" | "overdue") => {
    const updated = customers.map((c) => (c.id === customerId ? { ...c, status } : c));
    saveCustomersData(updated);
    const updatedCust = updated.find((c) => c.id === customerId);
    if (updatedCust) {
      syncCustomerToCloud(updatedCust);
    }
  };

  // Delete customer account completely
  const handleDeleteCustomer = async (customerId: string) => {
    const updated = customers.filter((c) => c.id !== customerId);
    saveCustomersData(updated);
    localStorage.setItem("khubaib_has_synced_firebase", "true");
    if (isFirebaseConfigured()) {
      try {
        await deleteCustomerFromFirebase(customerId);
      } catch (error) {
        console.warn(`Firebase delete error for customer ${customerId}:`, error);
      }
    }
    if (selectedCustomerId === customerId) {
      setSelectedCustomerId(null);
    }
  };

  // Dynamic branding updates
  const handleSaveConfig = (updated: Partial<AppConfig>) => {
    saveAppConfig(updated);
    const updatedConfig = getAppConfig();
    setConfig(updatedConfig);
  };

  // Product catalog configurations
  const handleAddProductType = (newType: string) => {
    if (!productPresetCatalog.includes(newType)) {
      const updated = [...productPresetCatalog, newType];
      setProductPresetCatalog(updated);
      localStorage.setItem("khubaib_installment_product_catalog", JSON.stringify(updated));
      if (isFirebaseConfigured()) {
        saveCatalogToFirebase(updated);
      }
    }
  };

  const handleRemoveProductType = (typeToRemove: string) => {
    const updated = productPresetCatalog.filter((t) => t !== typeToRemove);
    setProductPresetCatalog(updated);
    localStorage.setItem("khubaib_installment_product_catalog", JSON.stringify(updated));
    if (isFirebaseConfigured()) {
      saveCatalogToFirebase(updated);
    }
  };

  // Expense Management Handlers
  const handleAddExpense = (exp: Expense) => {
    const updated = [exp, ...expenses];
    setExpenses(updated);
    localStorage.setItem("khubaib_installment_expenses", JSON.stringify(updated));
    if (isFirebaseConfigured()) {
      saveExpenseToFirebase(exp);
    }
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    localStorage.setItem("khubaib_installment_expenses", JSON.stringify(updated));
    if (isFirebaseConfigured()) {
      deleteExpenseFromFirebase(id);
    }
  };

  // Backup and recovery tools
  const handleBackupDatabase = () => {
    const databaseBackup = {
      version: config.version,
      appName: config.appName,
      exportDate: new Date().toISOString(),
      customers,
      productCatalog: productPresetCatalog,
      expenses,
      config
    };
    const blob = new Blob([JSON.stringify(databaseBackup, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanName = (config.appName || "hs_traders").toLowerCase().replace(/\s+/g, "_");
    link.download = `${cleanName}_db_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreDatabase = async (jsonData: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed && Array.isArray(parsed.customers)) {
        const normalizedCustomers = parsed.customers.map(normalizeCustomerPlan);
        const catalog = Array.isArray(parsed.productCatalog) ? parsed.productCatalog : productPresetCatalog;
        const restoredExpenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];

        // Hydrate database in local state & localStorage
        saveCustomersData(normalizedCustomers);

        if (Array.isArray(parsed.productCatalog)) {
          setProductPresetCatalog(catalog);
          localStorage.setItem(
            "khubaib_installment_product_catalog",
            JSON.stringify(catalog)
          );
        }

        if (Array.isArray(parsed.expenses)) {
          setExpenses(restoredExpenses);
          localStorage.setItem(
            "khubaib_installment_expenses",
            JSON.stringify(restoredExpenses)
          );
        }

        if (parsed.config) {
          saveAppConfig(parsed.config);
          setConfig(parsed.config);
        }

        // FIREBASE SYNC: If Firebase is connected, sync/replace full database in Firestore
        if (isFirebaseConfigured()) {
          await replaceFullDatabaseInFirebase(normalizedCustomers, catalog, restoredExpenses);
        }

        return true;
      }
    } catch (e) {
      console.warn("Failed to parse backup JSON:", e);
    }
    return false;
  };

  // Force push all local accounts, catalog, and expenses to Firebase Firestore
  const handleForceSyncCloud = async (): Promise<boolean> => {
    if (!isFirebaseConfigured()) return false;
    try {
      await replaceFullDatabaseInFirebase(customers, productPresetCatalog, expenses);
      return true;
    } catch (e) {
      console.warn("Manual Firebase sync failed:", e);
      return false;
    }
  };

  // Action: Clear local browser cache and fetch fresh data directly from Firebase Cloud
  const handleSyncFromCloudClearLocal = async (): Promise<boolean> => {
    try {
      // Clear local storage keys
      localStorage.removeItem("khubaib_installment_customers");
      localStorage.removeItem("khubaib_installment_product_catalog");
      localStorage.removeItem("khubaib_installment_expenses");
      localStorage.removeItem("khubaib_has_synced_firebase");

      if (isFirebaseConfigured()) {
        const cloudCustomers = await fetchCustomersFromFirebase();
        const cloudCatalog = await fetchCatalogFromFirebase();
        const cloudExpenses = await fetchExpensesFromFirebase();

        const sortedCustomers = sortCustomersBySerialNumber(cloudCustomers || []);
        setCustomers(sortedCustomers);
        setProductPresetCatalog(cloudCatalog || []);
        setExpenses(cloudExpenses || []);

        localStorage.setItem("khubaib_installment_customers", JSON.stringify(sortedCustomers));
        localStorage.setItem("khubaib_installment_product_catalog", JSON.stringify(cloudCatalog || []));
        localStorage.setItem("khubaib_installment_expenses", JSON.stringify(cloudExpenses || []));
        localStorage.setItem("khubaib_has_synced_firebase", "true");
        return true;
      } else {
        setCustomers([]);
        setExpenses([]);
        setProductPresetCatalog([]);
        return true;
      }
    } catch (e) {
      console.warn("Failed to clear local cache and sync from cloud:", e);
      return false;
    }
  };

  // Action: Wipe all locally stored offline browser cache
  const handleClearLocalData = () => {
    localStorage.removeItem("khubaib_installment_customers");
    localStorage.removeItem("khubaib_installment_product_catalog");
    localStorage.removeItem("khubaib_installment_expenses");
    localStorage.removeItem("khubaib_has_synced_firebase");

    setCustomers([]);
    setExpenses([]);
    setProductPresetCatalog([]);
  };

  // Export spreadsheet trigger
  const handleExportSheet = () => {
    exportCustomersToCSV(customers, config.appName);
  };

  // Lock session helper
  const handleLockSession = () => {
    localStorage.removeItem("khubaib_admin_session_expires");
    setIsLocked(true);
  };

  // Retrieve current customer being viewed
  const currentViewedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Safe side menu navigation
  const navigateToTab = (tab: string) => {
    if (tab !== "add_customer") {
      setPrefilledCustomerForSale(null);
    }
    setActiveTab(tab);
    setSelectedCustomerId(null); // clear detail drill-downs
    setEditingCustomer(undefined);
    setMobileMenuOpen(false);
  };

  const handleRegisterNewSaleForCustomer = (customer: Customer) => {
    setPrefilledCustomerForSale(customer);
    setEditingCustomer(undefined);
    setSelectedCustomerId(null);
    setActiveTab("add_customer");
  };

  const handleSelectCustomerFromDash = (id: string) => {
    setSelectedCustomerId(id);
    setActiveTab("customers");
  };

  // Return Lock Screen if authLock is active and session is locked
  if ((config.features.authLock ?? true) && isLocked) {
    return (
      <AdminLogin
        appName={config.appName}
        brandLogo={config.brandLogo}
        onUnlock={() => {
          // Store session validity for 24 hours (1 day = 86,400,000 ms)
          localStorage.setItem("khubaib_admin_session_expires", String(Date.now() + 24 * 60 * 60 * 1000));
          setIsLocked(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row">
      {/* Mobile Drawer Navigation Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              id="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-50 md:hidden"
            />
            {/* Drawer Content */}
            <motion.div
              id="mobile-drawer-content"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-slate-900 text-white z-50 p-6 flex flex-col justify-between shadow-2xl md:hidden"
            >
              <div>
                {/* Header inside drawer */}
                <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
                  <div className="flex items-center gap-3">
                    <BrandLogo
                      logoUrl={config.brandLogo !== undefined ? config.brandLogo : shTradersLogo}
                      alt={`${config.appName} Logo`}
                      className="w-10 h-10 object-cover rounded-xl border border-amber-400/30 shadow-md ring-2 ring-emerald-500/20"
                      iconClassName="w-5 h-5 text-emerald-400"
                    />
                    <div>
                      <h2 className="text-base font-black tracking-tight text-white">
                        {config.appName}
                      </h2>
                      <p className="text-[10px] text-emerald-400 font-semibold uppercase">
                        Installment & Trade Ledger
                      </p>
                    </div>
                  </div>
                  <button
                    id="mobile-drawer-close"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Navigation Links */}
                <nav className="space-y-1.5">
                  {/* Dashboard */}
                  <button
                    id="mobile-nav-btn-dashboard"
                    onClick={() => navigateToTab("dashboard")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                      activeTab === "dashboard" && !selectedCustomerId
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard Insights
                  </button>

                  {/* Customers list */}
                  <button
                    id="mobile-nav-btn-customers"
                    onClick={() => navigateToTab("customers")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                      activeTab === "customers" || selectedCustomerId
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <Users className="w-4 h-4" /> Customers Ledger
                  </button>

                  {/* New Sale Registration */}
                  <button
                    id="mobile-nav-btn-add-customer"
                    onClick={() => navigateToTab("add_customer")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                      activeTab === "add_customer"
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <UserPlus className="w-4 h-4" /> Register New Sale
                  </button>

                  {/* Pending Installments Tracker */}
                  <button
                    id="mobile-nav-btn-pending"
                    onClick={() => navigateToTab("pending")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                      activeTab === "pending"
                        ? "bg-amber-600 text-white shadow-lg shadow-amber-600/15"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <Clock className="w-4 h-4 text-amber-400" /> Pending Installments
                  </button>

                  {/* Expense Management */}
                  <button
                    id="mobile-nav-btn-expenses"
                    onClick={() => navigateToTab("expenses")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                      activeTab === "expenses"
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-600/15"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-purple-400" /> Business Expenses
                  </button>

                  {/* System settings */}
                  <button
                    id="mobile-nav-btn-settings"
                    onClick={() => navigateToTab("settings")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                      activeTab === "settings"
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <SettingsIcon className="w-4 h-4" /> Brand & Settings
                  </button>
                </nav>
              </div>

              {/* Mobile Drawer Footer */}
              <div className="border-t border-slate-800 pt-6 space-y-3">
                {/* Lock session manually */}
                {(config.features.authLock ?? true) && (
                  <button
                    id="mobile-nav-btn-lock"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLockSession();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/30 text-xs font-bold text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-800"
                  >
                    <Lock className="w-3.5 h-3.5" /> Lock Application
                  </button>
                )}

                {/* Version badge */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold px-2">
                  <span>{config.appName}</span>
                  <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    v{config.version}
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dynamic desktop sidebar */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-white shrink-0 md:sticky md:top-0 md:h-screen flex-col justify-between z-30">
        <div>
          {/* Brand header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo
                logoUrl={config.brandLogo !== undefined ? config.brandLogo : shTradersLogo}
                alt={`${config.appName} Logo`}
                className="w-11 h-11 object-cover rounded-xl border border-amber-400/30 shadow-md ring-2 ring-emerald-500/20"
                iconClassName="w-6 h-6 text-emerald-400"
              />
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-white">
                  {config.appName}
                </h1>
                <p className="text-[10px] text-emerald-400 font-semibold tracking-wide uppercase mt-0.5">
                  Installment Ledger
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {/* Dashboard */}
            <button
              id="nav-btn-dashboard"
              onClick={() => navigateToTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === "dashboard" && !selectedCustomerId
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard Insights
            </button>

            {/* Customers list */}
            <button
              id="nav-btn-customers"
              onClick={() => navigateToTab("customers")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                (activeTab === "customers" || selectedCustomerId)
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <Users className="w-4 h-4" /> Customers Ledger
            </button>

            {/* New Sale Registration */}
            <button
              id="nav-btn-add-customer"
              onClick={() => navigateToTab("add_customer")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === "add_customer"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <UserPlus className="w-4 h-4" /> Register New Sale
            </button>

            {/* Pending Installments Tracker */}
            <button
              id="nav-btn-pending"
              onClick={() => navigateToTab("pending")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === "pending"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/15"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <Clock className="w-4 h-4 text-amber-400" /> Pending Installments
            </button>

            {/* Expense Management */}
            <button
              id="nav-btn-expenses"
              onClick={() => navigateToTab("expenses")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === "expenses"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/15"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <DollarSign className="w-4 h-4 text-purple-400" /> Business Expenses
            </button>

            {/* System settings */}
            <button
              id="nav-btn-settings"
              onClick={() => navigateToTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === "settings"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <SettingsIcon className="w-4 h-4" /> Brand & Settings
            </button>
          </nav>
        </div>

        {/* Sidebar Footer details */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          {/* Lock session manually */}
          {(config.features.authLock ?? true) && (
            <button
              id="nav-btn-lock"
              onClick={handleLockSession}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/30 text-xs font-bold text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-800"
            >
              <Lock className="w-3.5 h-3.5" /> Lock Application
            </button>
          )}

          {/* Version badge */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold px-2">
            <span>{config.appName}</span>
            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
              v{config.version}
            </span>
          </div>
        </div>
      </aside>

      {/* Main viewport area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile quick action bar */}
        <header className="md:hidden bg-slate-900 text-white p-3.5 flex items-center justify-between sticky top-0 z-40 shadow-md">
          <div className="flex items-center gap-2.5">
            <BrandLogo
              logoUrl={config.brandLogo !== undefined ? config.brandLogo : shTradersLogo}
              alt={`${config.appName} Logo`}
              className="w-8 h-8 object-cover rounded-lg border border-amber-400/30"
              iconClassName="w-4 h-4 text-emerald-400"
            />
            <span className="text-sm font-black">{config.appName}</span>
          </div>
          <button
            id="mobile-menu-trigger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Content body container */}
        <div className="p-4 sm:p-8 flex-1 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedCustomerId || "") + (editingCustomer ? "_edit" : "")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* Detailed profile routing */}
              {selectedCustomerId && currentViewedCustomer ? (
                editingCustomer ? (
                  <CustomerForm
                    existingCustomer={editingCustomer}
                    allCustomers={customers}
                    knownProductTypes={productPresetCatalog}
                    currency={config.defaultCurrency}
                    onSave={handleSaveCustomer}
                    onCancel={() => setEditingCustomer(undefined)}
                  />
                ) : (
                  <CustomerDetail
                    customer={currentViewedCustomer}
                    allCustomers={customers}
                    currency={config.defaultCurrency}
                    appName={config.appName}
                    onBack={() => setSelectedCustomerId(null)}
                    onEdit={() => setEditingCustomer(currentViewedCustomer)}
                    onDeleteCustomer={handleDeleteCustomer}
                    onLogPayment={(pay) => handleLogPayment(currentViewedCustomer.id, pay)}
                    onDeletePayment={(payId) => handleDeletePayment(currentViewedCustomer.id, payId)}
                    onUpdateStatus={(stat) => handleUpdateStatus(currentViewedCustomer.id, stat)}
                    onUpdateCustomer={(updated) => handleSaveCustomer(updated)}
                    onRegisterNewSaleForCustomer={handleRegisterNewSaleForCustomer}
                    onSelectCustomer={setSelectedCustomerId}
                  />
                )
              ) : (
                /* Tab based rendering */
                <>
                  {activeTab === "dashboard" && (
                    <Dashboard
                      stats={calculateStats()}
                      customers={customers}
                      currency={config.defaultCurrency}
                      onNavigate={navigateToTab}
                      onSelectCustomer={handleSelectCustomerFromDash}
                      onApplyPlan={(plan) => {
                        setPrefilledPlan(plan);
                        navigateToTab("add_customer");
                      }}
                    />
                  )}

                  {activeTab === "customers" && (
                    <CustomerList
                      customers={customers}
                      currency={config.defaultCurrency}
                      onSelectCustomer={setSelectedCustomerId}
                      onDeleteCustomer={handleDeleteCustomer}
                      onNavigate={navigateToTab}
                      onExportExcel={handleExportSheet}
                    />
                  )}

                  {activeTab === "add_customer" && (
                    <CustomerForm
                      allCustomers={customers}
                      knownProductTypes={productPresetCatalog}
                      currency={config.defaultCurrency}
                      onSave={handleSaveCustomer}
                      onCancel={() => {
                        setPrefilledPlan(null);
                        setPrefilledCustomerForSale(null);
                        navigateToTab("dashboard");
                      }}
                      prefilledPlan={prefilledPlan}
                      prefilledCustomer={prefilledCustomerForSale || undefined}
                    />
                  )}

                  {activeTab === "pending" && (
                    <PendingInstallments
                      customers={customers}
                      currency={config.defaultCurrency}
                      onSelectCustomer={setSelectedCustomerId}
                      appName={config.appName}
                    />
                  )}

                  {activeTab === "expenses" && (
                    <ExpenseManagement
                      expenses={expenses}
                      onAddExpense={handleAddExpense}
                      onDeleteExpense={handleDeleteExpense}
                      currency={config.defaultCurrency}
                    />
                  )}

                  {activeTab === "settings" && (
                    <Settings
                      config={config}
                      onSaveConfig={handleSaveConfig}
                      productTypes={productPresetCatalog}
                      onAddProductType={handleAddProductType}
                      onRemoveProductType={handleRemoveProductType}
                      onBackup={handleBackupDatabase}
                      onRestore={handleRestoreDatabase}
                      onForceSyncCloud={handleForceSyncCloud}
                      onClearLocalData={handleClearLocalData}
                      onSyncFromCloudClearLocal={handleSyncFromCloudClearLocal}
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
