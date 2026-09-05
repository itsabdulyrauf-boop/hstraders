/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Trash2, ShieldAlert, ArrowLeft, Check, AlertCircle, Camera, Upload, X, UserPlus } from "lucide-react";
import { Customer, Reference, ProductSale, InstallmentPlan } from "../types";
import {
  getLedgerSerialNumber,
  getNextAvailableSerialNumber,
  isSerialNumberUnique,
  normalizeSerialNumber,
  parseSerialNumberInteger
} from "../utils/ledger";
import {
  getAllBikeBrands,
  addCustomBikeBrand,
  deleteCustomBikeBrand,
  getStoredCustomBrands,
  DEFAULT_BIKE_BRANDS,
  STATIC_BIKE_TYPES
} from "../utils/brands";

interface CustomerFormProps {
  onSave: (customer: Customer) => void;
  onCancel: () => void;
  existingCustomer?: Customer;
  prefilledCustomer?: Customer | null;
  allCustomers?: Customer[];
  knownProductTypes: string[];
  currency: string;
  prefilledPlan?: {
    productValue: number;
    advancePayment: number;
    numberOfInstallments: number;
  } | null;
}

export default function CustomerForm({
  onSave,
  onCancel,
  existingCustomer,
  prefilledCustomer,
  allCustomers = [],
  knownProductTypes,
  currency,
  prefilledPlan
}: CustomerFormProps) {
  // Serial / Account Number State (Stores numeric portion e.g. "1", "5", "100")
  const [accountNumber, setAccountNumber] = useState<string>("");

  // Helper to extract numeric portion from full serial string (e.g. "HST-A/C-12" -> "12")
  const getNumericSerial = (fullSerial: string): string => {
    const parsed = parseSerialNumberInteger(fullSerial);
    if (parsed !== null) return parsed.toString();
    return fullSerial.replace(/^HST-A\/C-|^HST-/i, "");
  };

  // Customer Details State
  const [fullName, setFullName] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [address, setAddress] = useState("");
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);

  // Partial Down Payment State
  const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [isPartialDownPayment, setIsPartialDownPayment] = useState<boolean>(false);
  const [downPaymentPaid, setDownPaymentPaid] = useState<number | "">("");
  const [downPaymentDueDate, setDownPaymentDueDate] = useState<string>(defaultDueDate);
  const [downPaymentNotes, setDownPaymentNotes] = useState<string>("");

  // High compression image uploader using HTML5 Canvas (compresses to ~5-15KB JPEG)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 250; // max width or height 250px
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        // High compression JPEG (quality 0.65)
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.65);
        setProfileImage(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Product Sale State
  const [productType, setProductType] = useState("");
  const [productModel, setProductModel] = useState("");
  const [productBrand, setProductBrand] = useState("");
  const [customBrandInput, setCustomBrandInput] = useState("");
  const [productModelYear, setProductModelYear] = useState("");
  const [productBikeType, setProductBikeType] = useState("");
  const [customBikeTypeInput, setCustomBikeTypeInput] = useState("");
  
  const [availableBrands, setAvailableBrands] = useState<string[]>(getAllBikeBrands());
  const [isManageBrandsModalOpen, setIsManageBrandsModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  const [productSerialNumber, setProductSerialNumber] = useState("");
  const [productImei2, setProductImei2] = useState("");
  const [productChassisNumber, setProductChassisNumber] = useState("");
  const [productEngineNumber, setProductEngineNumber] = useState("");
  const [productRegistrationNumber, setProductRegistrationNumber] = useState("");
  const [productColor, setProductColor] = useState("");
  const [productSpecsNote, setProductSpecsNote] = useState("");
  const [showAllSpecs, setShowAllSpecs] = useState(false);

  const [productValue, setProductValue] = useState<number | "">("");
  const [advancePayment, setAdvancePayment] = useState<number | "">("");
  const [remainingBalance, setRemainingBalance] = useState(0);

  // Plan State
  const [numberOfInstallments, setNumberOfInstallments] = useState<number>(12);
  const [monthlyAmount, setMonthlyAmount] = useState<number>(0);
  const [dueDay, setDueDay] = useState<number>(5);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  // References State
  const [references, setReferences] = useState<Reference[]>([]);

  // Validation State
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reference to track initial loading state per customer ID or session to prevent re-resetting form fields while user types
  const loadedKeyRef = React.useRef<string | null>(null);

  // Initialize form if editing or prefilled customer/plan is provided
  useEffect(() => {
    const currentKey = existingCustomer
      ? `edit_${existingCustomer.id}`
      : prefilledCustomer
      ? `prefilled_cust_${prefilledCustomer.id}`
      : prefilledPlan
      ? "prefilled"
      : "new";
    if (loadedKeyRef.current === currentKey) {
      return; // Already initialized for this view, do not reset user's active typed changes!
    }
    loadedKeyRef.current = currentKey;

    if (existingCustomer) {
      setAccountNumber(getNumericSerial(getLedgerSerialNumber(existingCustomer)));
      setFullName(existingCustomer.fullName);
      setPrimaryPhone(existingCustomer.primaryPhone);
      setSecondaryPhone(existingCustomer.secondaryPhone || "");
      setCnic(existingCustomer.cnic);
      setAddress(existingCustomer.address);
      setProfileImage(existingCustomer.profileImage);
      setProductType(existingCustomer.product.type);
      setProductModel(existingCustomer.product.model || "");
      setProductBrand(existingCustomer.product.brand || "");
      if (existingCustomer.product.brand && !availableBrands.includes(existingCustomer.product.brand)) {
        setCustomBrandInput(existingCustomer.product.brand);
      }
      setProductModelYear(existingCustomer.product.modelYear || "");
      setProductBikeType(existingCustomer.product.bikeType || "");
      if (existingCustomer.product.bikeType && !STATIC_BIKE_TYPES.includes(existingCustomer.product.bikeType)) {
        setCustomBikeTypeInput(existingCustomer.product.bikeType);
      }
      setProductSerialNumber(existingCustomer.product.serialNumber || "");
      setProductImei2(existingCustomer.product.imei2 || "");
      setProductChassisNumber(existingCustomer.product.chassisNumber || "");
      setProductEngineNumber(existingCustomer.product.engineNumber || "");
      setProductRegistrationNumber(existingCustomer.product.registrationNumber || "");
      setProductColor(existingCustomer.product.color || "");
      setProductSpecsNote(existingCustomer.product.specsNote || "");
      
      // Auto expand specs if any extra field is filled
      if (
        existingCustomer.product.model ||
        existingCustomer.product.brand ||
        existingCustomer.product.modelYear ||
        existingCustomer.product.bikeType ||
        existingCustomer.product.serialNumber ||
        existingCustomer.product.imei2 ||
        existingCustomer.product.chassisNumber ||
        existingCustomer.product.engineNumber ||
        existingCustomer.product.registrationNumber ||
        existingCustomer.product.color ||
        existingCustomer.product.specsNote
      ) {
        setShowAllSpecs(true);
      }

      setProductValue(existingCustomer.product.value);
      setAdvancePayment(existingCustomer.product.advance);

      // Partial Down Payment check
      const reqAdv = existingCustomer.product.advance || 0;
      const paidAdv = existingCustomer.product.downPaymentPaid ?? reqAdv;
      if (paidAdv < reqAdv && !existingCustomer.product.downPaymentCleared) {
        setIsPartialDownPayment(true);
        setDownPaymentPaid(paidAdv);
        setDownPaymentDueDate(existingCustomer.product.downPaymentDueDate || defaultDueDate);
        setDownPaymentNotes(existingCustomer.product.downPaymentNotes || "");
      } else {
        setIsPartialDownPayment(false);
        setDownPaymentPaid(reqAdv);
        setDownPaymentDueDate(defaultDueDate);
        setDownPaymentNotes("");
      }

      setRemainingBalance(existingCustomer.product.remaining);
      setNumberOfInstallments(existingCustomer.plan.numberOfInstallments);
      setMonthlyAmount(existingCustomer.plan.monthlyAmount);
      setDueDay(existingCustomer.plan.dueDay);
      setStartDate(existingCustomer.plan.startDate);
      setReferences(existingCustomer.references);
    } else if (prefilledCustomer) {
      // Registering new sale for an existing customer
      setAccountNumber(getNumericSerial(getNextAvailableSerialNumber(allCustomers)));
      setFullName(prefilledCustomer.fullName);
      setPrimaryPhone(prefilledCustomer.primaryPhone);
      setSecondaryPhone(prefilledCustomer.secondaryPhone || "");
      setCnic(prefilledCustomer.cnic);
      setAddress(prefilledCustomer.address);
      setProfileImage(prefilledCustomer.profileImage);
      setReferences(prefilledCustomer.references && prefilledCustomer.references.length > 0 ? prefilledCustomer.references : [
        {
          id: Math.random().toString(),
          name: "",
          phone: "",
          cnic: "",
          address: ""
        }
      ]);
      setProductType("");
      setProductModel("");
      setProductBrand("");
      setProductValue("");
      setAdvancePayment("");
    } else if (prefilledPlan) {
      setAccountNumber(getNumericSerial(getNextAvailableSerialNumber(allCustomers)));
      setProductValue(prefilledPlan.productValue);
      setAdvancePayment(prefilledPlan.advancePayment);
      setDownPaymentPaid(prefilledPlan.advancePayment);
      setNumberOfInstallments(prefilledPlan.numberOfInstallments);
      const remaining = Math.max(0, prefilledPlan.productValue - prefilledPlan.advancePayment);
      setRemainingBalance(remaining);
      if (prefilledPlan.numberOfInstallments > 0) {
        setMonthlyAmount(Math.round(remaining / prefilledPlan.numberOfInstallments));
      }
      setFullName("");
      setPrimaryPhone("");
      setSecondaryPhone("");
      setCnic("");
      setAddress("");
      setProductType("");
      setReferences([
        {
          id: Math.random().toString(),
          name: "",
          phone: "",
          cnic: "",
          address: ""
        }
      ]);
    } else {
      setAccountNumber(getNumericSerial(getNextAvailableSerialNumber(allCustomers)));
      // Add one default blank reference to encourage the user
      setReferences([
        {
          id: Math.random().toString(),
          name: "",
          phone: "",
          cnic: "",
          address: ""
        }
      ]);
    }
  }, [existingCustomer?.id, prefilledCustomer?.id, prefilledPlan]);

  // Auto-calculate remaining balance and installment amount
  useEffect(() => {
    const value = typeof productValue === "number" ? productValue : 0;
    const advance = typeof advancePayment === "number" ? advancePayment : 0;
    const remaining = Math.max(0, value - advance);
    setRemainingBalance(remaining);

    if (numberOfInstallments > 0) {
      const calculatedMonthly = Math.round(remaining / numberOfInstallments);
      setMonthlyAmount(calculatedMonthly);
    } else {
      setMonthlyAmount(0);
    }
  }, [productValue, advancePayment, numberOfInstallments]);

  // Handle references management
  const addReference = () => {
    setReferences((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        name: "",
        phone: "",
        cnic: "",
        address: ""
      }
    ]);
  };

  const removeReference = (id: string) => {
    setReferences((prev) => prev.filter((ref) => ref.id !== id));
  };

  const updateReference = (id: string, field: keyof Reference, value: string) => {
    setReferences((prev) =>
      prev.map((ref) => (ref.id === id ? { ...ref, [field]: value } : ref))
    );
  };

  // Validate fields before saving
  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};

    // Account Number Validation
    const cleanNum = accountNumber.trim().replace(/^HST-A\/C-|^HST-/i, "");
    if (!cleanNum) {
      tempErrors.accountNumber = "Account Number is required";
    } else {
      const normalized = normalizeSerialNumber(`HST-A/C-${cleanNum}`);
      if (!isSerialNumberUnique(normalized, allCustomers, existingCustomer?.id)) {
        tempErrors.accountNumber = `Account Number '${normalized}' is already assigned to another customer!`;
      }
    }

    if (!fullName.trim()) tempErrors.fullName = "Full Name is required";
    if (!primaryPhone.trim()) tempErrors.primaryPhone = "Primary Phone is required";
    if (!cnic.trim()) tempErrors.cnic = "National ID / CNIC is required";
    if (!address.trim()) tempErrors.address = "Address is required";
    if (!productType.trim()) tempErrors.productType = "Product type or title is required";
    if (productValue === "" || productValue <= 0)
      tempErrors.productValue = "Product Value must be greater than zero";
    if (advancePayment === "" || advancePayment < 0)
      tempErrors.advancePayment = "Down payment cannot be negative";
    if (numberOfInstallments <= 0)
      tempErrors.numberOfInstallments = "At least 1 month duration is required";

    if (isPartialDownPayment) {
      if (downPaymentPaid === "" || Number(downPaymentPaid) < 0) {
        tempErrors.downPaymentPaid = "Paid down payment amount must be 0 or greater";
      } else if (Number(downPaymentPaid) > Number(advancePayment)) {
        tempErrors.downPaymentPaid = "Paid down payment cannot exceed required advance amount";
      }
      if (!downPaymentDueDate) {
        tempErrors.downPaymentDueDate = "Agreed payment due date is required for partial down payment";
      }
    }

    // References validation (at least one valid reference name/phone)
    if (references.length > 0) {
      references.forEach((ref, index) => {
        if (!ref.name.trim()) {
          tempErrors[`ref_${ref.id}_name`] = `Reference #${index + 1} Name is required`;
        }
        if (!ref.phone.trim()) {
          tempErrors[`ref_${ref.id}_phone`] = `Reference #${index + 1} Phone is required`;
        }
      });
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // scroll to top/error area
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const cleanNum = accountNumber.trim().replace(/^HST-A\/C-|^HST-/i, "");
    const assignedLedgerNumber = normalizeSerialNumber(`HST-A/C-${cleanNum}`);
    const reqAdv = Number(advancePayment) || 0;
    const paidAdv = isPartialDownPayment
      ? (typeof downPaymentPaid === "number" ? downPaymentPaid : 0)
      : reqAdv;
    const isCleared = paidAdv >= reqAdv;

    const savedCustomer: Customer = {
      id: existingCustomer?.id || `cust_${Date.now()}`,
      accountNumber: assignedLedgerNumber,
      fullName: fullName.trim(),
      primaryPhone: primaryPhone.trim(),
      secondaryPhone: secondaryPhone.trim() || undefined,
      cnic: cnic.trim(),
      address: address.trim(),
      references: references.map((ref) => ({
        ...ref,
        name: ref.name.trim(),
        phone: ref.phone.trim(),
        cnic: ref.cnic.trim(),
        address: ref.address.trim()
      })),
      product: {
        type: productType.trim(),
        model: productModel.trim() || undefined,
        brand: (productBrand === "Other" ? customBrandInput : productBrand).trim() || undefined,
        modelYear: productModelYear.trim() || undefined,
        bikeType: (productBikeType === "Other" ? customBikeTypeInput : productBikeType).trim() || undefined,
        serialNumber: productSerialNumber.trim() || undefined,
        imei2: productImei2.trim() || undefined,
        chassisNumber: productChassisNumber.trim() || undefined,
        engineNumber: productEngineNumber.trim() || undefined,
        registrationNumber: productRegistrationNumber.trim() || undefined,
        color: productColor.trim() || undefined,
        specsNote: productSpecsNote.trim() || undefined,
        value: Number(productValue),
        advance: reqAdv,
        downPaymentPaid: paidAdv,
        downPaymentDueDate: isPartialDownPayment && !isCleared ? downPaymentDueDate : undefined,
        downPaymentNotes: isPartialDownPayment ? downPaymentNotes.trim() || undefined : undefined,
        downPaymentCleared: isCleared,
        remaining: remainingBalance
      },
      plan: {
        numberOfInstallments,
        monthlyAmount,
        dueDay,
        startDate
      },
      payments: existingCustomer?.payments || [],
      createdAt: existingCustomer?.createdAt || new Date().toISOString(),
      status: existingCustomer?.status || "active",
      profileImage,
      promiseToPay: existingCustomer?.promiseToPay
    };

    onSave(savedCustomer);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <button
            id="form-btn-back"
            type="button"
            onClick={onCancel}
            className="p-2.5 hover:bg-slate-50 text-slate-500 rounded-xl transition-all border border-slate-100 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">
                {existingCustomer
                  ? "Edit Installment Sale"
                  : prefilledCustomer
                  ? "Register Additional Sale"
                  : "New Installment Registration"}
              </h2>
              <span className="bg-emerald-100 text-emerald-950 font-sans font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border-2 border-emerald-500 shadow-2xs whitespace-nowrap flex items-center gap-1.5">
                <span className="text-emerald-900 font-black text-[11px] uppercase tracking-wider">Account No:</span>
                <strong className="font-sans font-black text-slate-900 text-xs sm:text-sm tracking-wide">HST-A/C-{accountNumber || "1"}</strong>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {existingCustomer
                ? "Modify existing ledger profile & agreement"
                : prefilledCustomer
                ? `Registering new product sale for ${prefilledCustomer.fullName}`
                : "A unique Account Number will be assigned to this account upon saving"}
            </p>
          </div>
        </div>
      </div>

      {prefilledCustomer && !existingCustomer && (
        <div className="mb-6 p-4 bg-blue-50/90 border border-blue-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 shadow-2xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-blue-950">
                Registering New Sale for Existing Customer
              </h4>
              <p className="text-xs text-blue-800 mt-0.5">
                Customer: <strong className="text-blue-950">{prefilledCustomer.fullName}</strong> • CNIC: <span className="font-mono font-bold text-blue-900">{prefilledCustomer.cnic}</span> • Phone: <span className="font-mono text-blue-900">{prefilledCustomer.primaryPhone}</span>
              </p>
            </div>
          </div>
          <span className="bg-blue-800 text-white text-xs font-sans font-black px-3.5 py-1.5 rounded-xl border-2 border-blue-600 shrink-0 whitespace-nowrap shadow-2xs flex items-center gap-1.5">
            <span className="text-blue-200 font-black text-[11px] uppercase tracking-wider">Account No:</span>
            <strong className="font-sans font-black text-white text-xs sm:text-sm tracking-wide">HST-A/C-{accountNumber || "1"}</strong>
          </span>
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-red-800">Validation Errors Check</h4>
            <p className="text-xs text-red-600 mt-1">
              Please correct the flagged input fields marked in red below before continuing.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Customer Info */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-mono">1</span>
              Primary Customer Details
            </h3>

            {/* Profile Image Uploader */}
            <div className="flex items-center gap-3">
              {profileImage ? (
                <div className="relative group flex items-center gap-2.5 bg-slate-50 p-1.5 pr-3 rounded-2xl border border-slate-200/80">
                  <img src={profileImage} alt="Profile" className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm" />
                  <div className="text-left">
                    <span className="block text-[11px] font-bold text-slate-700">Photo Attached</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileImage(undefined)}
                    className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors ml-1"
                    title="Remove Photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3.5 py-2 bg-blue-50/80 hover:bg-blue-100/80 text-blue-700 rounded-xl text-xs font-bold cursor-pointer transition-all border border-blue-200/60 shadow-sm">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Upload Customer Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Serial / Ledger Account Number */}
            <div className="md:col-span-2 bg-emerald-50/60 p-4 border border-emerald-200/80 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-0.5">
                    Account No. <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-emerald-700">
                    The <strong className="font-black text-emerald-900">HST-A/C-</strong> prefix is fixed and read-only. Enter or edit the numeric portion (e.g. 1, 5, 10, 100).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center rounded-xl border bg-white overflow-hidden shadow-2xs ${
                    errors.accountNumber ? "border-red-400 bg-red-50" : "border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500"
                  }`}>
                    <span className="px-3 py-2 bg-emerald-100/90 text-emerald-950 text-sm font-sans font-black border-r border-emerald-300 select-none shrink-0 cursor-not-allowed" title="HST-A/C- prefix is fixed and read-only">
                      HST-A/C-
                    </span>
                    <input
                      id="input-account-number"
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/^HST-A\/C-|^HST-/i, "").replace(/[^0-9]/g, ""))}
                      placeholder="1"
                      className="px-3 py-2 text-sm font-sans font-black w-24 text-slate-900 bg-transparent outline-none"
                    />
                  </div>
                  <button
                    id="btn-auto-serial"
                    type="button"
                    onClick={() => setAccountNumber(getNumericSerial(getNextAvailableSerialNumber(allCustomers)))}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-xs flex items-center gap-1.5"
                    title="Calculate next available sequential account number"
                  >
                    Auto Account No.
                  </button>
                </div>
              </div>
              {errors.accountNumber && (
                <p className="text-xs font-bold text-red-600 mt-2 bg-red-50 p-2 rounded-lg border border-red-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errors.accountNumber}
                </p>
              )}
            </div>
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="input-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Muhammad Khurram"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:border-blue-500 ${
                  errors.fullName ? "border-red-300 bg-red-50/20" : "border-slate-200"
                }`}
              />
              {errors.fullName && <p className="text-[11px] text-red-500 mt-1">{errors.fullName}</p>}
            </div>

            {/* CNIC (National ID) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                CNIC Number (National ID) <span className="text-red-500">*</span>
              </label>
              <input
                id="input-cnic"
                type="text"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                placeholder="e.g. 37405-1234567-9"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:border-blue-500 ${
                  errors.cnic ? "border-red-300 bg-red-50/20" : "border-slate-200"
                }`}
              />
              {errors.cnic && <p className="text-[11px] text-red-500 mt-1">{errors.cnic}</p>}
            </div>

            {/* Primary Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Primary Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="input-primary-phone"
                type="tel"
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
                placeholder="e.g. +92 300 1234567"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:border-blue-500 ${
                  errors.primaryPhone ? "border-red-300 bg-red-50/20" : "border-slate-200"
                }`}
              />
              {errors.primaryPhone && <p className="text-[11px] text-red-500 mt-1">{errors.primaryPhone}</p>}
            </div>

            {/* Secondary Phone (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Secondary Phone (Optional)
              </label>
              <input
                id="input-secondary-phone"
                type="tel"
                value={secondaryPhone}
                onChange={(e) => setSecondaryPhone(e.target.value)}
                placeholder="e.g. +92 312 7654321"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Complete Address <span className="text-red-500">*</span>
              </label>
              <textarea
                id="input-address"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. House 45-B, Sector G-11, Islamabad, Pakistan"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:border-blue-500 ${
                  errors.address ? "border-red-300 bg-red-50/20" : "border-slate-200"
                }`}
              />
              {errors.address && <p className="text-[11px] text-red-500 mt-1">{errors.address}</p>}
            </div>
          </div>
        </div>

        {/* Step 2: Product and Deal Calculations */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-mono">2</span>
            Deal Pricing & Financial Terms
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dynamic Product Input with Dropdown options & Category Pills */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Product Type / Category <span className="text-red-500">*</span>
              </label>
              <input
                id="input-product-type"
                type="text"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                placeholder="Select pill below or type category (e.g. Motorcycle, Mobile Phone)..."
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:border-emerald-500 ${
                  errors.productType ? "border-red-300 bg-red-50/20" : "border-slate-200"
                }`}
                list="known-products"
              />
              <datalist id="known-products">
                {knownProductTypes.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>

              {/* Quick Category Selection Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase mr-0.5">Quick Select:</span>
                {[
                  { label: "🏍️ Bike / Motorcycle", value: "Motorcycle / Bike" },
                  { label: "📱 Mobile Phone", value: "Mobile Phone" },
                  { label: "📺 TV / AC / Fridge", value: "Electronics" },
                  { label: "💻 Laptop / PC", value: "Laptop / Computer" },
                  { label: "📦 Other Product", value: "General Product" },
                ].map((pill) => (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => {
                      setProductType(pill.value);
                      setShowAllSpecs(false);
                    }}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      productType.toLowerCase().includes(pill.value.toLowerCase().split(" ")[0])
                        ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {errors.productType && <p className="text-[11px] text-red-500 mt-1">{errors.productType}</p>}
            </div>

            {/* Product Value */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Product Retail Price ({currency}) <span className="text-red-500">*</span>
              </label>
              <input
                id="input-product-value"
                type="number"
                min="1"
                value={productValue}
                onChange={(e) => setProductValue(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 150000"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:border-emerald-500 ${
                  errors.productValue ? "border-red-300 bg-red-50/20" : "border-slate-200"
                }`}
              />
              {errors.productValue && <p className="text-[11px] text-red-500 mt-1">{errors.productValue}</p>}
            </div>

            {/* Advance Down Payment */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Advance/Down Payment ({currency}) <span className="text-red-500">*</span>
              </label>
              <input
                id="input-advance-payment"
                type="number"
                min="0"
                value={advancePayment}
                onChange={(e) => setAdvancePayment(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 30000"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:border-emerald-500 ${
                  errors.advancePayment ? "border-red-300 bg-red-50/20" : "border-slate-200"
                }`}
              />
              {errors.advancePayment && <p className="text-[11px] text-red-500 mt-1">{errors.advancePayment}</p>}
            </div>

            {/* Remaining Balance Auto box */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Auto-calculated Remaining Credit
              </label>
              <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 font-bold font-mono rounded-xl text-sm">
                {currency} {remainingBalance.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Remaining principal to be amortized</p>
            </div>

            {/* Partial Down Payment Section */}
            <div className="md:col-span-2 bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    id="checkbox-partial-downpayment"
                    type="checkbox"
                    checked={isPartialDownPayment}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsPartialDownPayment(checked);
                      if (!checked) {
                        setDownPaymentPaid(typeof advancePayment === "number" ? advancePayment : 0);
                      } else if (downPaymentPaid === "") {
                        setDownPaymentPaid(0);
                      }
                    }}
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="checkbox-partial-downpayment" className="text-xs font-bold text-amber-900 cursor-pointer">
                    Record Partial Down Payment? (Customer paying part of advance today, remaining balance scheduled later)
                  </label>
                </div>
              </div>

              {isPartialDownPayment && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Paid Today ({currency}) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="input-down-payment-paid"
                      type="number"
                      min="0"
                      max={typeof advancePayment === "number" ? advancePayment : undefined}
                      value={downPaymentPaid}
                      onChange={(e) => setDownPaymentPaid(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 5000"
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500 ${
                        errors.downPaymentPaid ? "border-red-400 bg-red-50" : "border-amber-300"
                      }`}
                    />
                    {errors.downPaymentPaid && <p className="text-[10px] text-red-500 mt-1">{errors.downPaymentPaid}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Remaining Down Payment ({currency})
                    </label>
                    <div className="px-3 py-2 bg-amber-100/60 border border-amber-300 rounded-xl text-xs font-bold font-mono text-amber-900">
                      {currency} {Math.max(0, (typeof advancePayment === "number" ? advancePayment : 0) - (typeof downPaymentPaid === "number" ? downPaymentPaid : 0)).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Agreed Payment Due Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="input-down-payment-due-date"
                      type="date"
                      value={downPaymentDueDate}
                      onChange={(e) => setDownPaymentDueDate(e.target.value)}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-amber-500 ${
                        errors.downPaymentDueDate ? "border-red-400 bg-red-50" : "border-amber-300"
                      }`}
                    />
                    {errors.downPaymentDueDate && <p className="text-[10px] text-red-500 mt-1">{errors.downPaymentDueDate}</p>}
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                      Partial Down Payment Notes / Commitment
                    </label>
                    <input
                      id="input-down-payment-notes"
                      type="text"
                      value={downPaymentNotes}
                      onChange={(e) => setDownPaymentNotes(e.target.value)}
                      placeholder="e.g. Paid Rs. 5,000 cash today, remaining 5,000 promised next Friday"
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-700 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Identification & Specifications Section */}
          {(() => {
            const isBikeMode = /bike|motorcycle|motor|vehicle|scooter|rickshaw|honda|yamaha|suzuki|70cc|125cc|150cc|چیسس|انجن|بائیک|گاڑی/i.test(productType);
            const isMobileMode = /mobile|phone|cell|iphone|samsung|smartphone|tablet|vivo|oppo|infinix|xiaomi|redmi|techno|realme|آئی ایم ای آئی/i.test(productType);
            const isElectronicsMode = /tv|ac|fridge|refrigerator|laptop|computer|pc|washing|appliance|solar|inverter|electronics|سیریل/i.test(productType);

            return (
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-3.5 mt-2 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>🛠️</span> Specifications & Technical Details (بیع کی مکمل تفصیلات)
                      </h4>
                      {/* Active category pill */}
                      {isBikeMode ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                          🏍️ Bike / Vehicle Mode
                        </span>
                      ) : isMobileMode ? (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                          📱 Mobile Phone Mode
                        </span>
                      ) : isElectronicsMode ? (
                        <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-purple-200 flex items-center gap-1">
                          📺 Electronics Mode
                        </span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          📦 General Product Mode
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isBikeMode
                        ? "Fields for Chassis, Engine, and Bike Registration number are enabled below."
                        : isMobileMode
                        ? "Fields for Model, IMEI 1, and IMEI 2 are enabled below."
                        : "Fill in static model specs and identifiers for customer receipts & ledger."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAllSpecs(!showAllSpecs)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      showAllSpecs
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {showAllSpecs ? "✓ All Spec Fields Active" : "+ Show All Spec Fields"}
                  </button>
                </div>

                {/* Smart Spec Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* STATIC FIELD 1: Model / Variant (Always Visible) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Model / Variant Name <span className="text-slate-400 font-normal">(ماڈل)</span>
                    </label>
                    <input
                      type="text"
                      value={productModel}
                      onChange={(e) => setProductModel(e.target.value)}
                      placeholder={isBikeMode ? "e.g. CG 125, CD 70, YBR 125" : isMobileMode ? "e.g. Galaxy A15, iPhone 15 Pro" : "e.g. 1.5 Ton T3 Inverter"}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* DYNAMIC BIKE / VEHICLE FIELDS (Brand, Year, Type, Chassis, Engine, Bike No) */}
                  {(isBikeMode || showAllSpecs) && (
                    <>
                      {/* Bike Brand */}
                      <div className="animate-fadeIn">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                            <span>🏷️</span> Bike Brand <span className="text-slate-500 font-normal">(برانڈ)</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsManageBrandsModalOpen(true)}
                            className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                          >
                            + Manage Brands
                          </button>
                        </div>
                        <select
                          value={availableBrands.includes(productBrand) ? productBrand : productBrand ? "Other" : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "Other") {
                              setProductBrand("Other");
                            } else {
                              setProductBrand(val);
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-amber-300 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-xs"
                        >
                          <option value="">Select Brand (Honda, Yamaha, etc.)...</option>
                          {availableBrands.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                          <option value="Other">Other / Custom Brand...</option>
                        </select>
                        {(productBrand === "Other" || (!availableBrands.includes(productBrand) && productBrand !== "")) && (
                          <input
                            type="text"
                            value={customBrandInput}
                            onChange={(e) => {
                              setCustomBrandInput(e.target.value);
                              setProductBrand(e.target.value);
                            }}
                            placeholder="Type custom brand name..."
                            className="mt-1.5 w-full px-3 py-1.5 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                          />
                        )}
                      </div>

                      {/* Bike Model / Year */}
                      <div className="animate-fadeIn">
                        <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center gap-1">
                          <span>📅</span> Bike Model / Year <span className="text-slate-500 font-normal">(ماڈل سال)</span>
                        </label>
                        <input
                          type="text"
                          value={productModelYear}
                          onChange={(e) => setProductModelYear(e.target.value)}
                          placeholder="e.g. 2005, 2010, 2022"
                          className="w-full px-3 py-2 bg-white border border-amber-300 focus:border-amber-500 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none shadow-xs"
                        />
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2018", "2015", "2010", "2005"].map((yr) => (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => setProductModelYear(yr)}
                              className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                                productModelYear === yr
                                  ? "bg-amber-600 text-white border-amber-600"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-amber-50"
                              }`}
                            >
                              {yr}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Bike Type */}
                      <div className="animate-fadeIn">
                        <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center gap-1">
                          <span>🏍️</span> Bike Type <span className="text-slate-500 font-normal">(قسم)</span>
                        </label>
                        <select
                          value={STATIC_BIKE_TYPES.includes(productBikeType) ? productBikeType : productBikeType ? "Other" : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "Other") {
                              setProductBikeType("Other");
                            } else {
                              setProductBikeType(val);
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-amber-300 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 outline-none shadow-xs"
                        >
                          <option value="">Select Type (Sports, Standard...)</option>
                          {STATIC_BIKE_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        {(productBikeType === "Other" || (!STATIC_BIKE_TYPES.includes(productBikeType) && productBikeType !== "")) && (
                          <input
                            type="text"
                            value={customBikeTypeInput}
                            onChange={(e) => {
                              setCustomBikeTypeInput(e.target.value);
                              setProductBikeType(e.target.value);
                            }}
                            placeholder="Type custom bike type..."
                            className="mt-1.5 w-full px-3 py-1.5 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                          />
                        )}
                      </div>

                      <div className="animate-fadeIn">
                        <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center gap-1">
                          <span>🔑</span> Chassis Number <span className="text-slate-500 font-normal">(چیسس نمبر)</span>
                        </label>
                        <input
                          type="text"
                          value={productChassisNumber}
                          onChange={(e) => setProductChassisNumber(e.target.value)}
                          placeholder="e.g. KHB-984210"
                          className="w-full px-3 py-2 bg-white border border-amber-300 focus:border-amber-500 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none shadow-xs"
                        />
                      </div>

                      <div className="animate-fadeIn">
                        <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center gap-1">
                          <span>⚙️</span> Engine Number <span className="text-slate-500 font-normal">(انجن نمبر)</span>
                        </label>
                        <input
                          type="text"
                          value={productEngineNumber}
                          onChange={(e) => setProductEngineNumber(e.target.value)}
                          placeholder="e.g. ENG-883419"
                          className="w-full px-3 py-2 bg-white border border-amber-300 focus:border-amber-500 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none shadow-xs"
                        />
                      </div>

                      <div className="animate-fadeIn">
                        <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center gap-1">
                          <span>🚲</span> Bike / Reg Number <span className="text-slate-500 font-normal">(گاڑی / بائیک نمبر)</span>
                        </label>
                        <input
                          type="text"
                          value={productRegistrationNumber}
                          onChange={(e) => setProductRegistrationNumber(e.target.value)}
                          placeholder="e.g. LEA-26-9012 or Applied For"
                          className="w-full px-3 py-2 bg-white border border-amber-300 focus:border-amber-500 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none shadow-xs"
                        />
                      </div>
                    </>
                  )}

                  {/* DYNAMIC MOBILE PHONE FIELDS (IMEI 1 & IMEI 2) */}
                  {(isMobileMode || showAllSpecs) && (
                    <>
                      <div className="animate-fadeIn">
                        <label className="block text-[11px] font-bold text-blue-900 mb-1 flex items-center gap-1">
                          <span>📱</span> IMEI 1 / Serial No <span className="text-slate-500 font-normal">(آئی ایم ای آئی 1)</span>
                        </label>
                        <input
                          type="text"
                          value={productSerialNumber}
                          onChange={(e) => setProductSerialNumber(e.target.value)}
                          placeholder="e.g. 358912345678901"
                          className="w-full px-3 py-2 bg-white border border-blue-300 focus:border-blue-500 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none shadow-xs"
                        />
                      </div>

                      <div className="animate-fadeIn">
                        <label className="block text-[11px] font-bold text-blue-900 mb-1 flex items-center gap-1">
                          <span>📲</span> IMEI 2 <span className="text-slate-500 font-normal">(آئی ایم ای آئی 2)</span>
                        </label>
                        <input
                          type="text"
                          value={productImei2}
                          onChange={(e) => setProductImei2(e.target.value)}
                          placeholder="e.g. 358912345678902"
                          className="w-full px-3 py-2 bg-white border border-blue-300 focus:border-blue-500 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none shadow-xs"
                        />
                      </div>
                    </>
                  )}

                  {/* DYNAMIC ELECTRONICS / GENERAL SERIAL NUMBER FIELD */}
                  {(isElectronicsMode || (!isBikeMode && !isMobileMode && !isElectronicsMode) || showAllSpecs) && !isMobileMode && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <span>🔢</span> Serial Number / Product S/N <span className="text-slate-400 font-normal">(سیریل نمبر)</span>
                      </label>
                      <input
                        type="text"
                        value={productSerialNumber}
                        onChange={(e) => setProductSerialNumber(e.target.value)}
                        placeholder="e.g. SN-98124012"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}

                  {/* STATIC FIELD 2: Color / Finish (Always Visible) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Color / Finish <span className="text-slate-400 font-normal">(رنگ)</span>
                    </label>
                    <input
                      type="text"
                      value={productColor}
                      onChange={(e) => setProductColor(e.target.value)}
                      placeholder="e.g. Red, Black, Metallic Gray"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* STATIC FIELD 3: Warranty / Extra Spec Notes (Always Visible) */}
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Warranty & Extra Specifications Notes <span className="text-slate-400 font-normal">(اضافی تفصیلات / وارنٹی)</span>
                    </label>
                    <input
                      type="text"
                      value={productSpecsNote}
                      onChange={(e) => setProductSpecsNote(e.target.value)}
                      placeholder="e.g. 1 Year Official Brand Warranty, Dual SIM, 256GB Storage"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Step 3: Installment Plan */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono">3</span>
            Installment Plan Setup
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Installment Term Months */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Duration (Months)
              </label>
              <input
                id="input-installments-months"
                type="number"
                min="1"
                max="120"
                value={numberOfInstallments}
                onChange={(e) => setNumberOfInstallments(Math.max(1, Number(e.target.value)))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono text-center focus:border-indigo-500 outline-none"
              />
            </div>

            {/* Monthly Installment Amount */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Monthly Amount
              </label>
              <div className="w-full px-4 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-800 font-bold font-mono rounded-xl text-sm text-center">
                {currency} {monthlyAmount.toLocaleString()}
              </div>
            </div>

            {/* Monthly Due Day */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Due Day of Month
              </label>
              <select
                id="select-due-day"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono text-center focus:border-indigo-500 outline-none cursor-pointer"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                    {day === 1
                      ? "st"
                      : day === 2
                      ? "nd"
                      : day === 3
                      ? "rd"
                      : "th"}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Plan Start Date
              </label>
              <input
                id="input-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Step 4: References */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-mono">4</span>
              Customer References ({references.length})
            </h3>
            <button
              id="form-btn-add-reference"
              type="button"
              onClick={addReference}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Reference
            </button>
          </div>

          {references.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-slate-200 rounded-2xl">
              <p className="text-sm font-semibold text-slate-600">No references added yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Adding at least one reference is highly recommended for security.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {references.map((ref, idx) => (
                <div
                  key={ref.id}
                  className="bg-slate-50 border border-slate-100 p-5 rounded-2xl relative space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/50 pb-2.5">
                    <span className="text-xs font-bold text-slate-500">Reference #{idx + 1}</span>
                    {references.length > 1 && (
                      <button
                        id={`form-btn-remove-ref-${ref.id}`}
                        type="button"
                        onClick={() => removeReference(ref.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Reference"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Ref Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`input-ref-name-${ref.id}`}
                        type="text"
                        value={ref.name}
                        onChange={(e) => updateReference(ref.id, "name", e.target.value)}
                        placeholder="e.g. Imran Khan"
                        className={`w-full px-3.5 py-2 border rounded-xl text-sm focus:border-slate-400 outline-none ${
                          errors[`ref_${ref.id}_name`] ? "border-red-300 bg-red-50/10" : "border-slate-200 bg-white"
                        }`}
                      />
                      {errors[`ref_${ref.id}_name`] && (
                        <p className="text-[10px] text-red-500 mt-1">{errors[`ref_${ref.id}_name`]}</p>
                      )}
                    </div>

                    {/* Ref Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`input-ref-phone-${ref.id}`}
                        type="tel"
                        value={ref.phone}
                        onChange={(e) => updateReference(ref.id, "phone", e.target.value)}
                        placeholder="e.g. +92 321 9876543"
                        className={`w-full px-3.5 py-2 border rounded-xl text-sm focus:border-slate-400 outline-none ${
                          errors[`ref_${ref.id}_phone`] ? "border-red-300 bg-red-50/10" : "border-slate-200 bg-white"
                        }`}
                      />
                      {errors[`ref_${ref.id}_phone`] && (
                        <p className="text-[10px] text-red-500 mt-1">{errors[`ref_${ref.id}_phone`]}</p>
                      )}
                    </div>

                    {/* Ref CNIC */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        CNIC (National ID)
                      </label>
                      <input
                        id={`input-ref-cnic-${ref.id}`}
                        type="text"
                        value={ref.cnic}
                        onChange={(e) => updateReference(ref.id, "cnic", e.target.value)}
                        placeholder="e.g. 37405-2222222-2"
                        className="w-full px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:border-slate-400 outline-none"
                      />
                    </div>

                    {/* Ref Address */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Home Address
                      </label>
                      <input
                        id={`input-ref-address-${ref.id}`}
                        type="text"
                        value={ref.address}
                        onChange={(e) => updateReference(ref.id, "address", e.target.value)}
                        placeholder="e.g. Street 3, G-9/1, Islamabad"
                        className="w-full px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:border-slate-400 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end items-center gap-3 border-t border-slate-100 pt-6">
          <button
            id="form-btn-cancel"
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            id="form-btn-save"
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-lg shadow-blue-500/10 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Save Ledger Account
          </button>
        </div>
      </form>

      {/* Manage Bike Brands Modal */}
      {isManageBrandsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-150">
            <button
              type="button"
              onClick={() => setIsManageBrandsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>🏷️</span> Manage Bike Brands
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Add custom bike brands to your selection list or delete custom ones.
            </p>

            {/* Add New Brand Form */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="e.g. Benelli, Keeway, Zongshen"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (newBrandName.trim()) {
                    const updated = addCustomBikeBrand(newBrandName.trim());
                    setAvailableBrands(updated);
                    setProductBrand(newBrandName.trim());
                    setNewBrandName("");
                  }
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs whitespace-nowrap"
              >
                + Add Brand
              </button>
            </div>

            {/* List of Custom Brands */}
            <div className="mt-4 space-y-2 max-h-52 overflow-y-auto pr-1">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Custom Added Brands</h4>
              {getStoredCustomBrands().length === 0 ? (
                <p className="text-xs text-slate-400 italic">No custom brands added yet.</p>
              ) : (
                getStoredCustomBrands().map((b) => (
                  <div key={b} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-800">
                    <span>{b}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = deleteCustomBikeBrand(b);
                        setAvailableBrands(updated);
                        if (productBrand === b) setProductBrand("");
                      }}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
                      title="Delete brand"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}

              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-2 border-t border-slate-100">Default System Brands</h4>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_BIKE_BRANDS.map((db) => (
                  <span key={db} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-lg border border-slate-200">
                    {db}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageBrandsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
