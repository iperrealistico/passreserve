const baseUrl = "https://passreserve.com";

const publicRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/events", changeFrequency: "daily", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/organizer-access", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.2 }
];

export default function sitemap() {
  return publicRoutes.map(({ path, ...metadata }) => ({
    url: new URL(path, baseUrl).toString(),
    ...metadata
  }));
}
