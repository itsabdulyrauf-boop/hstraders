/**
 * Utility functions and constants for Bike Brands & Bike Types management
 */

export const DEFAULT_BIKE_BRANDS = [
  "Honda",
  "Yamaha",
  "Suzuki",
  "Road Prince",
  "Unique",
  "Super Power",
  "United",
  "Crown",
  "Hi-Speed",
  "Super Star",
  "Metro",
  "Kawasaki",
  "BMW",
  "Harley-Davidson",
  "KTM",
  "TVS",
  "Bajaj",
  "Pak Hero"
];

export const STATIC_BIKE_TYPES = [
  "Standard Bike",
  "Sports Bike",
  "Cruiser",
  "Scooter",
  "Off-Road / Dirt Bike",
  "Touring / Adventure",
  "Electric Bike / E-Bike",
  "Underbone / Moped",
  "Cargo / Utility / Rickshaw",
  "Other"
];

const CUSTOM_BRANDS_STORAGE_KEY = "hisabkitab_custom_bike_brands";

export function getStoredCustomBrands(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_BRANDS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load custom brands", e);
    return [];
  }
}

export function getAllBikeBrands(): string[] {
  const custom = getStoredCustomBrands();
  const combined = [...DEFAULT_BIKE_BRANDS];
  custom.forEach((c) => {
    if (!combined.some((b) => b.toLowerCase() === c.toLowerCase())) {
      combined.push(c);
    }
  });
  return combined;
}

export function addCustomBikeBrand(brandName: string): string[] {
  const trimmed = brandName.trim();
  if (!trimmed) return getAllBikeBrands();
  const current = getStoredCustomBrands();
  const all = getAllBikeBrands();

  if (!all.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
    const updatedCustom = [...current, trimmed];
    try {
      localStorage.setItem(CUSTOM_BRANDS_STORAGE_KEY, JSON.stringify(updatedCustom));
    } catch (e) {
      console.error("Failed to save custom brand", e);
    }
  }
  return getAllBikeBrands();
}

export function deleteCustomBikeBrand(brandName: string): string[] {
  const current = getStoredCustomBrands();
  const filtered = current.filter((b) => b.toLowerCase() !== brandName.toLowerCase());
  try {
    localStorage.setItem(CUSTOM_BRANDS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to delete custom brand", e);
  }
  return getAllBikeBrands();
}
