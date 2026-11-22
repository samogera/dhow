import "server-only";
import { emailLayout, sendEmail } from "@/lib/notify";
import { appUrl } from "@/lib/app-url";
import { kes } from "@/lib/format";

// The emails a member gets through their journey, in one place so the wording stays consistent.

const first = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || "there";
const REPLY = process.env.HELP_INBOX ?? "hello@dhowpartners.com";

export function applicationThanks(to: string, name: string) {
  return sendEmail({
    template: "application_thanks", to, replyTo: REPLY,
    subject: "Thank you for applying to Dhow Partners",
    html: emailLayout(`Thank you, ${first(name)}`, [
      "We've received your application for Dhow Partners Membership.",
      "Our team reads every application. We'll email you with the outcome after applications close, and with next steps if you're in.",
      "If anything changes in the meantime, just reply to this email.",
    ]),
  });
}

export function applicationDecision(to: string, name: string, status: "accepted" | "waitlisted" | "declined", plan: string | null) {
  if (status === "accepted") {
    return sendEmail({
      template: "application_accepted", to, replyTo: REPLY,
      subject: "Congratulations: you're in Dhow Partners Membership",
      html: emailLayout(`Congratulations, ${first(name)}!`, [
        `Your application was accepted${plan ? ` for the ${plan} plan` : ""}. Welcome to Dhow Partners.`,
        "In a few days we'll send your next steps: creating your account, choosing how to pay, and opening your member workspace.",
        "We're glad to have you.",
      ]),
    });
  }
  if (status === "waitlisted") {
    return sendEmail({
      template: "application_waitlisted", to, replyTo: REPLY,
      subject: "Your Dhow Partners application: on the waiting list",
      html: emailLayout(`Thank you, ${first(name)}`, [
        "Spaces in this round filled quickly, so your application is on our waiting list.",
        "We'll be in touch as soon as a space opens. You don't need to apply again.",
      ]),
    });
  }
  return sendEmail({
    template: "application_declined", to, replyTo: REPLY,
    subject: "Your Dhow Partners application",
    html: emailLayout(`Thank you, ${first(name)}`, [
      "Thank you for applying. We can't offer you a place in this round.",
      "You can still create a free account to see open opportunities and events, and apply again in the next round.",
    ], { label: "Create a free account", href: `${appUrl()}/signup` }),
  });
}

export function applicationNextSteps(to: string, name: string, plan: string | null) {
  const signup = `${appUrl()}/signup?email=${encodeURIComponent(to)}`;
  return sendEmail({
    template: "application_next_steps", to, replyTo: REPLY,
    subject: "Next steps: open your Dhow member workspace",
    html: emailLayout(`Next steps, ${first(name)}`, [
      "1. Create your account with this email address. It takes a minute.",
      "2. Add your company name. Upload your CR12 and KRA PIN when you're ready.",
      `3. Open Settings, then Plan, and choose ${plan ? `${plan}` : "your plan"}, monthly or yearly. Pay by M-Pesa or card.`,
      "Your opportunities, events and member benefits open as soon as payment goes through.",
    ], { label: "Create my account", href: signup }),
  });
}

export function paymentReceipt(to: string, name: string | null, what: string, amount: number, reference: string, until?: string | null) {
  return sendEmail({
    template: "payment_receipt", to, replyTo: REPLY,
    subject: `Receipt: ${what}`,
    html: emailLayout("Payment received. Thank you.", [
      `${first(name)}, we've received ${kes(amount)} for ${what}.`,
      `Reference: ${reference}`,
      `Date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" })}`,
      ...(until ? [`Your plan runs until ${new Date(`${until}T12:00:00+03:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. We'll remind you before it ends.`] : []),
      "Dhow Partners Limited · Nairobi, Kenya",
    ], { label: "Open your workspace", href: `${appUrl()}/app/plans` }),
  });
}

export function planCancelled(to: string, name: string | null, plan: string, until: string | null) {
  return sendEmail({
    template: "plan_cancelled", to, replyTo: REPLY,
    subject: `Your ${plan} plan is cancelled`,
    html: emailLayout(`We're sorry to see you go, ${first(name)}`, [
      until
        ? `Your ${plan} plan won't renew. You keep everything until ${new Date(`${until}T12:00:00+03:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}, then move to the free plan.`
        : `Your ${plan} plan is cancelled. Our team will confirm the end date with you.`,
      "Your account, documents and history stay safe. You can come back to a paid plan at any time.",
      "If something didn't work for you, reply and tell us. We read every message.",
    ], { label: "Keep my plan", href: `${appUrl()}/app/plans` }),
  });
}

export function accountDeleted(to: string, name: string | null) {
  return sendEmail({
    template: "account_deleted", to, replyTo: REPLY,
    subject: "Your Dhow account has been deleted",
    html: emailLayout(`Goodbye for now, ${first(name)}`, [
      "We're sorry to see you go. Your Dhow account has been deleted, along with your company workspace and documents where you were the only owner.",
      "Payment records we must keep by law stay with us for the time the law requires.",
      "We hope to see you again. You're always welcome back.",
    ], { label: "Visit Dhow Partners", href: "https://dhowpartners.com" }),
  });
}
