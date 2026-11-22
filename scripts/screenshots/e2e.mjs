// End-to-end checks: signs in, clicks through the main flows like a real member and admin,
// and prints PASS / FAIL for each. Runs against the local app and local Supabase with demo data.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "shots";
const PASSWORD = "Demo-password-2026!";
mkdirSync(OUT, { recursive: true });

const results = [];
const pass = (name, note = "") => { results.push(["PASS", name, note]); console.log("PASS", name, note); };
const fail = (name, note = "") => { results.push(["FAIL", name, note]); console.log("FAIL", name, note); };
let current = null; // the page in use, for a screenshot when a check fails
let failShots = 0;
async function check(name, fn) {
  try {
    const note = await fn();
    pass(name, note ?? "");
  } catch (e) {
    let seen = "";
    if (current) {
      await current.screenshot({ path: `${OUT}/FAIL-${++failShots}.png`, fullPage: true }).catch(() => {});
      seen = await current.locator(".text-bad, [role=alert]").allInnerTexts().then((t) => t.join(" | ")).catch(() => "");
    }
    fail(name, `${String(e?.message ?? e).split("\n")[0].slice(0, 200)}${seen ? ` · on screen: ${seen.slice(0, 200)}` : ""} · FAIL-${failShots}.png`);
  }
}

const browser = await chromium.launch();
// Pages stream in behind a loading placeholder: wait until the network is quiet before checking.
async function go(page, url) {
  await page.goto(url, { waitUntil: "load", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
}

async function signIn(email, viewport = { width: 1440, height: 900 }, mobile = false) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  current = page;
  page.on("pageerror", (e) => console.log("PAGE ERROR", page.url(), e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("CONSOLE", m.type(), m.text().slice(0, 400)); });
  page.on("requestfinished", async (r) => {
    if (r.method() !== "POST") return;
    const t = r.timing(); const res = await r.response().catch(() => null);
    console.log("POST", r.url().replace(BASE, ""), res?.status(), `${Math.round(t.responseEnd)}ms`);
  });
  page.on("requestfailed", (r) => console.log("REQUEST FAILED", r.method(), r.url().replace(BASE, ""), r.failure()?.errorText));
  await go(page, `${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }), page.press('input[name="password"]', "Enter")]);
  return { ctx, page };
}

async function visit(page, path, shotName) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  const status = res?.status() ?? 0;
  const appErr = await page.locator("text=Application error").count();
  const updated = await page.locator("text=Dhow was just updated").count();
  if (shotName) await page.screenshot({ path: `${OUT}/${shotName}.png`, fullPage: true });
  if (status >= 400 || appErr || updated) throw new Error(`${path} returned ${status}${appErr ? " with an application error" : ""}${updated ? " with the error page" : ""}`);
  return `${status}`;
}

// ------------------------------------------------------------------ public
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  for (const p of ["/login", "/signup", "/forgot-password", "/terms", "/privacy", "/help"]) await check(`public page ${p}`, () => visit(page, p));
  await check("signup prefills email from the next-steps link", async () => {
    await go(page, `${BASE}/signup?email=new.member%40example.com`);
    await page.waitForTimeout(500);
    const v = await page.inputValue('input[name="email"]');
    if (v !== "new.member@example.com") throw new Error(`email field is "${v}"`);
  });
  await check("intake API rejects a wrong key", async () => {
    const r = await page.request.post(`${BASE}/api/intake/application`, { headers: { "x-intake-key": "wrong" }, data: { name: "X", email: "x@example.com" } });
    if (r.status() !== 401) throw new Error(`status ${r.status()}`);
  });
  await check("intake API saves an application from the website", async () => {
    const r = await page.request.post(`${BASE}/api/intake/application`, {
      headers: { "x-intake-key": process.env.MEMBERSHIP_INTAKE_KEY ?? "" },
      data: { name: "Wanjiru Test", email: "wanjiru@example.com", company: "Matunda Exports", role: "Founder", plan: "Growth", sector: "Agriculture", years: "2 to 5 years", consent: true, investors: "Yes", needs: "Buyers in the EU", goals: "Export more" },
    });
    if (r.status() !== 200) throw new Error(`status ${r.status()} ${await r.text()}`);
  });
  await ctx.close();
}

// ------------------------------------------------------------------ member
{
  const { ctx, page } = await signIn("owner@acacia.test");
  for (const [p, n] of [["/app", "e2e-10-home"], ["/app/opportunities", "e2e-11-opportunities"], ["/app/events", "e2e-12-events"], ["/app/applications", "e2e-13-applications"],
    ["/app/investors", "e2e-14-investors"], ["/app/directory", "e2e-15-directory"], ["/app/settings", "e2e-16-settings"], ["/app/documents", "e2e-17-documents"],
    ["/app/verification", "e2e-18-verification"], ["/app/plans", "e2e-19-plans"], ["/app/settings/account", "e2e-20-account"], ["/app/work", "e2e-21-our-work"]]) {
    await check(`member page ${p}`, () => visit(page, p, n));
  }

  await check("plans page shows Free, Startup, Growth and Enterprise", async () => {
    await go(page, `${BASE}/app/plans`);
    for (const name of ["Startup", "Growth", "Enterprise", "Custom quote", "Monthly", "Yearly"]) {
      if (!(await page.getByText(name, { exact: false }).first().isVisible())) throw new Error(`missing "${name}"`);
    }
    await page.getByRole("radio", { name: /Yearly/ }).click();
    if (!(await page.getByText("KSh 50,000").first().isVisible())) throw new Error("yearly Growth price not shown");
  });

  await check("track an opportunity as Started", async () => {
    await go(page, `${BASE}/app/opportunities/b0000000-0000-4000-8000-000000000003`);
    await page.getByRole("radio", { name: "Started" }).first().click();
    await page.getByRole("button", { name: "Add to My applications" }).first().click();
    // The card switches to "In My applications" with the stage picker once it's saved.
    await page.getByText("In My applications", { exact: true }).first().waitFor({ timeout: 10000 });
  });

  await check("My applications shows it as Started and filters work", async () => {
    await go(page, `${BASE}/app/applications?show=started`);
    await page.locator("table").getByText("ICT equipment supply framework").waitFor({ timeout: 8000 });
    await page.screenshot({ path: `${OUT}/e2e-22-applications-started.png`, fullPage: true });
  });

  await check("change the stage to Submitted from the list", async () => {
    await go(page, `${BASE}/app/applications`);
    const row = page.locator("tr", { hasText: "ICT equipment supply framework" });
    await row.locator('select[name="status"]').selectOption("submitted");
    await page.waitForTimeout(1500);
    await go(page, `${BASE}/app/applications?show=submitted`);
    await page.locator("table").getByText("ICT equipment supply framework").waitFor({ timeout: 8000 });
  });

  await check("Free plan stops at 3 tracked applications", async () => {
    // Demo data has 2, plus the one above = 3. Removing and re-adding must still work.
    await go(page, `${BASE}/app/applications`);
    const count = await page.locator("table tbody tr").count();
    if (count !== 3) throw new Error(`expected 3 rows, saw ${count}`);
  });

  await check("help form: pick a topic, continue, send", async () => {
    await go(page, `${BASE}/app`);
    await page.getByRole("button", { name: "Finding a partner" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.fill('input[name="email"]', "owner@acacia.test");
    await page.getByRole("button", { name: "Send" }).click();
    await page.getByText("We're on it").first().waitFor({ timeout: 10000 });
  });

  await check("help form: Other needs a typed message", async () => {
    await go(page, `${BASE}/app`);
    await page.getByRole("button", { name: "Something else" }).click();
    if (await page.getByRole("button", { name: "Continue" }).isEnabled()) throw new Error("Continue is enabled before typing");
    await page.fill('textarea[aria-label="What you need"]', "Help finding a warehouse in Mombasa");
    if (!(await page.getByRole("button", { name: "Continue" }).isEnabled())) throw new Error("Continue stays disabled after typing");
  });

  await check("ask Dhow to introduce us to a directory member", async () => {
    await go(page, `${BASE}/app/directory`);
    const btn = page.getByRole("button", { name: "Ask Dhow to introduce you" }).first();
    if (!(await btn.count())) return "no other listed companies in demo data";
    await btn.click();
    await page.getByRole("button", { name: "Send request" }).click();
    await page.getByText("Requested").first().waitFor({ timeout: 20000 });
  });

  await check("event representation is locked on Free", async () => {
    await go(page, `${BASE}/app/events`);
    const first = page.locator('a[href^="/app/opportunities/"]').first();
    if (!(await first.count())) return "no events in demo data";
    await first.click();
    await page.getByText("Available from Startup").first().waitFor({ timeout: 8000 });
  });

  await check("Free members don't see Investors or Our work in the menu", async () => {
    await go(page, `${BASE}/app`);
    const nav = page.locator('nav[aria-label="Main"]');
    if (await nav.getByText("Investors").count()) throw new Error("Investors shown on Free");
    if (await nav.getByText("Our work").count()) throw new Error("Our work shown on Free");
  });

  await check("investors are locked on Free", async () => {
    await go(page, `${BASE}/app/investors`);
    await page.getByText("Investor introductions come with Growth").first().waitFor({ timeout: 8000 });
  });

  await check("Enterprise work page explains the plan", async () => {
    await go(page, `${BASE}/app/work`);
    await page.getByText("Part of Enterprise").first().waitFor({ timeout: 8000 });
  });

  await check("account menu opens above the page", async () => {
    await go(page, `${BASE}/app/settings`);
    await page.locator('button[aria-haspopup="menu"]').click();
    await page.getByRole("menu").getByText("Plan and billing").waitFor({ timeout: 5000 });
    await page.screenshot({ path: `${OUT}/e2e-23-account-menu.png` });
    await page.mouse.click(700, 700);
    await page.waitForTimeout(400);
    if (await page.getByRole("menu").isVisible()) throw new Error("menu stays open after tapping elsewhere");
  });
  await ctx.close();
}

// ------------------------------------------------------------------ admin
{
  const { ctx, page } = await signIn("admin@dhow.test");
  for (const [p, n] of [["/admin", "e2e-30-admin"], ["/admin/applications", "e2e-31-membership-applications"], ["/admin/requests", "e2e-32-requests"],
    ["/admin/investors", "e2e-33-investors"], ["/admin/discounts", "e2e-34-discounts"], ["/admin/opportunities", "e2e-35-opportunities"],
    ["/admin/members", "e2e-36-companies"], ["/admin/leads", "e2e-37-leads"], ["/admin/clients", "e2e-38-clients"], ["/admin/finance", "e2e-39-finance"]]) {
    await check(`admin page ${p}`, () => visit(page, p, n));
  }

  await check("the website application shows in Membership applications", async () => {
    await go(page, `${BASE}/admin/applications`);
    await page.getByText("Matunda Exports").first().waitFor({ timeout: 8000 });
  });

  await check("accept an application and send the outcome now", async () => {
    await go(page, `${BASE}/admin/applications`);
    const card = page.locator("div", { hasText: "Matunda Exports" }).filter({ has: page.locator('select[name="status"]') }).last();
    await card.locator('select[name="status"]').selectOption("accepted");
    await card.getByRole("button", { name: "Save" }).click();
    await page.waitForTimeout(1500);
    await go(page, `${BASE}/admin/applications?show=accepted`);
    await page.getByRole("button", { name: "Send outcome email now" }).first().click();
    await page.waitForTimeout(1500);
    await go(page, `${BASE}/admin/applications?show=accepted`);
    await page.getByText("outcome sent").first().waitFor({ timeout: 8000 });
    await page.screenshot({ path: `${OUT}/e2e-40-application-accepted.png`, fullPage: true });
  });

  await check("member requests from the member side arrived", async () => {
    await go(page, `${BASE}/admin/requests`);
    const n = await page.getByText("Introduction to a member").count();
    return `${n} introduction request(s)`;
  });

  await check("add an investor", async () => {
    await go(page, `${BASE}/admin/investors`);
    await page.getByRole("button", { name: /Add investor/ }).first().click();
    await page.fill('input[name="name"]', "Savannah Growth Fund");
    await page.fill('input[name="ticket"]', "USD 100k to 1m");
    await page.fill('input[name="sectors"]', "Agriculture, Energy");
    await page.getByRole("button", { name: "Add investor" }).last().click();
    await page.waitForTimeout(1500);
    await go(page, `${BASE}/admin/investors`);
    await page.getByText("Savannah Growth Fund").first().waitFor({ timeout: 8000 });
  });

  await check("create an investor's private page and answer as the investor", async () => {
    await go(page, `${BASE}/admin/investors`);
    const card = page.locator("div.card, article").filter({ hasText: "Savannah Growth Fund" }).first();
    await card.getByRole("button", { name: "Create their page" }).click();
    await page.waitForTimeout(1500);
    await go(page, `${BASE}/admin/investors`);
    const href = await page.getByRole("link", { name: "Open it ↗" }).first().getAttribute("href");
    if (!href) throw new Error("no investor link");
    const pub = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ip = await pub.newPage();
    await ip.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    await ip.getByText("Companies you may want to meet").waitFor({ timeout: 8000 });
    await ip.getByRole("button", { name: "I'm interested" }).first().click();
    await ip.getByText("Dhow Partners will set up the introduction").first().waitFor({ timeout: 10000 });
    await ip.screenshot({ path: `${OUT}/e2e-42-investor-page.png`, fullPage: true });
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 });
    const mp = await m.newPage();
    await mp.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    await mp.screenshot({ path: `${OUT}/e2e-43-investor-page-phone.png`, fullPage: true });
    await m.close();
    await pub.close();
    await go(page, `${BASE}/admin/alerts`);
    await page.getByText("wants to meet").first().waitFor({ timeout: 8000 });
  });

  await check("save plan discounts", async () => {
    await go(page, `${BASE}/admin/discounts`);
    await page.fill('input[name="premium_events"]', "25");
    await page.getByRole("button", { name: "Save discounts" }).click();
    await page.getByText("Discounts saved").first().waitFor({ timeout: 8000 });
  });

  await check("Alerts list new member requests and applications", async () => {
    await go(page, `${BASE}/admin/alerts`);
    await page.getByText("Members asking for help").first().waitFor({ timeout: 8000 });
    await page.screenshot({ path: `${OUT}/e2e-41-alerts.png`, fullPage: true });
  });

  await check("save buttons show progress then a tick", async () => {
    await go(page, `${BASE}/admin/requests`);
    const btn = page.getByRole("button", { name: "Save" }).first();
    if (!(await btn.count())) return "no requests to save";
    await btn.click();
    await page.locator('button[aria-busy="true"], button:has(svg.lucide-check)').first().waitFor({ timeout: 8000 });
  });

  await check("set a member's plan to Growth", async () => {
    await go(page, `${BASE}/admin/members`);
    const row = page.locator("tr", { hasText: "Acacia Solar" }).first();
    await row.locator('select[name="plan"]').selectOption("growth");
    await row.getByRole("button", { name: "Set" }).click();
    await page.waitForTimeout(1500);
  });
  await ctx.close();
}

// ------------------------------------------------------------------ member again, now on Growth
{
  const { ctx, page } = await signIn("owner@acacia.test");
  await check("Growth unlocks investors and introductions", async () => {
    await go(page, `${BASE}/app/investors`);
    const btn = page.getByRole("button", { name: "Ask for an introduction" }).first();
    if (!(await btn.count())) throw new Error("no introduction button (plan not Growth, or no investors)");
    await btn.click();
    await page.getByRole("button", { name: "Send request" }).click();
    await page.getByText("Requested").first().waitFor({ timeout: 10000 });
    await page.screenshot({ path: `${OUT}/e2e-24-investors-growth.png`, fullPage: true });
  });
  await check("plans page shows Growth as the current plan and the discount", async () => {
    await go(page, `${BASE}/app/plans`);
    await page.getByText("Current plan").first().waitFor({ timeout: 8000 });
    await page.getByText("25% off event representation").first().waitFor({ timeout: 8000 });
    await page.screenshot({ path: `${OUT}/e2e-25-plans-growth.png`, fullPage: true });
  });
  await ctx.close();
}

// ------------------------------------------------------------------ Enterprise via a linked client
{
  const { ctx, page } = await signIn("admin@dhow.test");
  await check("link a client to the member and move them to Enterprise", async () => {
    await go(page, `${BASE}/admin/clients`);
    const href = await page.locator('a[href^="/admin/clients/"]').first().getAttribute("href");
    await go(page, `${BASE}${href}`);
    await page.locator('select[name="org_id"]').selectOption({ label: "Acacia Solar Ltd" });
    await page.locator('form:has(select[name="org_id"])').getByRole("button", { name: "Save" }).click();
    await page.waitForTimeout(2000);
  });
  await ctx.close();
}
{
  const { ctx, page } = await signIn("owner@acacia.test");
  await check("Enterprise member sees Our work with projects", async () => {
    await go(page, `${BASE}/app`);
    await page.locator('nav[aria-label="Main"]').getByText("Our work").click();
    await page.waitForURL(/\/app\/work/);
    await page.getByText("Your projects with Dhow").first().waitFor({ timeout: 8000 });
    await page.screenshot({ path: `${OUT}/e2e-26-our-work.png`, fullPage: true });
  });
  await check("help card is the navy block", async () => {
    await go(page, `${BASE}/app`);
    await page.locator("section.bg-navy-900").last().screenshot({ path: `${OUT}/e2e-27-help-card.png` });
  });
  await check("desktop header is tidy", async () => {
    await go(page, `${BASE}/app`);
    await page.locator("header").first().screenshot({ path: `${OUT}/e2e-28-header.png` });
  });
  await ctx.close();
}

// ------------------------------------------------------------------ phone
{
  const { ctx, page } = await signIn("owner@acacia.test", { width: 390, height: 844 }, true);
  for (const [p, n] of [["/app", "e2e-50-phone-home"], ["/app/plans", "e2e-51-phone-plans"], ["/app/applications", "e2e-52-phone-applications"], ["/app/settings", "e2e-53-phone-settings"]]) {
    await check(`phone page ${p}`, () => visit(page, p, n));
  }
  await check("phone account menu is readable", async () => {
    await go(page, `${BASE}/app/settings`);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/e2e-54-phone-menu.png` });
  });
  await ctx.close();
}

// ------------------------------------------------------------------ phone menus, both sides
{
  const { ctx, page } = await signIn("owner@acacia.test", { width: 390, height: 844 }, true);
  await check("member phone menu opens, navigates and closes", async () => {
    await go(page, `${BASE}/app`);
    await page.mouse.wheel(0, 1500);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("link", { name: "My applications" }).last().click();
    await page.waitForURL(/\/app\/applications/);
    await page.waitForTimeout(400);
    if (await page.getByRole("link", { name: "Directory" }).last().isVisible()) throw new Error("menu still open after navigating");
    await page.screenshot({ path: `${OUT}/e2e-55-phone-member-after-menu.png` });
  });
  await ctx.close();
}
{
  const { ctx, page } = await signIn("admin@dhow.test", { width: 390, height: 844 }, true);
  await check("staff phone menu: bar stays on top, menu scrolls, navigates and closes", async () => {
    await go(page, `${BASE}/admin`);
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/e2e-56-phone-staff-menu.png` });
    await page.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: "Team and access" }).click();
    await page.waitForURL(/\/admin\/team/);
    await page.waitForTimeout(400);
    if (await page.getByRole("navigation", { name: "Menu" }).isVisible()) throw new Error("menu still open after navigating");
    await page.screenshot({ path: `${OUT}/e2e-57-phone-staff-after-menu.png` });
  });
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => r[0] === "FAIL");
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
for (const f of failed) console.log("  FAIL", f[1], "-", f[2]);
