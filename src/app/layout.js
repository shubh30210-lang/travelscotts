import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Travelscotts | Premium Visa & Travel Services",
  description: "Your Trusted Visa & Travel Partner",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Scripts sirf ek baar load hongi, browser crash nahi hoga! */}
        <Script src="https://unpkg.com/three" strategy="beforeInteractive" />
        <Script src="https://unpkg.com/globe.gl" strategy="beforeInteractive" />
        <Script src="https://kit.fontawesome.com/a076d05399.js" crossOrigin="anonymous" strategy="lazyOnload" />
      </head>
      <body>{children}</body>
    </html>
  );
}