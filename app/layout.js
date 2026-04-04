import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://passreserve.com"),
  title: {
    default: "Passreserve.com",
    template: "%s | Passreserve.com"
  },
  description:
    "Simple event booking, deposits, and organizer operations for venues, activity providers, and seasonal experiences.",
  applicationName: "Passreserve.com",
  keywords: [
    "Passreserve.com",
    "event booking",
    "event registration",
    "organizer operations",
    "event deposits",
    "event occurrences"
  ],
  openGraph: {
    title: "Passreserve.com",
    description:
      "Simple event booking, deposits, and organizer operations for venues, activity providers, and seasonal experiences.",
    siteName: "Passreserve.com",
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: "Passreserve.com",
    description:
      "Simple event booking, deposits, and organizer operations for venues, activity providers, and seasonal experiences."
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
