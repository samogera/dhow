import "server-only";
import { z } from "zod";

// Server-side environment, validated once. Optional integrations stay optional
// so the app runs locally before every account is set up.
const schema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  DATA_ENCRYPTION_KEY: z.string().min(40, "DATA_ENCRYPTION_KEY must be 32 bytes, base64"),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default("dhow-os-documents"),

  MPESA_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  MPESA_CONSUMER_KEY: z.string().optional(),
  MPESA_CONSUMER_SECRET: z.string().optional(),
  MPESA_SHORTCODE: z.string().optional(),
  MPESA_PASSKEY: z.string().optional(),
  MPESA_CALLBACK_SECRET: z.string().optional(),
  VERIFICATION_FEE_KES: z.coerce.number().int().positive().default(500),

  KYB_PROVIDER: z.enum(["manual", "smile_id"]).default("manual"),
  SMILE_ID_PARTNER_ID: z.string().optional(),
  SMILE_ID_API_KEY: z.string().optional(),
  SMILE_ID_ENV: z.enum(["sandbox", "production"]).default("sandbox"),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Dhow Partners <hello@dhowpartners.com>"),

  AT_USERNAME: z.string().optional(),
  AT_API_KEY: z.string().optional(),
  AT_SENDER_ID: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
