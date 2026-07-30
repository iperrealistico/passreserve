const baseUrl = "https://passreserve.com";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/*/admin/",
        "/*/events/*/register"
      ]
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl
  };
}
