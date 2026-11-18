import Link from "next/link";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/auth";
import { acceptInvitation } from "@/actions/member";
import { ButtonLink } from "@/components/ui";
import { Submit } from "@/components/forms";

const messages: Record<string, string> = {
  expired: "This invitation has expired or was already used. Ask your colleague to send a new one.",
  "wrong-account": "This invitation was sent to a different email. Sign in with that email, then open the link again.",
};

export default async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await getSession();
  const notice = messages[token];

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="flex justify-center"><Logo /></div>
        {notice ? (
          <p className="mt-8 text-muted">{notice}</p>
        ) : s ? (
          <form action={acceptInvitation} className="mt-8 space-y-4">
            <h1 className="text-2xl font-semibold">Join your team on Dhow</h1>
            <p className="text-sm text-muted">Signed in as {s.user.email}.</p>
            <input type="hidden" name="token" value={token} />
            <Submit className="w-full">Accept invitation</Submit>
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <h1 className="text-2xl font-semibold">You&apos;re invited</h1>
            <p className="text-sm text-muted">Sign in or create an account with the email the invitation was sent to.</p>
            <ButtonLink href={`/login?next=/invite/${token}`} className="w-full">Sign in</ButtonLink>
            <p className="text-xs text-muted">New here? <Link href="/signup" className="font-medium text-ink">Create an account</Link>, then open the link again.</p>
          </div>
        )}
      </div>
    </div>
  );
}
