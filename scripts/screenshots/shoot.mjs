// Signs in as a member and as staff, then screenshots every main screen.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function session(email, password) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => log("PAGE ERROR", e.message));
  if (email) {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }), page.press('input[name="password"]', "Enter")]);
    log("signed in", email, "->", page.url());
  }
  return { ctx, page };
}

async function shot(page, path, name, opts = {}) {
  try { await shotInner(page, path, name, opts); } catch (e) { log("FAILED", path, e.message.split("\n")[0]); }
}
async function shotInner(page, path, name, { full = true } = {}) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(400);
  const status = res?.status();
  const err = await page.locator("text=Application error").count();
  log(status, path, err ? "APPLICATION ERROR" : "");
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
}

// Public
{
  const { ctx, page } = await session();
  await shot(page, "/login", "01-sign-in", { full: false });
  await shot(page, "/signup", "02-create-account", { full: false });
  await shot(page, "/help", "03-help-centre");
  await shot(page, "/help/get-verified", "04-help-article");
  await ctx.close();
}

// Member (company owner)
{
  const { ctx, page } = await session("owner@acacia.test", "Demo-password-2026!");
  await shot(page, "/app", "10-member-dashboard");
  await shot(page, "/app/documents", "11-member-documents");
  await shot(page, "/app/verification", "12-member-verification");
  await shot(page, "/app/opportunities", "13-member-opportunities");
  await shot(page, "/app/opportunities/b0000000-0000-4000-8000-000000000001", "14-member-opportunity");
  await shot(page, "/app/applications", "15-member-applications");
  await shot(page, "/app/settings", "16-member-settings");
  await ctx.close();
}

// Staff (admin)
{
  const { ctx, page } = await session("admin@dhow.test", "Demo-password-2026!");
  await shot(page, "/admin", "20-staff-dashboard");
  await shot(page, "/admin/reviews", "21-staff-reviews");
  const review = await page.locator('a[href^="/admin/reviews/"]').first().getAttribute("href").catch(() => null);
  if (review) await shot(page, review, "22-staff-review-detail");
  await shot(page, "/admin/members", "23-staff-members");
  await shot(page, "/admin/opportunities", "24-staff-opportunities");
  await shot(page, "/admin/leads", "25-staff-leads");
  await shot(page, "/admin/clients", "26-staff-clients");
  await shot(page, "/admin/projects", "27-staff-projects");
  await shot(page, "/admin/finance", "28-staff-finance");
  await shot(page, "/admin/finance/invoices/new", "29-staff-new-invoice");
  await shot(page, "/admin/finance/invoices/d0000000-0000-4000-8000-000000000001", "30-staff-invoice");
  await shot(page, "/admin/wiki", "31-staff-wiki");
  await shot(page, "/admin/wiki/client-journey", "32-staff-wiki-page");
  await shot(page, "/admin/links", "33-staff-links");
  await shot(page, "/admin/team", "34-staff-team");
  await shot(page, "/admin/help", "35-staff-help");
  await ctx.close();
}

// Phone size
async function phone(email) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  if (email) {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "Demo-password-2026!");
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }), page.press('input[name="password"]', "Enter")]);
  }
  return { ctx, page };
}
{
  const { ctx, page } = await phone();
  await shot(page, "/login", "50-phone-sign-in", { full: false });
  await shot(page, "/help", "51-phone-help", { full: false });
  await ctx.close();
}
{
  const { ctx, page } = await phone("owner@acacia.test");
  await shot(page, "/app", "52-phone-member-dashboard", { full: false });
  await shot(page, "/app/verification", "53-phone-member-verification", { full: false });
  await shot(page, "/app/opportunities", "54-phone-member-opportunities", { full: false });
  await ctx.close();
}
{
  const { ctx, page } = await phone("admin@dhow.test");
  await shot(page, "/admin", "55-phone-staff-dashboard", { full: false });
  await shot(page, "/admin/leads", "56-phone-staff-leads", { full: false });
  await shot(page, "/admin/finance", "57-phone-staff-finance", { full: false });
  await page.goto(`${BASE}/admin/finance`);
  await page.getByRole("button", { name: "More" }).click().catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/58-phone-staff-menu.png` });
  await shot(page, "/admin/finance/invoices/d0000000-0000-4000-8000-000000000001", "59-phone-staff-invoice", { full: false });
  await ctx.close();
}

await browser.close();
log("done");
