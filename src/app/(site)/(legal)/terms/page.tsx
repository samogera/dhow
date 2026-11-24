import type { Metadata } from "next";
import { LegalDoc, type Section } from "@/components/legal-doc";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms that apply when you use Dhow Partners' workspace, member services, partner and client links.",
};

const CO = "Dhow Partners Limited";

const sections: Section[] = [
  {
    id: "about", title: "Who we are and what these terms cover",
    body: [
      `${CO} is a private limited company registered in Kenya under number PVT-MA173YRM, KRA PIN P052595794D, with offices at Office 519, Embassy House, Harambee Avenue, Nairobi (P.O. Box 9422-00200, Nairobi). In these terms "Dhow", "we", "us" and "our" mean ${CO}.`,
      `These terms apply to everyone who uses the Dhow Partners platform at dhowpartners.com and workspace.dhowpartners.com, including its member area, the staff workspace, and the private links we send to partners and clients (together, the "Platform").`,
      "By creating an account, opening a private link, uploading a document, making a payment or otherwise using the Platform, you agree to these terms and to our Privacy Policy. If you use the Platform for a company or other organisation, you confirm that you are authorised to accept these terms for it, and \"you\" includes that organisation.",
      "If you do not agree, please do not use the Platform.",
    ],
  },
  {
    id: "definitions", title: "Definitions",
    body: [{ list: [
      "\"Member\": a company or organisation with a Dhow account, and the people it invites.",
      "\"Partner\": a firm that Dhow works with to deliver services or to which Dhow refers clients, under a separate written agreement.",
      "\"Client\": a person or organisation that buys services from Dhow, including through Dhow's partners.",
      "\"Private link\": a unique web address Dhow sends to a partner or client so they can upload documents, follow progress, pay or leave a review without an account.",
      "\"Content\": anything you submit to the Platform, including documents, information, messages and reviews.",
      "\"Dhow Verified\": the badge described in section 6.",
    ] }],
  },
  {
    id: "eligibility", title: "Eligibility and accounts",
    body: [
      "You must be at least 18 years old and able to enter into a binding contract under Kenyan law to use the Platform.",
      "You must give accurate, current and complete information, and keep it up to date. You are responsible for everything done through your account, so keep your password private, do not share logins, and tell us at once at hello@dhowpartners.com if you suspect someone else has used your account.",
      "Company owners and admins decide who can access their company's workspace and are responsible for the people they invite.",
      "We may refuse, suspend or close an account that we reasonably believe is being used in breach of these terms, for fraud, or in a way that puts other users, partners or Dhow at risk.",
    ],
  },
  {
    id: "services", title: "Our services",
    body: [
      "Through the Platform we help companies set up and grow in Kenya and East Africa. Depending on what you sign up for, this can include company verification, a curated list of opportunities and events, introductions to partner firms, and project, document and payment tools.",
      "Some services are delivered by our partners. Where a partner provides a service, the partner is responsible for that service under its own terms with you, and Dhow is responsible for its own coordination and advice. Dhow may receive a referral fee or commission from a partner for introductions; we will tell you about this if you ask.",
      "Specific work for a client (for example a market-entry project) is governed by the proposal, quotation or engagement letter for that work. If anything in that document conflicts with these terms, that document wins for that work.",
      "We may change, add or remove features of the Platform. We will give reasonable notice of changes that materially reduce a paid service you are using.",
    ],
  },
  {
    id: "opportunities", title: "Opportunities and events",
    body: [
      "We gather grants, programmes, tenders and events from public sources, check them, and publish those we believe are open to businesses or people in Kenya. Each listing names its source and links to the original.",
      "Listings are for information only. Organisers can change or withdraw them at any time, and their own rules decide who is eligible and who is selected. Always read the original call before applying. We are not responsible for an organiser's decisions, deadlines or conduct, and a listing on the Platform is not an endorsement unless we mark it as \"Recommended by Dhow\".",
    ],
  },
  {
    id: "verification", title: "Dhow Verified",
    body: [
      "To be verified, a member uploads its company documents (certificate of incorporation or CR12, and a tax compliance certificate or KRA PIN certificate), pays the verification fee shown on the Platform, and we check the company against the official business registry through our verification provider. Where the automatic check cannot confirm a match, a member of the Dhow team reviews the documents and may ask for more information.",
      "\"Dhow Verified\" means only that the company's registration records matched official sources on the date of the check. It is not a guarantee of the company's performance, financial standing, licences, conduct or suitability for any purpose, and it is not legal, financial or investment advice.",
      "A badge is valid for 12 months from the date of the check unless withdrawn earlier. We may withdraw it at any time if records change, information proves false or incomplete, or a document expires or is revoked. Once verified, a company's registration details are locked so the badge always matches what was checked; contact us to correct them.",
    ],
  },
  {
    id: "fees", title: "Fees, invoices and payment",
    body: [
      "Fees for verification, membership and services are shown on the Platform or in your quotation or invoice. Unless stated otherwise, amounts are in Kenya Shillings and exclude VAT, which is added where it applies.",
      "You can pay by bank transfer, M-Pesa or Airtel Money paybill, or card through our payment provider. Payments made through a payment provider are also subject to that provider's terms. We never see your card details or M-Pesa PIN.",
      "Invoices are due by the date shown on them. We may pause work on an account with overdue invoices after giving notice.",
      "The verification fee pays for the check, so it is not refundable once the check has started, whatever the result. If you are charged twice for the same item, or charged for something we did not provide, we will refund the extra amount once confirmed. Other refunds follow the quotation or engagement letter for the work, and the Consumer Protection Act, 2012 where it applies.",
      "Where the law requires a client or partner to withhold tax from a payment to Dhow, please send us the withholding certificate.",
    ],
  },
  {
    id: "links", title: "Partner, client and investor links",
    body: [
      "Private links let partners upload documents, clients follow their projects, pay invoices and leave reviews, investors see companies and respond to introduction requests, and anyone we invite leave a review, without an account. Anyone holding a link can use it, so keep it private and do not forward it. Tell us if a link has been shared by mistake and we will replace it; the old link then stops working.",
      "Introductions to investors are not investment advice, and Dhow does not arrange, recommend or guarantee any investment. Investors and companies do their own checks and make their own decisions. Company information shown to investors comes from the company and our verification, and Dhow is not responsible for decisions made on it.",
      "When you upload through a link, you confirm that you are authorised to share those documents with Dhow and that they are genuine and current.",
      "Reviews must be honest and based on your own experience. Do not post anything false, offensive, or that reveals someone else's personal or confidential information. We may decline or remove reviews that break these rules. We publish a client's review outside the Platform only if the client agreed to that when submitting it.",
    ],
  },
  {
    id: "content", title: "Your content",
    body: [
      "You keep ownership of your Content. You give Dhow a non-exclusive, royalty-free licence to store, copy, process and display your Content as needed to run the Platform, deliver the services you ask for, meet legal duties and, for reviews you allow us to publish, to show them publicly.",
      "You are responsible for your Content. You confirm that you have the right to submit it, that it is accurate, and that it does not infringe anyone's rights or break any law.",
      "We may remove Content that we reasonably believe breaks these terms or the law.",
    ],
  },
  {
    id: "acceptable-use", title: "Acceptable use",
    body: [
      "You must not:",
      { list: [
        "upload false, forged or altered documents, or impersonate any person or company;",
        "use the Platform for fraud, money laundering, terrorist financing, sanctions evasion or any other unlawful purpose;",
        "try to access accounts, data or parts of the Platform you are not permitted to use, or test, scan or probe its security without our written permission;",
        "upload viruses or harmful code, or interfere with or overload the Platform;",
        "scrape, copy or resell the Platform or its listings, except to share a single listing with a colleague;",
        "use other users' or partners' information for unsolicited marketing or any purpose other than the one for which it was shared.",
      ] },
      "Misuse of computer systems is an offence under the Computer Misuse and Cybercrimes Act, 2018, and we may report it to the authorities.",
    ],
  },
  {
    id: "ip", title: "Our intellectual property",
    body: [
      "The Platform, its design, software, text, logos and the Dhow Partners and Dhow Verified names and marks belong to Dhow or our licensors. You may not copy, modify or use them except as these terms allow.",
      "A verified member may show the Dhow Verified badge while its badge is valid, only for the verified company, and only in a way that does not suggest Dhow endorses more than section 6 describes.",
    ],
  },
  {
    id: "confidentiality", title: "Confidentiality",
    body: [
      "Each of us will keep confidential any non-public business information the other shares through the Platform, use it only for the purpose it was shared, and share it only with people who need it for that purpose and are bound to keep it confidential. This does not apply to information that is public through no fault of the receiving party, already lawfully known to it, or that the law or a court requires to be disclosed.",
    ],
  },
  {
    id: "privacy", title: "Personal data",
    body: [
      "We handle personal data in line with the Data Protection Act, 2019 and our Privacy Policy, which explains what we collect, why, who we share it with and your rights. Where you give us personal data about other people (for example your directors or staff), you confirm that you are allowed to do so and that you have told them how it will be used.",
    ],
  },
  {
    id: "third-parties", title: "Third-party services and links",
    body: [
      "The Platform relies on third-party services such as hosting, storage, email, SMS, payments and the business registry, and links to third-party websites. We choose these providers carefully, but we are not responsible for third-party websites or for services we do not control. A third party's own terms apply when you use its service directly.",
    ],
  },
  {
    id: "availability", title: "Availability and changes",
    body: [
      "We work to keep the Platform available and secure, but we do not promise it will always be available, uninterrupted or error-free. We may need to suspend it for maintenance, security or reasons outside our control. Please keep your own copies of important documents.",
    ],
  },
  {
    id: "liability", title: "Our responsibility to you",
    body: [
      "Nothing in these terms limits any liability that cannot be limited under Kenyan law, including for fraud, or for death or personal injury caused by negligence, or any rights you have as a consumer under the Consumer Protection Act, 2012.",
      "Subject to that, the Platform and the Dhow Verified badge are provided \"as is\". To the extent the law allows, we are not liable for indirect or consequential loss, loss of profit, revenue, business, opportunity or data, or for decisions you or others make in reliance on a listing or a badge.",
      "Subject to the above, our total liability to you for all claims arising from the Platform in any 12-month period is limited to the total fees you paid to Dhow in that period, or KSh 50,000 if you paid nothing.",
      "Where a partner provides a service to you, the partner is responsible for it. We will help you raise and resolve any complaint with the partner.",
    ],
  },
  {
    id: "indemnity", title: "Your responsibility to us",
    body: [
      "You will compensate Dhow for losses, claims and reasonable costs (including legal fees) arising from your breach of these terms, false or unlawful Content you submit, or your misuse of the Platform, except to the extent the loss was caused by Dhow.",
    ],
  },
  {
    id: "ending", title: "Suspension and closing your account",
    body: [
      "You may close your account at any time from Settings, or by writing to hello@dhowpartners.com. Company owners can delete their company's page.",
      "We may suspend or close an account, withdraw a badge, or disable a private link if you seriously or repeatedly break these terms, if required by law, or to protect other users, partners or the Platform. Where possible we will tell you why and give you a chance to put things right first.",
      "When an account closes, fees already earned remain payable, and we keep or delete data as set out in our Privacy Policy. Sections that by their nature should continue (for example fees, confidentiality, liability and disputes) continue to apply.",
    ],
  },
  {
    id: "changes", title: "Changes to these terms",
    body: [
      "We may update these terms from time to time. The date at the top shows the latest version. For changes that materially affect your rights, we will tell members by email or on the Platform at least 14 days before they take effect. If you keep using the Platform after that, the new terms apply. If you do not agree, you may close your account.",
    ],
  },
  {
    id: "law", title: "Law, complaints and disputes",
    body: [
      "These terms are governed by the laws of Kenya.",
      "If you have a complaint, write to hello@dhowpartners.com. We will acknowledge it promptly and try to resolve it within 14 days.",
      "If we cannot resolve a dispute by talking within 30 days, either of us may refer it to mediation in Nairobi under the rules of the Nairobi Centre for International Arbitration, or another mediator we both agree on. If mediation does not resolve it, the courts of Kenya have exclusive jurisdiction. Nothing stops either of us from seeking urgent relief from a court.",
    ],
  },
  {
    id: "general", title: "General",
    body: [
      "These terms, the Privacy Policy, and any quotation, engagement letter or partner agreement that applies, are the whole agreement between you and Dhow about the Platform. If any part is found invalid, the rest stays in force. If we do not enforce a right straight away, we can still enforce it later. You may not transfer your rights under these terms without our written consent; we may transfer ours to a company that takes over our business, and will tell you if we do.",
      "Notices to Dhow go to hello@dhowpartners.com or our postal address above. We will send notices to the email address on your account.",
    ],
  },
  {
    id: "contact", title: "Contact us",
    body: [`${CO}, Office 519, Embassy House, Harambee Avenue, P.O. Box 9422-00200, Nairobi, Kenya. Email hello@dhowpartners.com. Phone +254 716 688 988.`],
  },
];

export default function Terms() {
  return (
    <LegalDoc title="Terms of use" updated="24 November 2026" sections={sections} intro={[
      "Please read these terms carefully. They explain how you can use Dhow Partners, what we do for you, what we ask of you, and what happens if something goes wrong.",
    ]} />
  );
}
