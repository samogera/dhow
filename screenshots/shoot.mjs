// Signs in as an admin and as a member, then screenshots each screen.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "shots";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const failures = [];

async function session(email) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  if (email) {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', process.env.DEMO_PASSWORD);
    await Promise.all([page.waitForURL(/\/(app|admin)/, { timeout: 30000 }), page.click('button[type="submit"]')]);
  }
  return { ctx, page };
}

async function shoot(page, path, name, full = true) {
  try {
    const r = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(400);
    const status = r?.status() ?? 0;
    const err = await page.locator("text=/Application error|Internal Server Error|This page could not be found/").count();
    if (status >= 400 || err) failures.push(`${name} ${path} -> HTTP ${status}${err ? " (error shown)" : ""}`);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
    console.log("shot", name, status);
  } catch (e) {
    failures.push(`${name} ${path} -> ${e.message.split("\n")[0]}`);
  }
}

// Public
{
  const { ctx, page } = await session(null);
  await shoot(page, "/login", "01-sign-in", false);
  await shoot(page, "/signup", "02-create-account", false);
  await shoot(page, "/help", "03-help-centre");
  await shoot(page, "/help/get-verified", "04-help-article");
  await ctx.close();
}
// Member
{
  const { ctx, page } = await session("member@dhow.test");
  await shoot(page, "/app", "10-member-dashboard");
  await shoot(page, "/app/documents", "11-member-documents");
  await shoot(page, "/app/verification", "12-member-verification");
  await shoot(page, "/app/opportunities", "13-member-opportunities");
  await shoot(page, "/app/opportunities/c0000000-0000-4000-8000-000000000001", "14-member-opportunity");
  await shoot(page, "/app/applications", "15-member-applications");
  await shoot(page, "/app/settings", "16-member-settings");
  await ctx.close();
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/login`);
  await mp.fill('input[name="email"]', "member@dhow.test");
  await mp.fill('input[name="password"]', process.env.DEMO_PASSWORD);
  await Promise.all([mp.waitForURL(/\/app/), mp.click('button[type="submit"]')]);
  await shoot(mp, "/app", "17-member-dashboard-phone", false);
  await m.close();
}
// Staff
{
  const { ctx, page } = await session("admin@dhow.test");
  const pages = [
    ["/admin", "20-staff-dashboard"], ["/admin/reviews", "21-reviews"], ["/admin/reviews/b0000000-0000-4000-8000-000000000001", "22-review-detail"],
    ["/admin/members", "23-member-companies"], ["/admin/opportunities?id=c0000000-0000-4000-8000-000000000001", "24-opportunities"],
    ["/admin/leads", "25-leads"], ["/admin/clients", "26-clients"], ["/admin/partners", "27-partners"], ["/admin/projects", "28-projects"],
    ["/admin/finance", "29-finance"], ["/admin/finance?tab=bills", "30-partner-bills"], ["/admin/finance/invoices/new", "31-new-invoice"],
    ["/admin/finance/invoices/e0000000-0000-4000-8000-000000000001", "32-invoice"], ["/admin/wiki", "33-wiki"], ["/admin/wiki/client-journey", "34-wiki-page"],
    ["/admin/links", "35-links"], ["/admin/calendar", "36-calendar"], ["/admin/team", "37-team"], ["/admin/help", "38-staff-guides"],
  ];
  for (const [p, n] of pages) await shoot(page, p, n);
  await ctx.close();
}
await browser.close();
console.log(failures.length ? `FAILURES\n${failures.join("\n")}` : "ALL OK");
import("node:fs").then((fs) => fs.writeFileSync(`${OUT}/report.txt`, failures.length ? failures.join("\n") : "ALL OK"));
