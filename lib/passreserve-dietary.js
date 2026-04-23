export const dietaryFlags = [
  { id: "gluten", label: { en: "Gluten", it: "Glutine" } },
  { id: "lactose", label: { en: "Lactose", it: "Lattosio" } },
  { id: "nuts", label: { en: "Tree nuts", it: "Frutta a guscio" } },
  { id: "peanuts", label: { en: "Peanuts", it: "Arachidi" } },
  { id: "shellfish", label: { en: "Shellfish", it: "Crostacei" } },
  { id: "fish", label: { en: "Fish", it: "Pesce" } },
  { id: "eggs", label: { en: "Eggs", it: "Uova" } },
  { id: "soy", label: { en: "Soy", it: "Soia" } },
  { id: "sesame", label: { en: "Sesame", it: "Sesamo" } },
  { id: "vegan", label: { en: "Vegan menu", it: "Menu vegano" } },
  { id: "vegetarian", label: { en: "Vegetarian menu", it: "Menu vegetariano" } }
];

export function getDietaryFlagLabel(flagId, locale = "en") {
  const normalizedLocale = String(locale || "en").toLowerCase().slice(0, 2) === "it" ? "it" : "en";
  return dietaryFlags.find((flag) => flag.id === flagId)?.label?.[normalizedLocale] || flagId;
}
