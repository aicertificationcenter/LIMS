import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { serializeExtra } from "./sampleData";

export async function getInvoiceBySampleId(ctx: QueryCtx, sampleId: Id<"samples">) {
  return await ctx.db
    .query("invoices")
    .withIndex("by_sample", (q) => q.eq("sampleId", sampleId))
    .unique();
}

export async function getTestsBySampleId(ctx: QueryCtx, sampleId: Id<"samples">) {
  const tests = await ctx.db
    .query("tests")
    .withIndex("by_sample", (q) => q.eq("sampleId", sampleId))
    .collect();

  return await Promise.all(
    tests.map(async (test) => {
      const tester = await ctx.db.get(test.testerId);
      const equipment = test.equipmentId ? await ctx.db.get(test.equipmentId) : null;
      return {
        ...test,
        tester: tester ? mapUser(tester) : null,
        equipment,
      };
    }),
  );
}

export async function getConsultationsBySampleId(ctx: QueryCtx, sampleId: Id<"samples">) {
  return await ctx.db
    .query("consultations")
    .withIndex("by_sample", (q) => q.eq("sampleId", sampleId))
    .order("desc")
    .collect();
}

export async function getEvidencesBySampleId(ctx: QueryCtx, sampleId: Id<"samples">) {
  return await ctx.db
    .query("evidences")
    .withIndex("by_sample", (q) => q.eq("sampleId", sampleId))
    .order("desc")
    .collect();
}

export function mapUser(user: Doc<"users">) {
  return {
    id: user._id,
    name: user.name ?? user.email ?? user.legacyUsername ?? "사용자",
    role: user.role,
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    legacyUsername: user.legacyUsername ?? undefined,
    status: user.status,
    createdAt: user.createdAt ?? undefined,
  };
}

export async function mapSample(ctx: QueryCtx, sample: Doc<"samples">) {
  const [invoice, tests, consultations, evidences] = await Promise.all([
    getInvoiceBySampleId(ctx, sample._id),
    getTestsBySampleId(ctx, sample._id),
    getConsultationsBySampleId(ctx, sample._id),
    getEvidencesBySampleId(ctx, sample._id),
  ]);

  return {
    id: sample._id,
    legacyId: sample.legacyId ?? undefined,
    barcode: sample.barcode,
    clientId: sample.clientId,
    clientName: sample.clientName ?? undefined,
    phone: sample.phone ?? undefined,
    email: sample.email ?? undefined,
    content: sample.content ?? undefined,
    consultation: sample.consultation ?? undefined,
    status: sample.status,
    location: sample.location ?? undefined,
    testStartDate: sample.testStartDate ?? undefined,
    testEndDate: sample.testEndDate ?? undefined,
    testLocation: sample.testLocation ?? undefined,
    testType: sample.testType ?? undefined,
    testAddress: sample.testAddress ?? undefined,
    bizNo: sample.bizNo ?? undefined,
    target: sample.target ?? undefined,
    testProduct: sample.testProduct ?? undefined,
    testPurpose: sample.testPurpose ?? undefined,
    testMethod: sample.testMethod ?? undefined,
    extra: serializeExtra(sample),
    testerBarcode: sample.testerBarcode ?? undefined,
    formalBarcode: sample.formalBarcode ?? undefined,
    gapjiApproved: sample.gapjiApproved,
    euljiApproved: sample.euljiApproved,
    gapjiRejection: sample.gapjiRejection ?? undefined,
    euljiRejection: sample.euljiRejection ?? undefined,
    receivedAt: sample.receivedAt,
    reportPdfUrl: sample.reportFileUrl ?? null,
    reportDropboxPath: sample.reportDropboxPath ?? undefined,
    invoice: invoice
      ? {
          ...invoice,
          items: invoice.items,
        }
      : null,
    tests,
    consultations,
    evidences,
  };
}
