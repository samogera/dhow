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
  microsoftClientId: () => microsoft().clientId,
  microsoftClientSecret: () => microsoft().secret,
  microsoftTenant: () => envAny("MICROSOFT_TENANT_ID", "MICROSFT_TENANT_ID") ?? "common",
  paystackSecret: () => envAny("PAYSTACK_SECRET_KEY", "PAYSTACK_SECRET_KEY_TEST", "PAYSTACK_SECRET_KEY_LIVE", "PAYSTACK_SECRET"),
};

// Microsoft app (client) IDs are always GUIDs; secrets never are. Sort the saved values by shape,
// so a client ID and secret pasted into each other's slots still work.
// The DhowOS app ID is public (it appears in every Microsoft sign-in link), so it is the fallback.
const DHOWOS_MICROSOFT_APP_ID = "9c45041f-9d61-44f4-b12a-a6ced6b8856f";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function microsoft() {
  const id = envAny("MICROSOFT_CLIENT_ID", "MICROSFT_CLIENT_ID");
  const secret = envAny("MICROSOFT_CLIENT_SECRET", "MICROSOFT_SECRET_ID", "MICROSFT_SECRET_ID", "MICROSOFT_SECRET");
  const values = [id, secret].filter((v): v is string => Boolean(v));
  const clientId = values.find((v) => GUID.test(v)) ?? (values.length ? DHOWOS_MICROSOFT_APP_ID : undefined);
  // Prefer the dedicated secret slot; if that holds the GUID, the secret was saved in the ID slot.
  const secretValue = secret && !GUID.test(secret) ? secret : id && !GUID.test(id) ? id : undefined;
  return { clientId, secret: secretValue };
}
