import { v } from "convex/values";

export const roleValues = [
  "ADMIN",
  "TESTER",
  "TECH_MGR",
  "QUAL_MGR",
  "PENDING",
  "GUEST",
  "RESIGNED",
  "MANAGER",
  "CLIENT",
] as const;

export const accountStatusValues = ["ACTIVE", "PENDING", "RESIGNED"] as const;

export const sampleStatusValues = [
  "RECEIVED",
  "QUOTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "DISPOSED",
  "APPROVAL_REQUESTED",
  "REVISING",
  "APPROVED",
] as const;

export const testStatusValues = [
  "PENDING",
  "READY",
  "IN_PROGRESS",
  "REVIEW",
  "APPROVED",
  "REJECTED",
] as const;

export const reportStorageValues = ["DROPBOX", "INLINE", "EXTERNAL"] as const;

export const invoiceStatusValues = ["DRAFT", "SENT", "PAID"] as const;

export const roleValidator = v.union(...roleValues.map((value) => v.literal(value)));
export const accountStatusValidator = v.union(
  ...accountStatusValues.map((value) => v.literal(value)),
);
export const sampleStatusValidator = v.union(
  ...sampleStatusValues.map((value) => v.literal(value)),
);
export const testStatusValidator = v.union(
  ...testStatusValues.map((value) => v.literal(value)),
);
export const reportStorageValidator = v.union(
  ...reportStorageValues.map((value) => v.literal(value)),
);
export const invoiceStatusValidator = v.union(
  ...invoiceStatusValues.map((value) => v.literal(value)),
);

export type Role = (typeof roleValues)[number];
export type AccountStatus = (typeof accountStatusValues)[number];
export type SampleStatus = (typeof sampleStatusValues)[number];
export type TestStatus = (typeof testStatusValues)[number];
