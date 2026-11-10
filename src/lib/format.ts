import type { PublicModel } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function copy(model: PublicModel, key: string): string {
  const value = model.copy[key];
  if (typeof value !== "string")
    throw new TypeError(`Missing content string: ${key}`);
  return value;
}

export function nestedCopy(
  model: PublicModel,
  section: string,
  key: string,
): string {
  const values = model.copy[section];
  if (!isRecord(values) || !Object.hasOwn(values, key)) {
    throw new TypeError(`Missing content string: ${section}.${key}`);
  }
  const value = values[key];
  if (typeof value !== "string")
    throw new TypeError(`Invalid content string: ${section}.${key}`);
  return value;
}

export function formatMoney(model: PublicModel, cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absoluteCents = Math.abs(cents);
  const whole = Math.floor(absoluteCents / 100);
  const fraction = String(absoluteCents % 100).padStart(2, "0");
  return `${sign}${new Intl.NumberFormat(model.app.locale, {
    style: "currency",
    currency: model.app.currency,
    maximumFractionDigits: 0,
  }).format(whole)}.${fraction}`;
}

export function formatDate(model: PublicModel, value: string): string {
  return new Intl.DateTimeFormat(model.app.locale, {
    month: "short",
    day: "numeric",
    timeZone: model.app.timezone,
  }).format(new Date(value));
}

export function formatPercent(model: PublicModel, value: number): string {
  return `${new Intl.NumberFormat(model.app.locale, { maximumFractionDigits: 1 }).format(value)}%`;
}
