/** Read the first environment variable that is set, so keys saved under slightly different names still work. */
export function envAny(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

export const keys = {
  googleClientId: () => envAny("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => envAny("GOOGLE_CLIENT_SECRET", "GOOGLE_SECRET_ID", "GOOGLE_SECRET"),
  microsoftClientId: () => envAny("MICROSOFT_CLIENT_ID", "MICROSFT_CLIENT_ID"),
  microsoftClientSecret: () => envAny("MICROSOFT_CLIENT_SECRET", "MICROSOFT_SECRET_ID", "MICROSFT_SECRET_ID", "MICROSOFT_SECRET"),
  microsoftTenant: () => envAny("MICROSOFT_TENANT_ID", "MICROSFT_TENANT_ID") ?? "common",
  paystackSecret: () => envAny("PAYSTACK_SECRET_KEY", "PAYSTACK_SECRET_KEY_TEST", "PAYSTACK_SECRET_KEY_LIVE", "PAYSTACK_SECRET"),
};
