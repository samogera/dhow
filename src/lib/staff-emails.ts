import "server-only";
import { emailLayout, sendEmail } from "@/lib/notify";
import { appUrl } from "@/lib/app-url";
import { roleInfo } from "@/lib/staff-roles";

const first = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || "there";
const REPLY = process.env.HELP_INBOX ?? "hello@dhowpartners.com";

/** Invite to the staff workspace. `hasAccount` changes the steps: sign in instead of create an account. */
export function staffInvite(opts: { to: string; role: string; name?: string | null; inviter?: string | null; hasAccount?: boolean }) {
  const r = roleInfo(opts.role);
  const by = opts.inviter ? `${opts.inviter} has` : "Dhow Partners has";
  const url = opts.hasAccount ? `${appUrl()}/login?email=${encodeURIComponent(opts.to)}` : `${appUrl()}/signup?email=${encodeURIComponent(opts.to)}`;
  const steps = opts.hasAccount
    ? ["Click the button below and sign in with this email.", "You'll land in the staff workspace, with your access already set."]
    : [
        `Click the button below. Your email (${opts.to}) is filled in already: use this exact address, or the access won't attach.`,
        "Add your name and a password, then type the code we email you.",
        "You'll land straight in the staff workspace. Then add your photo under Your profile.",
      ];
  return sendEmail({
    template: "staff_invite", to: opts.to, replyTo: REPLY,
    subject: `You're invited to the Dhow Partners workspace as ${r.label}`,
    html: emailLayout(
      `Welcome to the team, ${first(opts.name)}`,
      [
        `${by} invited you to the Dhow Partners staff workspace as ${r.label}.`,
        "The workspace is where we run everything together: clients, leads, partners, projects, tasks, member requests and more.",
      ],
      { label: opts.hasAccount ? "Sign in to the workspace" : "Create your account", href: url },
      [
        { heading: "Getting started", items: steps.map((s, i) => `${i + 1}. ${s}`), mark: "" },
        { heading: `As ${r.label}, you can`, items: r.can },
        { heading: "Left to others", items: r.cannot, mark: "–" },
      ],
      ["Your role can change later as you take on more. Questions? Just reply to this email."],
    ),
  });
}

/** Someone already on the team was given a different role. */
export function staffRoleChanged(opts: { to: string; role: string; name?: string | null }) {
  const r = roleInfo(opts.role);
  return sendEmail({
    template: "staff_role_changed", to: opts.to, replyTo: REPLY,
    subject: `Your Dhow workspace access is now ${r.label}`,
    html: emailLayout(
      `Your access has changed, ${first(opts.name)}`,
      [`You're now ${r.label} in the Dhow Partners staff workspace. It applies the next time you open a page.`],
      { label: "Open the workspace", href: `${appUrl()}/admin` },
      [{ heading: `As ${r.label}, you can`, items: r.can }, { heading: "Left to others", items: r.cannot, mark: "–" }],
    ),
  });
}
