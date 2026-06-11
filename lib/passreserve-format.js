import crypto from "node:crypto";

const currencyFormatters = new Map();
const dateFormatters = new Map();
const dateTimeFormatters = new Map();
const timeFormatters = new Map();

function resolveIntlLocale(locale = "en-GB") {
  const normalized = String(locale || "en-GB").trim().toLowerCase();

  if (normalized === "it" || normalized === "it-it") {
    return "it-IT";
  }

  if (normalized === "en" || normalized === "en-gb" || normalized === "en-us") {
    return normalized === "en-us" ? "en-US" : "en-GB";
  }

  return "en-GB";
}

function getCurrencyFormatter(currency = "EUR", locale = "en-US") {
  const safeCurrency = String(currency || "EUR").toUpperCase();
  const safeLocale = resolveIntlLocale(locale);
  const cacheKey = `${safeCurrency}::${safeLocale}`;

  if (!currencyFormatters.has(cacheKey)) {
    currencyFormatters.set(
      cacheKey,
      new Intl.NumberFormat(safeLocale === "it-IT" ? "it-IT" : "en-US", {
        style: "currency",
        currency: safeCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })
    );
  }

  return currencyFormatters.get(cacheKey);
}

function getDateFormatter(timeZone = "Europe/Rome", locale = "en-GB") {
  const safeLocale = resolveIntlLocale(locale);
  const cacheKey = `${timeZone}::${safeLocale}`;

  if (!dateFormatters.has(cacheKey)) {
    dateFormatters.set(
      cacheKey,
      new Intl.DateTimeFormat(safeLocale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone
      })
    );
  }

  return dateFormatters.get(cacheKey);
}

function getDateTimeFormatter(timeZone = "Europe/Rome", locale = "en-GB") {
  const safeLocale = resolveIntlLocale(locale);
  const cacheKey = `${timeZone}::${safeLocale}`;

  if (!dateTimeFormatters.has(cacheKey)) {
    dateTimeFormatters.set(
      cacheKey,
      new Intl.DateTimeFormat(safeLocale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone
      })
    );
  }

  return dateTimeFormatters.get(cacheKey);
}

function getTimeFormatter(timeZone = "Europe/Rome", locale = "en-GB") {
  const safeLocale = resolveIntlLocale(locale);
  const cacheKey = `${timeZone}::${safeLocale}`;

  if (!timeFormatters.has(cacheKey)) {
    timeFormatters.set(
      cacheKey,
      new Intl.DateTimeFormat(safeLocale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone
      })
    );
  }

  return timeFormatters.get(cacheKey);
}

export function formatCurrencyFromCents(cents, currency = "EUR", locale = "en-US") {
  return getCurrencyFormatter(currency, locale).format((Number(cents) || 0) / 100);
}

export function formatCurrency(amount, currency = "EUR", locale = "en-US") {
  return getCurrencyFormatter(currency, locale).format(Number(amount) || 0);
}

export function formatDateLabel(value, timeZone = "Europe/Rome", locale = "en-GB") {
  return getDateFormatter(timeZone, locale).format(new Date(value));
}

export function formatDateTimeLabel(value, timeZone = "Europe/Rome", locale = "en-GB") {
  return getDateTimeFormatter(timeZone, locale).format(new Date(value));
}

export function formatTimeLabel(value, timeZone = "Europe/Rome", locale = "en-GB") {
  return getTimeFormatter(timeZone, locale).format(new Date(value));
}

export function formatOccurrenceTimeRange(
  startsAt,
  endsAt,
  timeZone = "Europe/Rome",
  locale = "en-GB"
) {
  const separator = resolveIntlLocale(locale) === "it-IT" ? "alle" : "to";

  return `${formatTimeLabel(startsAt, timeZone, locale)} ${separator} ${formatTimeLabel(endsAt, timeZone, locale)}`;
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function parseDurationMinutes(value) {
  const text = String(value || "").trim();
  const hoursMatch = text.match(/(\d+)\s*h/i);
  const minutesMatch = text.match(/(\d+)\s*m/i);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;

  return Math.max(30, hours * 60 + minutes || 180);
}

export function parseCapacityValue(value) {
  const match = String(value || "").match(/(\d+)/);

  return match ? Number(match[1]) : 12;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function createRegistrationCode() {
  return `PR-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeText(value) {
  return String(value || "").trim();
}

export function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function isoNow() {
  return new Date().toISOString();
}

export function addMinutes(value, minutes) {
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString();
}

export function addHours(value, hours) {
  return addMinutes(value, hours * 60);
}

export function asIso(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}
