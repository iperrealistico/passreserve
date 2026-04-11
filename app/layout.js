import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://passreserve.com"),
  title: {
    default: "Passreserve.com",
    template: "%s | Passreserve.com"
  },
  description:
    "Free event registration software for organizers. Create event pages, collect signups, take deposits, accept pay-at-the-event bookings, or use your own Stripe account for online payments.",
  applicationName: "Passreserve.com",
  keywords: [
    "Passreserve.com",
    "free event registration software",
    "free event booking platform",
    "event organizer software",
    "free event page builder",
    "event signup software",
    "pay at the event",
    "pay later event booking",
    "deposit event registration",
    "event software without forced checkout",
    "let guests pay at the venue",
    "no platform fee event software",
    "Stripe event payments",
    "own Stripe integration",
    "recurring event booking",
    "workshop registration software",
    "retreat registration software",
    "class registration software",
    "local events",
    "event registration",
    "event hosts",
    "event dates",
    "event pricing"
  ],
  openGraph: {
    title: "Passreserve.com",
    description:
      "Free event registration software for organizers. Create event pages, collect signups, take deposits, accept pay-at-the-event bookings, or use your own Stripe account for online payments.",
    siteName: "Passreserve.com",
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: "Passreserve.com",
    description:
      "Free event registration software for organizers. Create event pages, collect signups, take deposits, accept pay-at-the-event bookings, or use your own Stripe account for online payments."
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
