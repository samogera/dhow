import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/** The front door: staff go to the workspace, members to their dashboard, everyone else to sign in. */
export default async function Root() {
  const s = await getSession();
  if (!s) redirect("/login");
  redirect(s.profile?.staff_role ? "/admin" : "/app");
}
