// Help Centre articles. Plain Markdown, rendered safely by components/markdown.tsx.
// "member" articles are public at /help; "staff" articles live inside the workspace at /admin/help.

export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  section: string;
  audience: "member" | "staff";
  body: string;
}

export const ARTICLES: HelpArticle[] = [
  // ------------------------------------------------------------------ members: getting started
  {
    slug: "create-your-account", audience: "member", section: "Getting started",
    title: "Create your account and company",
    summary: "Sign up, confirm your email and set up your company profile.",
    body: `
1. Go to **Create account**, enter your name, email and a password of at least 10 characters.
2. Open the confirmation email and click the link. You'll come back signed in.
3. On **Set up your company**, enter your company name, country of registration and sector.
4. Add your **BRS registration number** and **company KRA PIN** if you have them. You can add them later in **Settings**, but you need the registration number to get verified.
5. Click **Create company**. You're now the company's **owner** and land on your dashboard.

> Your KRA PIN is stored encrypted. Only the last four characters are ever shown back to you.

**Tip:** if you're invited to more than one company, switch between them from the drop-down at the top of your dashboard.
`,
  },
  {
    slug: "your-dashboard", audience: "member", section: "Getting started",
    title: "Find your way around",
    summary: "What each part of your account is for.",
    body: `
The menu at the top has six sections:

- **Dashboard**: your verification status, storage used, recent documents and opportunities closing soon.
- **Documents**: upload and keep your company documents.
- **Verification**: get the Dhow Verified badge, free or instant.
- **Opportunities**: RFPs, tenders, grants, events and programmes posted by Dhow.
- **Applications**: everything you've applied to and where it stands.
- **Settings**: company details, your profile and your team.

Your name in the top-right corner opens your account menu, where you can sign out.
`,
  },
  {
    slug: "invite-your-team", audience: "member", section: "Getting started",
    title: "Invite your team",
    summary: "Add colleagues and choose what they can do.",
    body: `
Owners and admins can invite people.

1. Go to **Settings → Team**.
2. Enter their email, choose a role and click **Send invite**.
3. They get an email with a link. The link works for **7 days** and only for that email address. If they don't have an account yet, they'll be asked to create one with the same email.

**Roles**

- **Owner**: everything, including managing the team.
- **Admin**: edit company details, invite people, upload documents, request verification and pay.
- **Member**: view the company, upload documents and work on applications.

To remove someone, use **Remove** next to their name in **Settings → Team**.
`,
  },

  // ------------------------------------------------------------------ members: documents
  {
    slug: "upload-documents", audience: "member", section: "Documents",
    title: "Upload documents",
    summary: "File types, size limits and how storage works.",
    body: `
1. Go to **Documents**.
2. Choose the **Document type**, for example *CR12*, *Certificate of incorporation* or *KRA PIN certificate*.
3. Choose the file and upload it.

**What you can upload**

- PDF, PNG or JPG files, up to **10 MB** each.
- Files are checked when they arrive. A file that isn't really a PDF or image (for example, a renamed program) is rejected.

**Storage**

- Free plan: **50 MB**, rising to **500 MB** once you're Dhow Verified.
- Starter 500 MB, Growth 2 GB, Market Entry 10 GB.
- Your dashboard shows how much you've used. Delete files you no longer need to free space.

**Who can see your documents?** Only your team and Dhow reviewers. Files are kept in private storage and every download link expires after two minutes.
`,
  },

  // ------------------------------------------------------------------ members: verification
  {
    slug: "get-verified", audience: "member", section: "Verification",
    title: "Get Dhow Verified",
    summary: "Step 1: upload your documents. Step 2: pay the fee. Step 3: the KYB check.",
    body: `
The **Dhow Verified** badge shows that your company's registration has been checked. It lasts **12 months** and unlocks opportunities that are open only to verified companies.

Only **owners and admins** can request verification. First, add your **BRS registration number** in **Settings**.

## Step 1: Upload your documents

Upload your **CR12** or **Certificate of incorporation**, and your **KRA PIN certificate**, in **Documents**.

## Step 2: Pay the fee

1. Add your **registered P.O. Box and postal code** in **Settings**, as they appear on your CR12. The registry check uses them.
2. Go to **Verification** and click **Pay KSh 500**.
3. On Paystack's secure page, choose **M-Pesa** (approve the prompt on your phone) or **card**.

## Step 3: KYB check

KYB (know your business) means we confirm your company with the official business registry through our verification partner. It starts as soon as your payment comes through. If your records match, you're verified straight away.

If the check can't confirm a match, the Dhow team looks at your documents and contacts you. You won't be asked to pay again.

> Once you're verified, your company's registration details are locked so the badge always matches what was checked. Contact Dhow if something needs correcting.
`,
  },
  {
    slug: "mpesa-payment-problems", audience: "member", section: "Verification",
    title: "Payment problems",
    summary: "What to do if an M-Pesa or card payment doesn't go through.",
    body: `
Payments are handled by **Paystack**, on its own secure page. Dhow never sees your card details or M-Pesa PIN.

**The M-Pesa prompt didn't appear on my phone**

- Check the number is a Safaricom line, and that your phone is on and unlocked.
- Go back to **Verification** and click **Pay** again. Nothing is charged until you enter your PIN.

**It says the payment was cancelled**

You closed the checkout or the prompt timed out. Nothing was charged. Try again.

**I paid but the page didn't update**

If money left your account, Dhow confirms it with Paystack automatically, usually within a minute and at the latest overnight. You won't be charged twice for the same request.

**Paying an invoice from Dhow Partners?** Use the **Pay online** button in the invoice email. The payment is recorded against your invoice automatically.

**Still stuck?** Email hello@dhowpartners.com with the Paystack or M-Pesa reference.
`,
  },
  {
    slug: "what-the-badge-means", audience: "member", section: "Verification",
    title: "What the badge means",
    summary: "What Dhow Verified confirms, and what it doesn't.",
    body: `
**It confirms that**

- your company is registered,
- your details match official records,
- Dhow has reviewed your documents, and
- the check happened in the last 12 months.

**It doesn't mean that** Dhow endorses your products or services, has audited your finances, guarantees any contract or payment, or that you're licensed for regulated work.

When your badge expires, your status changes to *Expired*. Request verification again from the **Verification** page.
`,
  },

  // ------------------------------------------------------------------ members: opportunities
  {
    slug: "apply-to-opportunities", audience: "member", section: "Opportunities",
    title: "Apply to an opportunity",
    summary: "Find opportunities, apply, and follow your application.",
    body: `
1. Go to **Opportunities**. Filter by type: RFP, tender, grant, event or programme.
2. Open one to read the details and the deadline.
3. Add a short note for the Dhow team, for example why you're a good fit, and click **Apply**.

Some opportunities are marked **Verified**. Only Dhow Verified companies can apply to those.

**Follow your applications** in **Applications**. Each one moves through:

- **Submitted**: we've received it.
- **Shortlisted**: you're through to the next stage.
- **Won** or **Lost**: the final outcome.

Owners and admins get an email (and an SMS, if a mobile number is saved) whenever the status changes. You can **Withdraw** an application while it's still submitted.
`,
  },

  // ------------------------------------------------------------------ members: account
  {
    slug: "password-and-security", audience: "member", section: "Account and security",
    title: "Password and sign-in",
    summary: "Reset your password and keep your account safe.",
    body: `
**Forgot your password?** On the sign-in page, click **Forgot password?**, enter your email and follow the link we send you to choose a new one.

**Change your details** in **Settings → Your profile**: your full name and mobile number. Your mobile is used for SMS updates.

**Keeping your account safe**

- Use a password you don't use anywhere else.
- Never share your password. Dhow staff will never ask for it.
- Sign out on shared computers from the menu under your name.
- Too many failed sign-ins in a short time are blocked for a few minutes to protect you.
`,
  },
  {
    slug: "your-data", audience: "member", section: "Account and security",
    title: "Your data and privacy",
    summary: "How your information is stored and your rights.",
    body: `
- Documents are kept in private storage. Only your team and Dhow reviewers can open them.
- KRA PINs are encrypted.
- Access to sensitive records is logged.

Under Kenya's Data Protection Act, 2019 you can ask to see, correct or delete your data. Email hello@dhowpartners.com.

Read the full [privacy policy](/privacy).
`,
  },

  // ================================================================== staff
  {
    slug: "workspace-and-roles", audience: "staff", section: "Getting started",
    title: "The workspace and staff roles",
    summary: "What each role can do, and how to give someone access.",
    body: `
The staff workspace is at **/admin**. What you see depends on your role:

- **Reviewer**: verification reviews, companies, opportunities, leads, clients, partners, projects.
- **Finance**: everything a reviewer can do, plus **Finance** (invoices, payments and partner bills).
- **Admin**: everything, plus setting company plans and managing staff roles.

**Giving someone access (admins)**

1. Ask them to create an account first, at **Create account**.
2. Go to **Staff and roles**, enter their email, choose a role and click **Save role**.
3. To remove access, choose **Remove staff access**. You can't remove your own admin role.

Roles are enforced by the database itself, not only by the menu, so hiding a link never exposes data.
`,
  },
  {
    slug: "dashboard", audience: "staff", section: "Getting started",
    title: "The staff dashboard",
    summary: "What the numbers on the dashboard mean.",
    body: `
- **Net position** = (money received + money clients owe us) − (money paid out + money we owe partners).
- **Owed to us**: unpaid balances on sent, part-paid and overdue invoices.
- **Bills to pay**: expenses we haven't paid yet (rent, fees, salaries, partner bills).
- **Open pipeline**: the estimated value of leads that are still open.

Below that you'll find monthly income, your calendar for the week, your open tasks and verifications waiting for review. Finance figures show as zero for reviewers.
`,
  },
  {
    slug: "review-verifications", audience: "staff", section: "Members",
    title: "Review a verification",
    summary: "Check documents and approve or reject a company.",
    body: `
1. Go to **Verification reviews**. The **To review** tab lists companies waiting.
2. Open a request. You'll see the company's details, the automatic check result (for paid requests), the payment and the uploaded documents.
3. Open each document and mark it **OK** or **Reject**.
4. Choose **Verify** or **Reject** and add a note. The note is sent to the company, so write it for them.

**Verify** badges the company for 12 months and locks its registration details. **Reject** emails the company your note so they can fix the problem and try again.

**Check before verifying:** the name and registration number on the CR12 or certificate match the profile, the KRA PIN certificate is for the same company, and the documents are legible and current.
`,
  },
  {
    slug: "member-companies", audience: "staff", section: "Members",
    title: "Companies and plans",
    summary: "Find a company and change its plan.",
    body: `
**Companies** lists every company on Dhow with its sector, join date, verification status and storage used. Search by name at the top.

Admins can change a company's plan with the drop-down and **Set**. The plan controls storage: Free 50 MB (500 MB once verified), Starter 500 MB, Growth 2 GB, Market Entry 10 GB.

Plans are not billed automatically. Agree billing with the client, record their invoices in **Finance**, then set the plan here.
`,
  },
  {
    slug: "post-opportunities", audience: "staff", section: "Members",
    title: "Post opportunities and handle applications",
    summary: "Publish RFPs, grants and events, then update applicants.",
    body: `
**Post one**

1. Go to **Opportunities** and fill in **Post an opportunity**: title, kind, deadline, source, location and a link to the original.
2. Write a short **Summary** (shown in the list) and the **Full details** (Markdown).
3. Tick **Verified companies only** if only Dhow Verified companies may apply.
4. Tick **Published** to make it live. Leave it unticked to save a draft.

Click an opportunity in the list to edit it.

**Handle applications**

Open an opportunity to see its applications. For each, choose **Shortlisted**, **Won** or **Lost**, add an optional note to the company and click **Update**. Owners and admins of that company get an email and SMS.

Companies with an unsent draft application get a reminder three days before the deadline.
`,
  },
  {
    slug: "leads-and-clients", audience: "staff", section: "Clients and work",
    title: "Leads and clients",
    summary: "Track leads from first contact to client.",
    body: `
**Leads** is a board with four open stages: *New*, *Contacted*, *Call booked* and *Plan sent*.

- Add a lead with **Add lead**. Give it an estimated value and a next step with a date. Overdue next steps turn red.
- Move a lead with the stage drop-down and **Move**.
- When you win it, click **Won → client**. A client record is created from the lead and the lead is marked won.

**Clients** lists everyone you work for. Click a name to edit it, add **Contacts**, and see their projects and invoices. **New invoice** on a client starts an invoice for them.

**Partners** are the firms you deliver with or that refer work to you. Keep their status (*Vetting*, *Approved*, *Paused*, *Rejected*) and commission terms up to date.
`,
  },
  {
    slug: "projects-and-tasks", audience: "staff", section: "Clients and work",
    title: "Projects and tasks",
    summary: "Run client work on the project board.",
    body: `
**Projects** is a board with four columns: *To do*, *In progress*, *Review* and *Done*.

- Create a project with **Create project**: client, fee, dates, status and priority.
- Move it with the status drop-down and **Move**. Overdue due dates turn red.
- Add tasks with **Add a task** and link them to a project. Tick a task's circle to mark it done.

Your open tasks also appear on the staff dashboard.
`,
  },
  {
    slug: "invoices-and-payments", audience: "staff", section: "Finance",
    title: "Invoices and payments",
    summary: "Create, send and get paid on invoices.",
    body: `
**Create an invoice**

1. Go to **Finance → New invoice** (or **New invoice** on a client).
2. Choose the client. Choosing a project fills in its fee as the first line.
3. Add items, check the dates and VAT (16% by default) and read the live preview.
4. Click **Create invoice**. It's saved as a draft with the next invoice number.

**Send it:** open the invoice and click **Send to client**. The client gets an email with the PDF attached. The client needs an email address on their record. **Download PDF** gives you the same file.

**Record a payment:** use **Record payment** with the amount, date, method (M-Pesa, I&M Bank, Cash or Other) and reference. The status changes to *Part paid* or *Paid* automatically.

**Cancel:** you can cancel an invoice that has no payments. Cancelled invoices don't count in the totals. Unpaid invoices past their due date are marked *Overdue* every night.
`,
  },
  {
    slug: "partner-bills", audience: "staff", section: "Finance",
    title: "Partner bills and net position",
    summary: "Record what we owe partners so the net position is true.",
    body: `
Go to **Finance → Partner bills**.

- **Add a bill** for anything we owe a partner or supplier: description, partner, project, amount and due date.
- When you pay, enter the amount next to the bill and click **Pay**. Part payments are fine. The bill shows *Part paid* until it's cleared.

The top of the Finance page shows: **Net position** = (received + clients owe us) − (paid out + we owe partners). Keeping bills up to date is what makes that number honest.
`,
  },
  {
    slug: "calendar", audience: "staff", section: "Company",
    title: "Connect Google and Outlook calendars",
    summary: "See meetings from both calendars in the workspace.",
    body: `
You can connect a **Google Calendar** and an **Outlook / Microsoft 365** calendar. Events from both appear together.

1. Go to **Calendar**.
2. Click **Connect** on the Google card or the Outlook card, and sign in with the account whose calendar you want, for example the company Gmail or *hello@dhowpartners.com*.
3. Allow Dhow to **read** your calendar. Dhow never changes your events.

You'll see the next two weeks, colour-coded by calendar, and this week appears on your dashboard. Meetings with a video link show a **Join** button.

Click **Disconnect** on a card to remove that calendar at any time. Each person connects their own calendars.
`,
  },
];

export const memberArticles = ARTICLES.filter((a) => a.audience === "member");
export const staffArticles = ARTICLES.filter((a) => a.audience === "staff");

export function sectionsOf(list: HelpArticle[]) {
  const order: string[] = [];
  for (const a of list) if (!order.includes(a.section)) order.push(a.section);
  return order.map((s) => ({ section: s, articles: list.filter((a) => a.section === s) }));
}
