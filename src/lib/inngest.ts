import "server-only";
import { Inngest } from "inngest";
import { deadlineReminders, dailyMaintenance, processPaidVerification } from "@/lib/workflows";
import { importAllSources } from "@/lib/opportunity-import";

export const inngest = new Inngest({ id: "dhow-os" });

const onVerificationPaid = inngest.createFunction(
  { id: "verification-paid", retries: 5 },
  { event: "dhow/verification.paid" },
  async ({ event, step }) => {
    await step.run("run-kyb-and-decide", () => processPaidVerification(event.data.paymentId as string));
  },
);

const nightly = inngest.createFunction(
  { id: "nightly-maintenance" },
  { cron: "TZ=Africa/Nairobi 0 2 * * *" },
  async ({ step }) => {
    await step.run("maintenance", () => dailyMaintenance());
  },
);

const morningReminders = inngest.createFunction(
  { id: "deadline-reminders" },
  { cron: "TZ=Africa/Nairobi 0 8 * * *" },
  async ({ step }) => {
    await step.run("reminders", () => deadlineReminders());
  },
);

const opportunityImport = inngest.createFunction(
  { id: "opportunity-import" },
  { cron: "TZ=Africa/Nairobi 0 6,12,18 * * *" },
  async ({ step }) => {
    await step.run("import", () => importAllSources());
  },
);

export const functions = [onVerificationPaid, nightly, morningReminders, opportunityImport];

/** Queue a paid verification; runs inline when Inngest isn't set up yet. */
export async function queueVerificationPaid(paymentId: string) {
  try {
    if (!process.env.INNGEST_EVENT_KEY && process.env.NODE_ENV === "production") throw new Error("no inngest");
    await inngest.send({ name: "dhow/verification.paid", data: { paymentId } });
  } catch {
    await processPaidVerification(paymentId);
  }
}
