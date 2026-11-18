import { serve } from "inngest/next";
import { inngest, functions } from "@/lib/inngest";

// Inngest verifies its own signatures (INNGEST_SIGNING_KEY) on every call.
export const { GET, POST, PUT } = serve({ client: inngest, functions });
