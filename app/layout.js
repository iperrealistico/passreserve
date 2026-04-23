import "./globals.css";
import { Inter, Outfit } from "next/font/google";

import { AppProviders } from "./providers.js";
import {
  getLocalizedSiteMetadata,
  getRequestLocale
} from "../lib/passreserve-i18n.js";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap"
});

export async function generateMetadata() {
  const locale = await getRequestLocale();

  return getLocalizedSiteMetadata(locale);
}

export default async function RootLayout({ children }) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale}>
      <body className={`${inter.variable} ${outfit.variable}`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
