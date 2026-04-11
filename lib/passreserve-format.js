import crypto from "node:crypto";

const currencyFormatters = new Map();
const dateFormatters = new Map();
const dateTimeFormatters = new Map();
const timeFormatters = new Map();

function getCurrencyFormatter(currency = "EUR") {
  const safeCurrency = String(currency || "EUR").toUpperCase();

  if (!currencyFormatters.has(safeCurrency)) {
    currencyFormatters.set(
      safeCurrency,
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: safeCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })
    );
  }

  return currencyFormatters.get(safeCurrency);
}

function getDateFormatter(timeZone = "Europe/Rome") {
  if (!dateFormatters.has(timeZone)) {
    dateFormatters.set(
      timeZone,
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone
      })
    );
  }

  return dateFormatters.get(timeZone);
}

function getDateTimeFormatter(timeZone = "Europe/Rome") {
  if (!dateTimeFormatters.has(timeZone)) {
    dateTimeFormatters.set(
      timeZone,
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone
      })
    );
  }

  return dateTimeFormatters.get(timeZone);
}

function getTimeFormatter(timeZone = "Europe/Rome") {
  if (!timeFormatters.has(timeZone)) {
    timeFormatters.set(
      timeZone,
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone
      })
    );
  }

  return timeFormatters.get(timeZone);
}

export function formatCurrencyFromCents(cents, currency = "EUR") {
  return getCurrencyFormatter(currency).format((Number(cents) || 0) / 100);
}

export function formatCurrency(amount, currency = "EUR") {
  return getCurrencyFormatter(currency).format(Number(amount) || 0);
}

export function formatDateLabel(value, timeZone = "Europe/Rome") {
  return getDateFormatter(timeZone).format(new Date(value));
}

export function formatDateTimeLabel(value, timeZone = "Europe/Rome") {
  return getDateTimeFormatter(timeZone).format(new Date(value));
}

export function formatTimeLabel(value, timeZone = "Europe/Rome") {
  return getTimeFormatter(timeZone).format(new Date(value));
}

export function formatOccurrenceTimeRange(startsAt, endsAt, timeZone = "Europe/Rome") {
  return `${formatTimeLabel(startsAt, timeZone)} to ${formatTimeLabel(endsAt, timeZone)}`;
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
