import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://passreserve.com"),
  title: {
    default: "Passreserve.com",
    template: "%s | Passreserve.com"
  },
  description:
    "Free event registration software and free event booking platform for organizers. Create an event page for free, collect deposits, or let guests pay at the event without forced checkout.",
  applicationName: "Passreserve.com",
  keywords: [
    "Passreserve.com",
    "free event registration software",
    "free event booking platform",
    "free event signup platform",
    "free event management software",
    "free ticketing alternative",
    "event organizer software",
    "free event page builder",
    "free software for event organizers",
    "free software for workshops and classes",
    "free event software for small teams",
    "event signup software",
    "pay at the event",
    "pay later event booking",
    "deposit event registration",
    "deposit-only event booking",
    "event software without forced checkout",
    "event booking with balance due at venue",
    "collect deposits for workshops",
    "let guests pay at the venue",
    "no online fee event booking",
    "how to create an event page for free",
    "how to accept event registrations without high fees",
    "best free platform to book events",
    "free event software for recurring dates",
    "workshop registration software",
    "retreat registration software",
    "class registration software",
    "event booking software for retreats",
    "class booking software for small businesses",
    "free platform for local experiences",
    "software for hosts who want guests to pay at the event",
    "local events",
    "event registration",
    "event hosts",
    "event dates",
    "event pricing"
  ],
  openGraph: {
    title: "Passreserve.com",
    description:
      "Free event registration software and free event booking platform for organizers. Create an event page for free, collect deposits, or let guests pay at the event without forced checkout.",
    siteName: "Passreserve.com",
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: "Passreserve.com",
    description:
      "Free event registration software and free event booking platform for organizers. Create an event page for free, collect deposits, or let guests pay at the event without forced checkout."
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
