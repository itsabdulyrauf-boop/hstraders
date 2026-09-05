/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Lock, Mail, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { fetchAdminCredentialsFromFirebase } from "../lib/firebase";
import BrandLogo from "./BrandLogo";
import shTradersLogo from "../assets/images/sh_traders_logo_1785735758298.jpg";

interface AdminLoginProps {
  onUnlock: () => void;
  appName: string;
  brandLogo?: string;
}

export default function AdminLogin({ onUnlock, appName, brandLogo }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Clear error when typing
  useEffect(() => {
    if (error) setError("");
  }, [email, password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const creds = await fetchAdminCredentialsFromFirebase();
      if (
        email.trim().toLowerCase() === creds.email.toLowerCase() &&
        password === creds.password
      ) {
        onUnlock();
      } else {
        setError("Invalid admin credentials. Please try again.");
      }
    } catch (err) {
      setError("Authentication error occurred. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 select-none">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/20 transition-all">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="inline-flex p-1 bg-white/10 backdrop-blur-sm rounded-2xl mb-3 shadow-md border border-white/20">
            <BrandLogo
              logoUrl={brandLogo !== undefined ? brandLogo : shTradersLogo}
              alt={`${appName} Logo`}
              className="w-16 h-16 object-cover rounded-xl"
              iconClassName="w-8 h-8 text-emerald-400"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">{appName}</h1>
          <p className="text-xs sm:text-sm text-blue-200 mt-1 flex items-center justify-center gap-1.5 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Secure Admin Portal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs sm:text-sm text-red-700 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="admin-login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. hstraders@gmail.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-2xl text-sm text-slate-800 outline-none transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  id="admin-login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-2xl text-sm text-slate-800 outline-none transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            id="admin-login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-70 text-white font-bold text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer mt-6"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying Credentials...
              </span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium text-center">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>24-Hour Persistent Session</span>
          </div>
          <span className="text-[10px] text-slate-400">Secure Admin Management Portal</span>
        </div>
      </div>
    </div>
  );
}
