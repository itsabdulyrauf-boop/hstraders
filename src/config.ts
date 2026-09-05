/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import shTradersLogo from "./assets/images/sh_traders_logo_1785735758298.jpg";

export interface SmsTemplatesConfig {
  reminder: string;
  overdue: string;
}

export interface AppConfig {
  appName: string;
  version: string;
  developerEmail: string;
  defaultCurrency: string;
  defaultProductTypes: string[];
  brandLogo?: string;
  smsTemplates?: SmsTemplatesConfig;
  features: {
    authLock: boolean;
    pdfExport: boolean;
    excelExport: boolean;
  };
}

// Global configuration object with fallback defaults
export const APP_CONFIG: AppConfig = {
  appName: "HS Traders",
  version: "1.0.0",
  developerEmail: "itsabdulrightsoft@gmail.com",
  defaultCurrency: "PKR",
  brandLogo: shTradersLogo,
  defaultProductTypes: [
    "Mobile Phone",
    "Laptop",
    "Motorcycle",
    "Refrigerator",
    "Sofa Set",
    "Washing Machine",
    "Air Conditioner",
    "Television",
    "Microwave Oven"
  ],
  smsTemplates: {
    reminder: "محترم {name}، آپ کے قسط اکاؤنٹ ({app_name}) کی یاد دہانی: براہِ کرم اپنی قسط کی ادائیگی بروقت یقینی بنائیں۔ شکریہ۔",
    overdue: "محترم {name}، آپ کے قسط اکاؤنٹ ({app_name}) کی {months} ماہ کی قسط واجب الادا ہے۔ براہِ کرم جلد از جلد ادائیگی یقینی بنائیں۔ شکریہ۔"
  },
  features: {
    authLock: true,
    pdfExport: true,
    excelExport: true
  }
};

// Helper to get configuration with dynamic overrides from localStorage if customized
export function getAppConfig(): AppConfig {
  const saved = localStorage.getItem("khubaib_installment_config");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      let appName = parsed.appName;
      if (!appName || appName === "Khubaib Installment" || appName === "SH Traders" || appName === "sh traders" || appName === "SH-Traders" || appName === "SHT Traders") {
        appName = "HS Traders";
      }
      return {
        ...APP_CONFIG,
        ...parsed,
        appName,
        smsTemplates: {
          ...APP_CONFIG.smsTemplates!,
          ...(parsed.smsTemplates || {})
        },
        features: {
          ...APP_CONFIG.features,
          ...(parsed.features || {})
        }
      };
    } catch (e) {
      console.warn("Failed to load saved configuration, falling back to defaults.", e);
    }
  }
  return APP_CONFIG;
}

// Helper to save updated configuration (e.g. changing the app name in settings)
export function saveAppConfig(config: Partial<AppConfig>): void {
  const current = getAppConfig();
  const updated = { ...current, ...config };
  localStorage.setItem("khubaib_installment_config", JSON.stringify(updated));
  
  // Also dispatch a custom event so other components know the name changed
  window.dispatchEvent(new Event("app-config-changed"));
}

// Helper to format SMS template with dynamic variables
export function getFormattedSms(
  type: "reminder" | "overdue",
  vars: {
    name: string;
    appName: string;
    months?: number;
    amount?: number;
    phone?: string;
    cnic?: string;
  }
): string {
  const config = getAppConfig();
  const template = type === "reminder"
    ? (config.smsTemplates?.reminder || APP_CONFIG.smsTemplates!.reminder)
    : (config.smsTemplates?.overdue || APP_CONFIG.smsTemplates!.overdue);

  return template
    .replace(/\{name\}/g, vars.name || "")
    .replace(/\{app_name\}/g, vars.appName || "")
    .replace(/\{months\}/g, String(vars.months ?? ""))
    .replace(/\{amount\}/g, vars.amount !== undefined ? vars.amount.toLocaleString() : "")
    .replace(/\{phone\}/g, vars.phone || "")
    .replace(/\{cnic\}/g, vars.cnic || "");
}
