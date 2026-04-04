export const metadata = {
  title: "Passreserve.com",
  description: "Passreserve.com deployment bootstrap for the event platform migration."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
