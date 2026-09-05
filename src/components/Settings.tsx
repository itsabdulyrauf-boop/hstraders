/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Save,
  Trash2,
  Plus,
  RefreshCw,
  Download,
  Upload,
  Coins,
  AppWindow,
  RotateCcw,
  Cloud,
  CloudOff,
  KeyRound,
  Mail,
  Lock,
  AlertCircle,
  MessageCircle
} from "lucide-react";
import { AppConfig, APP_CONFIG } from "../config";
import BrandLogo from "./BrandLogo";
import { 
  isFirebaseConfigured, 
  getFirebaseProjectId,
  fetchAdminCredentialsFromFirebase,
  saveAdminCredentialsToFirebase
} from "../lib/firebase";

interface SettingsProps {
  config: AppConfig;
  onSaveConfig: (updated: Partial<AppConfig>) => void;
  productTypes: string[];
  onAddProductType: (type: string) => void;
  onRemoveProductType: (type: string) => void;
  onBackup: () => void;
  onRestore: (jsonData: string) => Promise<boolean> | boolean;
  onForceSyncCloud?: () => Promise<boolean>;
  onClearLocalData?: () => void;
  onSyncFromCloudClearLocal?: () => Promise<boolean>;
}

export default function Settings({
  config,
  onSaveConfig,
  productTypes,
  onAddProductType,
  onRemoveProductType,
  onBackup,
  onRestore,
  onForceSyncCloud,
  onClearLocalData,
  onSyncFromCloudClearLocal
}: SettingsProps) {
  // Config States
  const [appName, setAppName] = useState(config.appName);
  const [currency, setCurrency] = useState(config.defaultCurrency);
  const [brandLogo, setBrandLogo] = useState<string>(config.brandLogo ?? APP_CONFIG.brandLogo ?? "");
  const [authLockEnabled, setAuthLockEnabled] = useState(config.features.authLock ?? true);
  const [reminderSms, setReminderSms] = useState(
    config.smsTemplates?.reminder || APP_CONFIG.smsTemplates!.reminder
  );
  const [overdueSms, setOverdueSms] = useState(
    config.smsTemplates?.overdue || APP_CONFIG.smsTemplates!.overdue
  );

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Selected logo image is too large. Please select an image under 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setBrandLogo(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sync States
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [clearCacheSuccess, setClearCacheSuccess] = useState<string | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isSyncingCloudFresh, setIsSyncingCloudFresh] = useState(false);

  // Admin Auth States
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authSaveSuccess, setAuthSaveSuccess] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    fetchAdminCredentialsFromFirebase().then((creds) => {
      setAdminEmail(creds.email);
      setAdminPassword(creds.password);
    });
  }, []);

  // New product type builder
  const [newProductType, setNewProductType] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();

    onSaveConfig({
      appName: appName.trim() || "HS Traders",
      defaultCurrency: currency,
      brandLogo: brandLogo,
      smsTemplates: {
        reminder: reminderSms.trim() || APP_CONFIG.smsTemplates!.reminder,
        overdue: overdueSms.trim() || APP_CONFIG.smsTemplates!.overdue
      },
      features: {
        ...config.features,
        authLock: authLockEnabled
      }
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSaveAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setAuthError("Email and password cannot be empty.");
      return;
    }
    const success = await saveAdminCredentialsToFirebase({
      email: adminEmail.trim(),
      password: adminPassword.trim()
    });
    if (success) {
      setAuthSaveSuccess(true);
      setTimeout(() => setAuthSaveSuccess(false), 2000);
    } else {
      setAuthError("Failed to save credentials to Firebase. Check network connection.");
    }
  };

  const handleAddType = () => {
    if (newProductType.trim()) {
      onAddProductType(newProductType.trim());
      setNewProductType("");
    }
  };

  const [isRestoring, setIsRestoring] = useState(false);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = event.target?.result;
      if (typeof data === "string") {
        try {
          const success = await onRestore(data);
          if (success) {
            alert("Database restored successfully and synchronized!");
            window.location.reload();
          } else {
            alert("Failed to restore database. Invalid backup JSON structure.");
          }
        } catch (err) {
          alert("Error restoring database: " + err);
        } finally {
          setIsRestoring(false);
        }
      } else {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  const isConfigured = isFirebaseConfigured();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Firebase Sync Status Panel */}
      <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm transition-all ${
        isConfigured 
          ? "bg-emerald-50/55 border-emerald-100/80 text-emerald-800" 
          : "bg-amber-50/55 border-amber-100/80 text-amber-800"
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-2xl shrink-0 ${
            isConfigured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}>
            {isConfigured ? <Cloud className="w-5 h-5 animate-pulse" /> : <CloudOff className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-extrabold flex items-center gap-1.5">
              Firebase Cloud Database: {isConfigured ? "Connected" : "Offline Mode"}
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
              {isConfigured 
                ? "Your installment accounts, payments history, and product constants are fully synchronized in real-time with Google Firebase Firestore."
                : "The application is currently running in Secure Local-Only Mode. To enable real-time cloud backup, declare your Firebase Web SDK config variables in your project settings."
              }
            </p>
          </div>
        </div>
        {isConfigured ? (
          <div className="flex flex-col sm:flex-row items-center gap-2 self-stretch sm:self-auto shrink-0">
            <div className="bg-white/80 backdrop-blur px-3 py-2 rounded-xl border border-emerald-200/50 text-[11px] text-emerald-800 font-mono font-bold flex items-center justify-center shadow-sm">
              Project: {getFirebaseProjectId()}
            </div>
            {onForceSyncCloud && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={async () => {
                  setIsSyncing(true);
                  const ok = await onForceSyncCloud();
                  setIsSyncing(false);
                  if (ok) {
                    setSyncSuccess(true);
                    setTimeout(() => setSyncSuccess(false), 5000);
                  }
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Uploading..." : "Push Local to Cloud"}
              </button>
            )}
            {onSyncFromCloudClearLocal && (
              <button
                type="button"
                disabled={isSyncingCloudFresh}
                onClick={async () => {
                  setIsSyncingCloudFresh(true);
                  const ok = await onSyncFromCloudClearLocal();
                  setIsSyncingCloudFresh(false);
                  if (ok) {
                    setClearCacheSuccess("Local cache cleared and fresh data loaded from Firebase Cloud!");
                    setTimeout(() => setClearCacheSuccess(null), 5000);
                  }
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloudFresh ? "animate-spin" : ""}`} />
                {isSyncingCloudFresh ? "Fetching..." : "Fetch Cloud & Wipe Cache"}
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur px-3 py-2 rounded-xl border border-amber-200/50 text-[10px] text-slate-500 font-mono self-stretch sm:self-auto flex items-center justify-center">
            VITE_FIREBASE_PROJECT_ID is empty
          </div>
        )}
      </div>

      {/* Sync indicator banner */}
      {syncSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 rounded-2xl flex items-center gap-2.5 animate-bounce shadow-sm font-medium text-sm">
          <Cloud className="w-5 h-5 text-emerald-600 animate-pulse shrink-0" /> 
          ✓ Success! All local customer accounts and catalog presets have been uploaded and synchronized with your Firebase Firestore database!
        </div>
      )}

      {/* Clear Cache indicator banner */}
      {clearCacheSuccess && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-5 py-3 rounded-2xl flex items-center gap-2.5 animate-bounce shadow-sm font-medium text-sm">
          <RotateCcw className="w-5 h-5 text-blue-600 animate-spin shrink-0" /> 
          {clearCacheSuccess}
        </div>
      )}

      {/* Save indicator banner */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-5 py-3 rounded-2xl flex items-center gap-2 animate-bounce">
          <Save className="w-5 h-5 text-emerald-600 animate-pulse" /> Settings updated successfully! Dynamic branding applied.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Dynamic Branding & Currency */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AppWindow className="w-5 h-5 text-blue-500" /> Dynamic Brand Configurations
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-5">
              {/* Dynamic Business Logo Upload Section */}
              <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Business Brand Logo
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Upload your official logo. If no logo is available, a clean profile icon is shown automatically across all headers, logins, and prints.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md shrink-0">
                    Dynamic Logo
                  </span>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  {/* Live Logo Preview Box */}
                  <div className="relative group shrink-0">
                    <BrandLogo
                      logoUrl={brandLogo}
                      alt="Logo Preview"
                      className="w-16 h-16 object-cover rounded-2xl border-2 border-emerald-400/50 shadow-md ring-4 ring-emerald-500/10"
                      iconClassName="w-8 h-8 text-emerald-400"
                    />
                  </div>

                  {/* Logo Controls */}
                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor="logo-file-upload"
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload New Logo
                      </label>
                      <input
                        id="logo-file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />

                      {brandLogo && (
                        <button
                          type="button"
                          onClick={() => setBrandLogo("")}
                          className="px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          title="Remove custom logo and switch to profile icon fallback"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove Logo
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Supports PNG, JPG, WEBP, or SVG formats (recommended square aspect ratio).
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic App Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Dynamic Application Name
                </label>
                <input
                  id="input-set-app-name"
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="e.g. HS Traders"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Changing this value instantly re-brands all headers, titles, splash logos, and prints!
                </p>
              </div>

              {/* Currency Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  System Currency Display Symbol
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Coins className="w-4 h-4 text-slate-400" />
                  </span>
                  <select
                    id="select-set-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none"
                  >
                    <option value="PKR">PKR (₨) - Pakistan Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="SAR">SAR (ر.س) - Saudi Riyal</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                  </select>
                </div>
              </div>

              {/* Dynamic SMS Reminder Templates */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-emerald-600" /> Automated SMS Reminder Templates
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Customize SMS text sent to customers from device. Use dynamic tags: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]">{"{name}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]">{"{app_name}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]">{"{amount}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]">{"{months}"}</code>
                  </p>
                </div>

                {/* Standard Reminder SMS Template */}
                <div className="space-y-1.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      1. Standard Payment Reminder SMS (Normal Accounts)
                    </label>
                    <button
                      type="button"
                      onClick={() => setReminderSms(APP_CONFIG.smsTemplates!.reminder)}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      Reset Urdu Default
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={reminderSms}
                    onChange={(e) => setReminderSms(e.target.value)}
                    placeholder="Enter reminder SMS template..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 transition-all resize-none"
                    dir="auto"
                  />
                </div>

                {/* Overdue / Arrears Reminder SMS Template */}
                <div className="space-y-1.5 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-900">
                      2. Overdue Installments Reminder SMS (Missed 1 or 2+ Months)
                    </label>
                    <button
                      type="button"
                      onClick={() => setOverdueSms(APP_CONFIG.smsTemplates!.overdue)}
                      className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                    >
                      Reset Urdu Default
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={overdueSms}
                    onChange={(e) => setOverdueSms(e.target.value)}
                    placeholder="Enter overdue reminder SMS template..."
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-amber-500 transition-all resize-none"
                    dir="auto"
                  />
                </div>
              </div>

              {/* Admin Authentication Shield */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Admin Login Security Shield</h4>
                    <p className="text-[11px] text-slate-400">Force email and password entry on application startup</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="checkbox-set-auth-toggle"
                      type="checkbox"
                      checked={authLockEnabled}
                      onChange={(e) => setAuthLockEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              </div>

              {/* Save Trigger */}
              <div className="pt-4 border-t border-slate-100 text-right">
                <button
                  id="settings-btn-save"
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-1.5 ml-auto"
                >
                  <Save className="w-4 h-4" /> Save App Configuration
                </button>
              </div>
            </form>
          </div>

          {/* Admin Credentials Management Panel */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-600" /> Admin Credentials Settings
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update login email and password stored securely in Firebase Firestore.
                </p>
              </div>
              {authSaveSuccess && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full animate-pulse">
                  ✓ Saved to Firebase
                </span>
              )}
            </div>

            <form onSubmit={handleSaveAdminAuth} className="space-y-4 pt-2 border-t border-slate-100">
              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{authError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Admin Email Address</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="settings-admin-email"
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="hstraders@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">New Password</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      id="settings-admin-password"
                      type="text"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white font-mono"
                    />
                  </div>
                </div>
              </div>
              <div className="text-right pt-2">
                <button
                  id="settings-btn-save-auth"
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-1.5 ml-auto"
                >
                  <Save className="w-4 h-4" /> Update Admin Credentials
                </button>
              </div>
            </form>
          </div>

          {/* Database Operations & Recovery Tools */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Database Storage & Sync Tools</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Offline-first data is stored securely in your web space. Run periodic backups for safety.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Backup */}
              <button
                id="settings-btn-backup"
                onClick={onBackup}
                className="p-4 bg-slate-50 border border-slate-100 hover:border-blue-500/20 hover:bg-blue-50/10 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-3 group"
              >
                <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                    Export Backup File
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">
                    Download complete ledger data as database JSON file.
                  </span>
                </div>
              </button>

              {/* Restore */}
              <label className={`p-4 bg-slate-50 border border-slate-100 hover:border-emerald-500/20 hover:bg-emerald-50/10 rounded-2xl text-left transition-all flex items-start gap-3 group ${isRestoring ? "opacity-50 pointer-events-none cursor-wait" : "cursor-pointer"}`}>
                <input
                  id="input-set-restore-file"
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  disabled={isRestoring}
                  className="hidden"
                />
                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                  <Upload className={`w-5 h-5 ${isRestoring ? "animate-bounce" : ""}`} />
                </div>
                <div>
                  <span className="block font-bold text-sm text-slate-800 group-hover:text-emerald-600 transition-colors">
                    {isRestoring ? "Restoring Database..." : "Import Restore File"}
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">
                    {isRestoring ? "Synchronizing restored records to database & cloud..." : "Load backup JSON file to populate database."}
                  </span>
                </div>
              </label>

              {/* Fetch Fresh Cloud Data & Wipe Local Cache */}
              {onSyncFromCloudClearLocal && (
                <button
                  type="button"
                  disabled={isSyncingCloudFresh}
                  onClick={async () => {
                    setIsSyncingCloudFresh(true);
                    const ok = await onSyncFromCloudClearLocal();
                    setIsSyncingCloudFresh(false);
                    if (ok) {
                      setClearCacheSuccess("Wiped local cache and re-synced fresh data from Firebase Cloud!");
                      setTimeout(() => setClearCacheSuccess(null), 5000);
                    }
                  }}
                  className="p-4 bg-blue-50/60 border border-blue-100 hover:border-blue-500/30 hover:bg-blue-50 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-3 group sm:col-span-1"
                >
                  <div className="bg-blue-100 text-blue-700 p-2.5 rounded-xl">
                    <RefreshCw className={`w-5 h-5 ${isSyncingCloudFresh ? "animate-spin" : ""}`} />
                  </div>
                  <div>
                    <span className="block font-bold text-sm text-slate-800 group-hover:text-blue-700 transition-colors">
                      Sync Cloud & Wipe Cache
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Clears offline local cache and pulls exact current data from Firebase.
                    </span>
                  </div>
                </button>
              )}

              {/* Wipe Local Cache Storage Only */}
              {onClearLocalData && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(true)}
                  className="p-4 bg-red-50/60 border border-red-100 hover:border-red-500/30 hover:bg-red-50 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-3 group sm:col-span-1"
                >
                  <div className="bg-red-100 text-red-600 p-2.5 rounded-xl">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block font-bold text-sm text-red-900 group-hover:text-red-600 transition-colors">
                      Clear Local Browser Cache
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Remove locally stored offline database copy from this browser.
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal: Confirm Clear Local Cache */}
        {showClearConfirmModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="p-3 bg-red-100 rounded-2xl">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Clear Local Storage Cache?</h3>
                  <p className="text-xs text-slate-500">This action wipes local browser memory.</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700 space-y-2">
                <p className="font-medium">
                  This will remove offline customer accounts, catalog, and expense cache saved inside this web browser.
                </p>
                <p className="text-emerald-700 font-bold">
                  ✓ Your Firebase Cloud database data will remain completely safe.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowClearConfirmModal(false);
                    if (onClearLocalData) {
                      onClearLocalData();
                      setClearCacheSuccess("Local browser storage cache cleared successfully!");
                      setTimeout(() => setClearCacheSuccess(null), 5000);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Local Cache
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Product Types Management Panel */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Product List Constants</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Predefined catalog suggestions for dynamic dropdown choices.
              </p>
            </div>

            {/* Quick Add Product Type Input */}
            <div className="flex gap-2">
              <input
                id="input-add-product-type"
                type="text"
                value={newProductType}
                onChange={(e) => setNewProductType(e.target.value)}
                placeholder="e.g. Sofa Set"
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
              />
              <button
                id="settings-btn-add-product-type"
                onClick={handleAddType}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer active:scale-95 transition-all"
                title="Add to preset catalog"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Types listings scroll area */}
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
              {productTypes.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No types listed. Add above!</p>
              ) : (
                productTypes.map((type) => (
                  <div
                    key={type}
                    className="flex justify-between items-center px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <span className="text-xs font-semibold text-slate-700">{type}</span>
                    <button
                      id={`settings-btn-remove-product-type-${type.replace(/\s+/g, "_")}`}
                      onClick={() => onRemoveProductType(type)}
                      className="text-slate-400 hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
