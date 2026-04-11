import { query } from "./_generated/server";
import { v } from "convex/values";

import { getCurrentUser, ensureSameUserOrManager } from "./lib/auth";
import { getConsultationsBySampleId, getEvidencesBySampleId } from "./lib/mappers";
import { serializeExtra } from "./lib/sampleData";

export const listMyTasks = query({
  args: {
    testerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Authentication required");
    }
    ensureSameUserOrManager(user, args.testerId);

    const tests = await ctx.db
      .query("tests")
      .withIndex("by_tester", (q) => q.eq("testerId", args.testerId))
      .order("desc")
      .collect();

    return await Promise.all(
      tests.map(async (test) => {
        const sample = await ctx.db.get(test.sampleId);
        if (!sample) {
          return null;
        }
        const [consultations, evidences] = await Promise.all([
          getConsultationsBySampleId(ctx, sample._id),
          getEvidencesBySampleId(ctx, sample._id),
        ]);

        return {
          id: sample._id,
          barcode: sample.barcode,
          testerBarcode: sample.testerBarcode ?? undefined,
          status: sample.status,
          client: sample.clientId,
          clientName: sample.clientName ?? undefined,
          phone: sample.phone ?? undefined,
          email: sample.email ?? undefined,
          content: sample.content ?? undefined,
          target: sample.target ?? undefined,
          extra: serializeExtra(sample),
          consultation: sample.consultation ?? undefined,
          consultations,
          evidences,
          testStartDate: sample.testStartDate ?? undefined,
          testEndDate: sample.testEndDate ?? undefined,
          testLocation: sample.testLocation ?? undefined,
          testType: sample.testType ?? undefined,
          testAddress: sample.testAddress ?? undefined,
          testProduct: sample.testProduct ?? undefined,
          testPurpose: sample.testPurpose ?? undefined,
          testMethod: sample.testMethod ?? undefined,
          reportPdfUrl: sample.reportFileUrl ?? null,
          assignedAt: test.startTime,
          gapjiRejection: sample.gapjiRejection ?? undefined,
          euljiRejection: sample.euljiRejection ?? undefined,
          formalBarcode: sample.formalBarcode ?? undefined,
          gapjiApproved: sample.gapjiApproved,
          euljiApproved: sample.euljiApproved,
        };
      }),
    ).then((rows) => rows.filter(Boolean));
  },
});
