import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const r2Endpoint = process.env.R2_PUBLIC_UPLOAD_ORIGIN ?? "https://*.r2.cloudflarestorage.com";

// Strict security headers on every response.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseUrl} ${supabaseUrl.replace("https://", "wss://")} ${r2Endpoint}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.paystack.com",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@react-pdf/renderer", "exceljs"],
  // The PDF library loads its built-in fonts by file path at run time, which Vercel's bundler can't see. Ship them explicitly.
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/pdfkit/js/**/*", "./node_modules/@react-pdf/pdfkit/**/*", "./node_modules/@react-pdf/font/**/*"],
    "/client/**/*": ["./node_modules/pdfkit/js/**/*", "./node_modules/@react-pdf/pdfkit/**/*", "./node_modules/@react-pdf/font/**/*"],
    "/admin/**/*": ["./node_modules/pdfkit/js/**/*", "./node_modules/@react-pdf/pdfkit/**/*", "./node_modules/@react-pdf/font/**/*"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "11mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
