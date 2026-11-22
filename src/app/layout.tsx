import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { appUrl } from "@/lib/app-url";


export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "Dhow Partners", template: "%s · Dhow Partners" },
  description: "Set up, get verified and grow in Kenya. Company registration, trusted partner firms, and curated opportunities for businesses and investors.",
  applicationName: "Dhow Partners",
  openGraph: {
    type: "website",
    siteName: "Dhow Partners",
    locale: "en_KE",
    title: "Dhow Partners",
    description: "Set up, get verified and grow in Kenya and East Africa, with trusted partner firms and curated opportunities.",
  },
  twitter: { card: "summary_large_image", title: "Dhow Partners", description: "Set up, get verified and grow in Kenya and East Africa." },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#f3f5f7", viewportFit: "cover", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
