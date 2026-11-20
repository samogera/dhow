import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal"], variable: "--font-sans-brand", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Dhow Partners", template: "%s · Dhow Partners" },
  description: "Set up, get verified and grow in Kenya. Company registration, trusted partner firms, and curated opportunities for businesses and investors.",
};

export const viewport: Viewport = { themeColor: "#00395f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
