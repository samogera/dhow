/** Logs how long each step of a server action takes when TIMING_LOG=1 (tests only). */
export function timer(label: string) {
  const on = process.env.TIMING_LOG === "1";
  const t0 = Date.now();
  let last = t0;
  return (step: string) => {
    if (!on) return;
    const now = Date.now();
    console.log(`[timing] ${label} ${step} +${now - last}ms (total ${now - t0}ms)`);
    last = now;
  };
}
