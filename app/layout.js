import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://passreserve.com"),
  title: {
    default: "Passreserve.com",
    template: "%s | Passreserve.com"
  },
  description:
    "Find local events, compare dates and prices clearly, and sign up with confidence.",
  applicationName: "Passreserve.com",
  keywords: [
    "Passreserve.com",
    "local events",
    "event registration",
    "event hosts",
    "event dates",
    "event pricing"
  ],
  openGraph: {
    title: "Passreserve.com",
    description:
      "Find local events, compare dates and prices clearly, and sign up with confidence.",
    siteName: "Passreserve.com",
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: "Passreserve.com",
    description:
      "Find local events, compare dates and prices clearly, and sign up with confidence."
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
