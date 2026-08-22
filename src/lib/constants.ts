export const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const EXPIRY_OPTIONS = [
  { label: "1 Day", value: 1 * 24 * 60 * 60 },
  { label: "7 Days", value: 7 * 24 * 60 * 60 },
  { label: "30 Days", value: 30 * 24 * 60 * 60 },
  { label: "Never", value: 0 },
] as const;

export type ExpiryValue = (typeof EXPIRY_OPTIONS)[number]["value"];
