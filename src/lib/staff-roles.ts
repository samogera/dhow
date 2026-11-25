import type { StaffRole } from "@/lib/types";

// What each staff role can do. Shown on the Team page and in the invite email, so they always match.
export const STAFF_ROLES: { value: StaffRole; label: string; note: string; can: string[]; cannot: string[] }[] = [
  {
    value: "employee", label: "Employee",
    note: "Adds and updates clients, leads, projects and tasks. Can't delete, change the Dhow profile or see money. Finished tasks go to someone else to check.",
    can: ["Add and update clients, leads, partners and projects", "Work on your tasks and send them for review when done", "Use the calendar, ideas and help guides"],
    cannot: ["Delete records", "See invoices, payments or bills", "Change the Dhow profile, plans or staff access"],
  },
  {
    value: "reviewer", label: "Reviewer",
    note: "Reviews documents and verifications, runs clients, leads, partners and projects.",
    can: ["Everything an employee can do", "Review member documents and business verifications", "Check and approve other people's finished tasks"],
    cannot: ["See invoices, payments or bills", "Change the Dhow profile, plans or staff access"],
  },
  {
    value: "finance", label: "Finance",
    note: "Everything a reviewer can do, plus invoices, payments and bills.",
    can: ["Everything a reviewer can do", "Create and send invoices, record payments", "Manage bills and see the finance overview"],
    cannot: ["Change the Dhow profile, plans or staff access"],
  },
  {
    value: "admin", label: "Director / owner",
    note: "Everything: deleting, the Dhow profile, money, plans and staff roles.",
    can: ["Everything in the workspace, including money", "Delete records", "Change the Dhow profile, plans, discounts and who has access"],
    cannot: [],
  },
];

export const roleInfo = (r: string) => STAFF_ROLES.find((x) => x.value === r) ?? STAFF_ROLES[0];
