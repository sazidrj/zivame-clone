// src/utils/index.ts

/** Format price in Indian currency style: ₹1,23,456 */
export const formatPrice = (amount: number): string =>
  `₹${amount.toLocaleString("en-IN")}`;

/** Calculate discount percentage */
export const calcDiscount = (price: number, mrp: number): number =>
  mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

/** Validate Indian mobile number (10 digits, starts 6-9) */
export const isValidPhone = (phone: string): boolean =>
  /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""));

/** Validate email address */
export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Format phone number for display: +91 98765 43210 */
export const formatPhone = (phone: string): string => {
  const clean = phone.replace(/\D/g, "").slice(-10);
  return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
};

/** Truncate text with ellipsis */
export const truncate = (text: string, maxLen: number): string =>
  text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;

/** Time ago string: "2 hours ago", "3 days ago" */
export const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN");
};

/** Clamp a number between min and max */
export const clamp = (val: number, min: number, max: number): number =>
  Math.min(Math.max(val, min), max);

/** Slugify a string */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Build URL search params from object, omitting undefined/null/empty */
export const buildParams = (obj: Record<string, any>): URLSearchParams => {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  return params;
};

/** Group array by key */
export const groupBy = <T>(arr: T[], key: keyof T): Record<string, T[]> =>
  arr.reduce((acc, item) => {
    const k = String(item[key]);
    acc[k] = acc[k] ? [...acc[k], item] : [item];
    return acc;
  }, {} as Record<string, T[]>);

/** Debounce a function */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timer: NodeJS.Timeout;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
