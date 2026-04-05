import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://passreserve.com"),
  title: {
    default: "Passreserve.com",
    template: "%s | Passreserve.com"
  },
  description:
    "Simple event registration, deposits, organizer admin, and platform operations for organizers, venues, and seasonal experiences.",
  applicationName: "Passreserve.com",
  keywords: [
    "Passreserve.com",
    "event registration",
    "organizer operations",
    "event deposits",
    "event occurrences",
    "platform admin"
  ],
  openGraph: {
    title: "Passreserve.com",
    description:
      "Simple event registration, deposits, organizer admin, and platform operations for organizers, venues, and seasonal experiences.",
    siteName: "Passreserve.com",
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: "Passreserve.com",
    description:
      "Simple event registration, deposits, organizer admin, and platform operations for organizers, venues, and seasonal experiences."
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
