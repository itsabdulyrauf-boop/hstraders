/**
 * Firebase Client SDK Initialization & Firestore Data Handlers
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { 
  initializeFirestore,
  getFirestore, 
  setLogLevel,
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  getDoc 
} from "firebase/firestore";
import { Customer, Expense } from "../types";

// Firebase configuration from environment variables or sh-traders project defaults
const env = (import.meta as any).env || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyAfuyjNnW8t2lj_K41ZVLFyyuMKp-oiBNM",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "hs-traders-7ca2b.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "hs-traders-7ca2b",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "hs-traders-7ca2b.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "470545805653",
  appId: env.VITE_FIREBASE_APP_ID || "1:470545805653:web:0b525bad6c9526ed2fffdc",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-CZRW8VB38F"
};

// Check if all essential Firebase keys are configured
export const isFirebaseConfigured = (): boolean => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
};

export const getFirebaseProjectId = (): string => {
  return firebaseConfig.projectId || "hs-traders-7ca2b";
};

// Lazy initialization of Firebase Client SDK & Analytics
let dbInstance: any = null;
let analyticsInstance: any = null;

// Helper to strip any undefined properties to avoid Firestore sync errors
const cleanForFirestore = (data: any): any => {
  if (data === null || data === undefined) return null;
  return JSON.parse(JSON.stringify(data));
};

export const getFirestoreDb = () => {
  if (!isFirebaseConfigured()) {
    return null;
  }
  if (!dbInstance) {
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      
      // Suppress benign connection retry logs in sandbox preview
      try {
        setLogLevel("error");
      } catch (e) {}

      // Initialize Firestore with ignoreUndefinedProperties to avoid errors when saving optional fields
      try {
        dbInstance = initializeFirestore(app, {
          ignoreUndefinedProperties: true,
          experimentalForceLongPolling: true,
          useFetchStreams: false,
        } as any);
      } catch (err) {
        // If already initialized or unsupported, fall back to getFirestore
        dbInstance = getFirestore(app);
      }
      
      // Initialize analytics safely if supported in current browser environment
      if (typeof window !== "undefined") {
        isAnalyticsSupported().then((supported) => {
          if (supported && !analyticsInstance) {
            analyticsInstance = getAnalytics(app);
          }
        }).catch(() => {
          // Ignore analytics initialization errors in sandbox/iframe
        });
      }
    } catch (error) {
      console.warn("Failed to initialize Firebase Client SDK:", error);
      return null;
    }
  }
  return dbInstance;
};

/**
 * Fetch all customers from Firebase Firestore
 */
export async function fetchCustomersFromFirebase(): Promise<Customer[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const querySnapshot = await getDocs(collection(db, "customers"));
    const customersList: Customer[] = [];
    querySnapshot.forEach((docSnap) => {
      customersList.push(docSnap.data() as Customer);
    });
    // Sort by createdAt descending
    return customersList.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.warn("Could not fetch customers from Firestore (using local offline storage):", error);
    return [];
  }
}

/**
 * Save / Update a customer document in Firebase Firestore
 */
export async function saveCustomerToFirebase(customer: Customer): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const docRef = doc(db, "customers", customer.id);
    const cleanCustomer = cleanForFirestore(customer);
    await setDoc(docRef, cleanCustomer);
  } catch (error) {
    console.warn(`Could not save customer ${customer.id} to Firestore (saved locally):`, error);
  }
}

/**
 * Delete a customer document from Firebase Firestore
 */
export async function deleteCustomerFromFirebase(customerId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const docRef = doc(db, "customers", customerId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`Could not delete customer ${customerId} from Firestore (removed locally):`, error);
  }
}

/**
 * Fetch product preset catalog list from Firebase Firestore
 */
export async function fetchCatalogFromFirebase(): Promise<string[] | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const docRef = doc(db, "catalog", "presets");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.items || null;
    }
    return null;
  } catch (error) {
    console.warn("Could not fetch catalog from Firestore (using local offline catalog):", error);
    return null;
  }
}

/**
 * Save / Update product preset catalog in Firebase Firestore
 */
export async function saveCatalogToFirebase(items: string[]): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const docRef = doc(db, "catalog", "presets");
    await setDoc(docRef, cleanForFirestore({ items }));
  } catch (error) {
    console.warn("Could not save catalog to Firestore (saved locally):", error);
  }
}

export interface AdminCredentials {
  email: string;
  password: string;
}

export const DEFAULT_ADMIN_CREDENTIALS: AdminCredentials = {
  email: "hstraders@gmail.com",
  password: "hstrader12345"
};

/**
 * Fetch Admin Credentials from Firebase Firestore
 */
export async function fetchAdminCredentialsFromFirebase(): Promise<AdminCredentials> {
  const db = getFirestoreDb();
  if (!db) return DEFAULT_ADMIN_CREDENTIALS;

  try {
    const docRef = doc(db, "settings", "admin_auth");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      let email = data.email || DEFAULT_ADMIN_CREDENTIALS.email;
      let password = data.password || DEFAULT_ADMIN_CREDENTIALS.password;
      if (email === "shtraders@gmail.com" || email === "sh-traders@gmail.com") {
        email = "hstraders@gmail.com";
        if (password === "shtrader12345") {
          password = "hstrader12345";
        }
        try {
          await setDoc(docRef, { email, password, updatedAt: new Date().toISOString() });
        } catch (e) {
          // Ignore error if offline
        }
      }
      return { email, password };
    } else {
      // Initialize default credentials in Firestore if not present
      await setDoc(docRef, {
        ...DEFAULT_ADMIN_CREDENTIALS,
        updatedAt: new Date().toISOString()
      });
      return DEFAULT_ADMIN_CREDENTIALS;
    }
  } catch (error) {
    console.warn("Could not fetch admin credentials from Firestore (using default/local):", error);
    return DEFAULT_ADMIN_CREDENTIALS;
  }
}

/**
 * Save Admin Credentials to Firebase Firestore
 */
export async function saveAdminCredentialsToFirebase(creds: AdminCredentials): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const docRef = doc(db, "settings", "admin_auth");
    await setDoc(docRef, {
      email: creds.email,
      password: creds.password,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.warn("Could not save admin credentials to Firestore:", error);
    return false;
  }
}

/**
 * Fetch Expenses from Firebase Firestore
 */
export async function fetchExpensesFromFirebase(): Promise<Expense[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const querySnapshot = await getDocs(collection(db, "expenses"));
    const list: Expense[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Expense);
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.warn("Could not fetch expenses from Firestore:", error);
    return [];
  }
}

/**
 * Save single Expense to Firebase Firestore
 */
export async function saveExpenseToFirebase(expense: Expense): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const docRef = doc(db, "expenses", expense.id);
    await setDoc(docRef, cleanForFirestore(expense));
  } catch (error) {
    console.warn(`Could not save expense ${expense.id} to Firestore:`, error);
  }
}

/**
 * Save array of Expenses to Firebase Firestore
 */
export async function saveExpensesToFirebase(expenses: Expense[]): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    for (const exp of expenses) {
      const docRef = doc(db, "expenses", exp.id);
      await setDoc(docRef, cleanForFirestore(exp));
    }
  } catch (error) {
    console.warn("Could not batch save expenses to Firestore:", error);
  }
}

/**
 * Delete Expense from Firebase Firestore
 */
export async function deleteExpenseFromFirebase(expenseId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const docRef = doc(db, "expenses", expenseId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`Could not delete expense ${expenseId} from Firestore:`, error);
  }
}

/**
 * Full Database Import/Restore Handler for Firebase Firestore.
 * Replaces/restores all customer profiles, product catalog items, and expenses
 * in Firestore to mirror an imported database JSON backup.
 */
export async function replaceFullDatabaseInFirebase(
  customers: Customer[],
  catalog: string[],
  expenses: Expense[]
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  // 1. Remove remote customer documents in Firestore that are not in the restored dataset
  try {
    const existingCustSnap = await getDocs(collection(db, "customers"));
    const restoredCustIds = new Set(customers.map((c) => c.id));
    for (const docSnap of existingCustSnap.docs) {
      if (!restoredCustIds.has(docSnap.id)) {
        await deleteDoc(doc(db, "customers", docSnap.id)).catch(() => {});
      }
    }
  } catch (error) {
    console.warn("Could not query existing Firestore customers during restore:", error);
  }

  // 2. Save all restored customer documents to Firestore
  for (const cust of customers) {
    try {
      await saveCustomerToFirebase(cust);
    } catch (error) {
      console.warn(`Failed saving customer ${cust.id} to Firestore during restore:`, error);
    }
  }

  // 3. Save restored product catalog presets to Firestore
  try {
    await saveCatalogToFirebase(catalog);
  } catch (error) {
    console.warn("Failed saving catalog to Firestore during restore:", error);
  }

  // 4. Remove remote expenses in Firestore that are not in restored dataset and save restored ones
  try {
    const existingExpSnap = await getDocs(collection(db, "expenses"));
    const restoredExpIds = new Set(expenses.map((e) => e.id));
    for (const docSnap of existingExpSnap.docs) {
      if (!restoredExpIds.has(docSnap.id)) {
        await deleteDoc(doc(db, "expenses", docSnap.id)).catch(() => {});
      }
    }
  } catch (error) {
    console.warn("Could not query existing Firestore expenses during restore:", error);
  }

  for (const exp of expenses) {
    try {
      await saveExpenseToFirebase(exp);
    } catch (error) {
      console.warn(`Failed saving expense ${exp.id} to Firestore during restore:`, error);
    }
  }
}

