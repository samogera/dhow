"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Smartphone } from "lucide-react";
import { requestManualVerification } from "@/actions/member";
import { FormMessage, Submit } from "@/components/forms";
import { Button } from "@/components/ui";

export function ManualRequest() {
  const [state, action] = useActionState(requestManualVerification, undefined);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <Submit variant="outline" className="w-full" pending="Submitting…">Request free review</Submit>
    </form>
  );
}

type Phase = "idle" | "sending" | "waiting" | "paid" | "failed";

export function PayAndVerify({ defaultPhone }: { defaultPhone: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState(defaultPhone ? `0${defaultPhone.slice(3)}` : "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Poll every 3 seconds for up to 2 minutes while the member enters their PIN.
  useEffect(() => {
    if (phase !== "waiting" || !paymentId) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries += 1;
      const r = await fetch(`/api/payments/${paymentId}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (j.status === "paid") {
        setPhase("paid");
        setMsg(`Payment received (${j.mpesa_receipt}). Checking your records now…`);
        clearInterval(t);
        setTimeout(() => router.refresh(), 2500);
      } else if (j.status === "failed" || j.status === "cancelled") {
        setPhase("failed");
        setMsg(j.status === "cancelled" ? "The payment was cancelled on your phone." : `Payment failed: ${j.result_desc ?? "try again"}.`);
        clearInterval(t);
      } else if (tries >= 40) {
        setPhase("failed");
        setMsg("We didn't hear back from M-Pesa. If you paid, it will show here within a few minutes.");
        clearInterval(t);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [phase, paymentId, router]);

  async function pay() {
    setPhase("sending");
    setMsg("");
    const r = await fetch("/api/payments/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setPhase("failed");
      setMsg(j.error ?? "Something went wrong.");
      return;
    }
    setPaymentId(j.paymentId);
    setPhase("waiting");
    setMsg(j.message);
  }

  return (
    <div className="space-y-3">
      <label className="relative block">
        <Smartphone className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink/50" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="0712 345 678"
          className="field border-transparent bg-white/80 pl-11" disabled={phase === "sending" || phase === "waiting"} aria-label="M-Pesa phone number" />
      </label>
      {msg ? <p className={`rounded-2xl px-4 py-3 text-sm ${phase === "failed" ? "bg-bad/10 text-bad" : "bg-white/70"}`}>{msg}</p> : null}
      <Button onClick={pay} disabled={!phone || phase === "sending" || phase === "waiting" || phase === "paid"} className="w-full">
        {phase === "sending" ? "Sending to your phone…" : phase === "waiting" ? "Waiting for your PIN…" : phase === "failed" ? "Try again" : "Pay with M-Pesa"}
      </Button>
    </div>
  );
}

/** Paystack checkout: we create the payment, then send the member to Paystack's secure page (M-Pesa or card). */
export function PaystackCheckout({ fee }: { fee: number }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function start() {
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/payments/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) {
      setBusy(false);
      setMsg(j.error ?? "Something went wrong. Please try again.");
      return;
    }
    window.location.assign(j.url);
  }
  return (
    <div className="space-y-3">
      {msg ? <p className="rounded-2xl bg-bad/10 px-4 py-3 text-sm text-bad">{msg}</p> : null}
      <Button onClick={start} disabled={busy} className="w-full">
        <CreditCard className="size-4" /> {busy ? "Opening secure checkout…" : `Pay KSh ${fee.toLocaleString("en-KE")}`}
      </Button>
      <p className="text-center text-xs text-ink/60">Secure checkout by Paystack. Pay with M-Pesa or card.</p>
    </div>
  );
}
