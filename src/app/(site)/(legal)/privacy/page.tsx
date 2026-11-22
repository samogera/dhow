import type { Metadata } from "next";
import { LegalDoc, type Section } from "@/components/legal-doc";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Dhow Partners collects, uses, shares and protects personal data, and your rights under Kenya's Data Protection Act, 2019.",
};

const sections: Section[] = [
  {
    id: "controller", title: "Who is responsible for your data",
    body: [
      "Dhow Partners Limited (company number PVT-MA173YRM), of Office 519, Embassy House, Harambee Avenue, P.O. Box 9422-00200, Nairobi, Kenya, is the data controller for personal data processed through the Dhow Partners platform at dhowpartners.com and workspace.dhowpartners.com (the \"Platform\").",
      "This policy explains how we handle personal data under Kenya's Data Protection Act, 2019 and the Data Protection (General) Regulations, 2021. For any privacy question or request, write to hello@dhowpartners.com with \"Privacy\" in the subject line.",
    ],
  },
  {
    id: "collect", title: "What we collect",
    body: [
      "We collect only what we need for the purposes in section 3.",
      { list: [
        "Account details: name, email address, phone number, password (stored only in scrambled form), role, and the company you belong to.",
        "Company details: company name, registration and BRS number, KRA PIN, registered address and postal code, sector, website, logo and social links, and the names of directors or contacts you give us.",
        "Documents: certificates of incorporation, CR12, tax compliance and KRA PIN certificates, licences, company profiles, agreements and other files you or a partner upload.",
        "Verification results: the outcome of registry checks, dates and reviewer notes.",
        "Payments: amounts, dates, references, the phone number used for M-Pesa, and invoice records. Card and M-Pesa PIN details go directly to the payment provider; we never see or store them.",
        "Work and communications: projects, tasks, notes, leads and messages that Dhow staff record about the work we do with you, and reviews that clients and partners submit.",
        "Technical data: IP address, browser type, the pages you use and error reports, kept to run the Platform securely and to prevent abuse.",
      ] },
      "We do not ask for sensitive personal data such as health information, religion or ethnicity, and ask that you do not upload it. If a document you upload contains it, we use it only as needed to process that document.",
    ],
  },
  {
    id: "use", title: "Why we use it, and our legal basis",
    body: [
      { list: [
        "To create and run your account and provide the services you ask for, including verification, opportunities, partner introductions, projects and invoicing. Basis: performance of our contract with you.",
        "To check company records with the official business registry and decide on the Dhow Verified badge. Basis: our contract with you, and our legitimate interest in keeping the badge trustworthy.",
        "To take payments, issue receipts and keep accounting and tax records. Basis: contract and legal obligation.",
        "To introduce you to a partner firm for a service you want. Basis: your consent or our contract with you; we tell you which partner before we share your details.",
        "To send service messages by email and SMS, such as payment confirmations, verification results and deadline reminders. Basis: contract.",
        "To send news about opportunities and events. Basis: consent, which you can withdraw at any time using the unsubscribe link or by emailing us.",
        "To keep the Platform secure, prevent fraud and misuse, and fix problems. Basis: legitimate interest and legal obligation.",
        "To comply with the law, court orders and lawful requests from authorities. Basis: legal obligation.",
      ] },
      "We do not sell personal data, and we do not use it for automated decisions that have legal or similarly significant effects on you without a person reviewing them. The registry check is automated, but where it cannot confirm a match, a member of our team reviews it.",
    ],
  },
  {
    id: "share", title: "Who we share it with",
    body: [
      "We share personal data only as needed for the purposes above, and with service providers bound by contract to protect it and use it only on our instructions:",
      { list: [
        "Hosting and storage: Vercel (website hosting), Supabase (database and file storage) and Cloudflare (document storage).",
        "Email and SMS: Resend (email delivery) and Africa's Talking (SMS).",
        "Payments: Paystack and Safaricom M-Pesa, and our bank.",
        "Verification: the Business Registration Service and, where enabled, our business-verification provider.",
        "Partner firms you ask to be introduced to, or that deliver part of a service for you, and only the information they need for that work.",
        "Our professional advisers (lawyers, auditors, accountants) under a duty of confidentiality.",
        "Authorities such as the Kenya Revenue Authority, the Office of the Data Protection Commissioner, the police or courts, where the law requires.",
        "A buyer or successor if Dhow's business is sold or reorganised, who must protect your data as this policy describes.",
      ] },
      "Members of your own company workspace can see your company's documents and records. Dhow staff see them only as their role requires.",
    ],
  },
  {
    id: "transfers", title: "Transfers outside Kenya",
    body: [
      "Some of our providers store or process data on servers outside Kenya, for example in the European Union or the United States. Where we transfer personal data outside Kenya, we do so in line with sections 48 to 50 of the Data Protection Act: to providers that give appropriate safeguards for the security and protection of the data, under written contracts, and only as needed for the purposes in this policy.",
    ],
  },
  {
    id: "security", title: "How we protect it",
    body: [
      { list: [
        "Data is encrypted when it travels over the internet, and KRA PINs are encrypted in our database.",
        "Documents are kept in private storage. Downloads use short-lived links that expire within minutes.",
        "Access is limited by role, and each company sees only its own records.",
        "Changes to company, verification, payment and document records are logged.",
        "Private links for partners and clients use long random codes and can be replaced at any time.",
      ] },
      "No system is completely secure. If a breach of personal data is likely to put your rights at risk, we will notify the Data Protection Commissioner within 72 hours of becoming aware of it, as the law requires, and tell affected people without undue delay, with steps they can take.",
    ],
  },
  {
    id: "retention", title: "How long we keep it",
    body: [
      { list: [
        "Account and company details: while your account is open, and up to 12 months after it closes, unless you ask us to delete them sooner.",
        "Verification records: for as long as the badge is valid, then up to 2 years so we can answer questions about past checks.",
        "Invoices, payments and other accounting records: 7 years, as required by Kenyan tax law.",
        "Partner and client documents: for as long as we work together, then up to 2 years unless a contract or the law requires longer.",
        "Technical and error logs: up to 12 months.",
      ] },
      "When data is no longer needed, we delete it or anonymise it so it can no longer identify you.",
    ],
  },
  {
    id: "rights", title: "Your rights",
    body: [
      "Under section 26 of the Data Protection Act, 2019 you have the right to:",
      { list: [
        "be told how your personal data is used;",
        "get a copy of the personal data we hold about you;",
        "have inaccurate or misleading data corrected;",
        "have data deleted where we no longer have a lawful reason to keep it;",
        "object to our use of your data, including for direct marketing;",
        "withdraw consent you have given, without affecting what we did before;",
        "receive your data in a portable format, where the law allows.",
      ] },
      "Many details can be updated directly in your account Settings, and company owners can delete their company page or their account there. For anything else, email hello@dhowpartners.com. We may ask you to confirm your identity before acting. We will respond within the time the law sets and tell you if we cannot fully meet a request, and why (for example where we must keep tax records).",
      "If you are unhappy with how we have handled your data, please contact us first so we can put it right. You also have the right to complain to the Office of the Data Protection Commissioner (odpc.go.ke).",
    ],
  },
  {
    id: "cookies", title: "Cookies",
    body: [
      "We use only the cookies needed to keep you signed in and the Platform secure. We do not use advertising or tracking cookies. If we ever add analytics that need your consent, we will ask first and update this policy.",
    ],
  },
  {
    id: "children", title: "Children",
    body: [
      "The Platform is for businesses and adults. We do not knowingly collect personal data from anyone under 18. If you believe a child has given us personal data, contact us and we will delete it.",
    ],
  },
  {
    id: "changes", title: "Changes to this policy",
    body: [
      "We may update this policy when our services or the law change. The date at the top shows the latest version. We will tell members by email or on the Platform about changes that materially affect how we use personal data.",
    ],
  },
  {
    id: "contact", title: "Contact us",
    body: ["Dhow Partners Limited, Office 519, Embassy House, Harambee Avenue, P.O. Box 9422-00200, Nairobi, Kenya. Email hello@dhowpartners.com (subject: Privacy). Phone +254 716 688 988."],
  },
];

export default function Privacy() {
  return (
    <LegalDoc title="Privacy policy" updated="22 November 2026" sections={sections} intro={[
      "Your trust matters to us. This policy explains, in plain language, what personal data Dhow Partners collects, why, who we share it with, how we protect it, and the rights you have.",
    ]} />
  );
}
