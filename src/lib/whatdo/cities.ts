export const CITY_NORMALIZATIONS: Record<string, string> = {
  bengaluru: "Bangalore",
  "bengaluru ": "Bangalore",
  banglore: "Bangalore",
  bangloor: "Bangalore",
  blore: "Bangalore",
  blr: "Bangalore",
  mumbai: "Mumbai",
  bombay: "Mumbai",
  delhi: "Delhi",
  "new delhi": "Delhi",
  "delhi ncr": "Delhi",
  ncr: "Delhi",
  gurgaon: "Delhi",
  gurugram: "Delhi",
  noida: "Delhi",
  faridabad: "Delhi",
  ghaziabad: "Delhi",
  pune: "Pune",
  poona: "Pune",
  hyderabad: "Hyderabad",
  hyd: "Hyderabad",
  "secunderabad ": "Hyderabad",
  secunderabad: "Hyderabad",
  chennai: "Chennai",
  madras: "Chennai",
  kolkata: "Kolkata",
  calcutta: "Kolkata",
  ahmedabad: "Ahmedabad",
  "ahemdabad ": "Ahmedabad",
  surat: "Surat",
  jaipur: "Jaipur",
  lucknow: "Lucknow",
  chandigarh: "Chandigarh",
  mohali: "Chandigarh",
  panchkula: "Chandigarh",
  "navi mumbai": "Mumbai",
  thane: "Mumbai",
};

export function normalizeCityName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  if (!clean) return null;
  if (CITY_NORMALIZATIONS[clean]) return CITY_NORMALIZATIONS[clean]!;
  const rawClean = String(raw).trim().replace(/\s+/g, " ");
  // Title-case it if not in the map: "ahmedabad" → "Ahmedabad"
  return rawClean.replace(/\b\w/g, (c) => c.toUpperCase());
}
