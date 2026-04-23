import { normalizeText } from "./passreserve-format.js";

function normalizeLocale(locale) {
  return String(locale || "en").trim().toLowerCase().slice(0, 2) === "it" ? "it" : "en";
}

function getContentRecord(record) {
  return record && typeof record.contentI18n === "object" && !Array.isArray(record.contentI18n)
    ? record.contentI18n
    : {};
}

function normalizeList(values) {
  return Array.isArray(values) ? values.map((value) => normalizeText(value)).filter(Boolean) : [];
}

function readLocalizedEntry(record, field) {
  const content = getContentRecord(record);
  return content[field] && typeof content[field] === "object" ? content[field] : null;
}

function entryHasValue(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }

  return Object.values(entry).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(normalizeText(value))
  );
}

export function buildLocalizedTextEntry(itValue, enValue) {
  const entry = {
    it: normalizeText(itValue),
    en: normalizeText(enValue)
  };

  return entryHasValue(entry) ? entry : null;
}

export function buildLocalizedListEntry(itValues, enValues) {
  const entry = {
    it: normalizeList(itValues),
    en: normalizeList(enValues)
  };

  return entryHasValue(entry) ? entry : null;
}

export function upsertLocalizedField(contentI18n, field, entry) {
  const next = { ...getContentRecord({ contentI18n }) };

  if (entryHasValue(entry)) {
    next[field] = entry;
  } else {
    delete next[field];
  }

  return Object.keys(next).length ? next : null;
}

export function getLocalizedText(record, field, locale = "en") {
  const entry = readLocalizedEntry(record, field);
  const currentLocale = normalizeLocale(locale);
  const alternateLocale = currentLocale === "it" ? "en" : "it";
  const preferred = normalizeText(entry?.[currentLocale]);
  const fallback = normalizeText(record?.[field]);
  const alternate = normalizeText(entry?.[alternateLocale]);

  return preferred || fallback || alternate || "";
}

export function getLocalizedList(record, field, locale = "en") {
  const entry = readLocalizedEntry(record, field);
  const currentLocale = normalizeLocale(locale);
  const alternateLocale = currentLocale === "it" ? "en" : "it";
  const preferred = normalizeList(entry?.[currentLocale]);
  const fallback = normalizeList(record?.[field]);
  const alternate = normalizeList(entry?.[alternateLocale]);

  return preferred.length ? preferred : fallback.length ? fallback : alternate;
}

export function getLocalizedFormText(record, field, locale = "en") {
  const entry = readLocalizedEntry(record, field);
  const currentLocale = normalizeLocale(locale);

  if (entry) {
    return normalizeText(entry?.[currentLocale]);
  }

  return currentLocale === "en" ? normalizeText(record?.[field]) : "";
}

export function getLocalizedFormList(record, field, locale = "en") {
  const entry = readLocalizedEntry(record, field);
  const currentLocale = normalizeLocale(locale);

  if (entry) {
    return normalizeList(entry?.[currentLocale]).join("\n");
  }

  return currentLocale === "en" ? normalizeList(record?.[field]).join("\n") : "";
}

export function pickPrimaryTextValue(entry, fallback = "") {
  return normalizeText(entry?.en) || normalizeText(entry?.it) || normalizeText(fallback);
}

export function pickPrimaryListValue(entry, fallback = []) {
  const english = normalizeList(entry?.en);
  const italian = normalizeList(entry?.it);
  const legacy = normalizeList(fallback);

  if (english.length) {
    return english;
  }

  if (italian.length) {
    return italian;
  }

  return legacy;
}
