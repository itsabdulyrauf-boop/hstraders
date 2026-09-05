import { Customer } from "../types";

/**
 * Parses the numeric integer part from a serial string.
 * Examples: "HST-A/C-1" -> 1, "HST-1" -> 1, "HST-007" -> 7, "7" -> 7, "SHT-12" -> 12
 */
export function parseSerialNumberInteger(serialStr: string): number | null {
  if (!serialStr) return null;
  const clean = serialStr
    .trim()
    .toUpperCase()
    .replace(/^HST-A\/C-|^SHT-A\/C-|^SHT-|^HST-|^A\/C-/, "");
  if (/^\d+$/.test(clean)) {
    const val = parseInt(clean, 10);
    return isNaN(val) ? null : val;
  }
  // Match last numeric chunk if formatted like HST-A/C-2026-4819
  const match = clean.match(/(\d+)$/);
  if (match) {
    const val = parseInt(match[1], 10);
    return isNaN(val) ? null : val;
  }
  return null;
}

/**
 * Normalizes a serial number string into standard "HST-A/C-{N}" format.
 * Examples: "7" -> "HST-A/C-7", "hst-07" -> "HST-A/C-7", "HST-12" -> "HST-A/C-12", "HST-A/C-1" -> "HST-A/C-1"
 */
export function normalizeSerialNumber(serialStr: string): string {
  if (!serialStr || !serialStr.trim()) return "HST-A/C-1";
  const num = parseSerialNumberInteger(serialStr);
  if (num !== null && num > 0) {
    return `HST-A/C-${num}`;
  }
  const clean = serialStr
    .trim()
    .toUpperCase()
    .replace(/^SHT-A\/C-|^SHT-|^HST-A\/C-|^HST-|^A\/C-/, "");
  if (clean.startsWith("HST-A/C-")) {
    return clean;
  }
  return `HST-A/C-${clean}`;
}

/**
 * Helper to get a clean, unique serial number / account number for any customer ledger.
 * Format example: "HST-A/C-1", "HST-A/C-2", "HST-A/C-100"
 */
export function getLedgerSerialNumber(customer: Partial<Customer> & { id: string }): string {
  if (customer.accountNumber && customer.accountNumber.trim()) {
    return normalizeSerialNumber(customer.accountNumber);
  }
  if (customer.id && (customer.id.includes("HST") || customer.id.includes("SHT"))) {
    return normalizeSerialNumber(customer.id);
  }
  const cleanId = (customer.id || "").replace(/^cust_/, "").replace(/^demo_/, "");
  if (/^\d+$/.test(cleanId)) {
    const num = parseInt(cleanId, 10);
    if (!isNaN(num)) {
      return `HST-A/C-${num}`;
    }
  }
  return `HST-A/C-${cleanId.toUpperCase() || "1"}`;
}

/**
 * Sorts an array of customer objects in ascending numerical order of their serial numbers
 * (HST-A/C-1, HST-A/C-2, HST-A/C-3 ... HST-A/C-10).
 */
export function sortCustomersBySerialNumber<T extends Partial<Customer> & { id: string }>(customers: T[]): T[] {
  return [...customers].sort((a, b) => {
    const serialA = getLedgerSerialNumber(a);
    const serialB = getLedgerSerialNumber(b);
    const numA = parseSerialNumberInteger(serialA);
    const numB = parseSerialNumberInteger(serialB);

    if (numA !== null && numB !== null) {
      if (numA !== numB) return numA - numB;
    } else if (numA !== null) {
      return -1;
    } else if (numB !== null) {
      return 1;
    }

    return serialA.localeCompare(serialB, undefined, { numeric: true, sensitivity: "base" });
  });
}

/**
 * Calculates the next available dynamic sequential serial number (HST-A/C-1, HST-A/C-2...).
 */
export function getNextAvailableSerialNumber(customers: Customer[] = []): string {
  let maxNum = 0;
  for (const c of customers) {
    const serial = getLedgerSerialNumber(c);
    const num = parseSerialNumberInteger(serial);
    if (num !== null && num > maxNum) {
      maxNum = num;
    }
  }
  return `HST-A/C-${maxNum + 1}`;
}

/**
 * Checks if a serial number is unique among existing customers.
 */
export function isSerialNumberUnique(
  candidateSerial: string,
  customers: Customer[] = [],
  excludeCustomerId?: string
): boolean {
  const normalizedCandidate = normalizeSerialNumber(candidateSerial);
  return !customers.some((c) => {
    if (excludeCustomerId && c.id === excludeCustomerId) return false;
    const existingSerial = getLedgerSerialNumber(c);
    return normalizeSerialNumber(existingSerial) === normalizedCandidate;
  });
}

/**
 * Legacy generator fallback (returns next available sequence)
 */
export function generateNewLedgerSerialNumber(customers: Customer[] = []): string {
  return getNextAvailableSerialNumber(customers);
}

/**
 * Conflict resolution for offline sync or DB import:
 * Ensures all customers have unique serial numbers. If conflicts are found,
 * automatically reassigns the next available serial number (e.g. HST-A/C-X)
 * so offline sync completes seamlessly without failing.
 */
export function resolveDuplicateSerialNumbers(customers: Customer[] = []): Customer[] {
  const usedSerials = new Set<string>();
  let currentMax = 0;

  // First pass: identify max numeric serial among non-conflicting valid customers
  for (const c of customers) {
    const serial = getLedgerSerialNumber(c);
    const num = parseSerialNumberInteger(serial);
    if (num !== null && num > currentMax) {
      currentMax = num;
    }
  }

  // Second pass: assign unique serial numbers
  return customers.map((c) => {
    let serial = getLedgerSerialNumber(c);
    let normalized = normalizeSerialNumber(serial);

    if (usedSerials.has(normalized)) {
      // Conflict detected! Automatically assign next available unique serial number
      currentMax += 1;
      serial = `HST-A/C-${currentMax}`;
      normalized = normalizeSerialNumber(serial);
    }

    usedSerials.add(normalized);
    return {
      ...c,
      accountNumber: serial
    };
  });
}

