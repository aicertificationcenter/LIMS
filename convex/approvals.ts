import { mutation } from "./_generated/server";
import { v } from "convex/values";

import { requireRoles } from "./lib/auth";
import type { MutationCtx } from "./_generated/server";

async function generateFormalBarcode(
  ctx: MutationCtx,
  sample: { testType?: string; formalBarcode?: string },
) {
  const yy = String(new Date().getFullYear()).slice(2);
  const prefix = sample.testType === "KOLAS 시험" ? `KAIC-${yy}-K` : `KAIC-${yy}-T`;
  const samples = await ctx.db.query("samples").collect();
  const count = samples.filter((row: { formalBarcode?: string }) =>
    row.formalBarcode?.startsWith(prefix),
  ).length;
  return `${prefix}${String(count + 1).padStart(3, "0")}-0`;
}

export const process = mutation({
  args: {
    id: v.id("samples"),
    actionType: v.union(v.literal("GAPJI"), v.literal("EULJI")),
    isApproved: v.boolean(),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRoles(ctx, ["ADMIN", "TECH_MGR", "QUAL_MGR"]);
    const sample = await ctx.db.get(args.id);
    if (!sample) {
      throw new Error("접수 건을 찾을 수 없습니다.");
    }

    const test = await ctx.db
      .query("tests")
      .withIndex("by_sample", (q) => q.eq("sampleId", args.id))
      .unique();

    const patch: Record<string, unknown> = {};
    let notificationMessage = "";

    if (args.isApproved) {
      if (args.actionType === "GAPJI") {
        patch.gapjiApproved = true;
        patch.gapjiRejection = undefined;
        notificationMessage = `[결재 완료] ${sample.barcode} 접수 건의 갑지가 승인되었습니다.`;
      } else {
        patch.euljiApproved = true;
        patch.euljiRejection = undefined;
        notificationMessage = `[결재 완료] ${sample.barcode} 접수 건의 을지가 승인되었습니다.`;
      }

      const willGapjiBeApproved =
        args.actionType === "GAPJI" ? true : sample.gapjiApproved;
      const willEuljiBeApproved =
        args.actionType === "EULJI" ? true : sample.euljiApproved;

      if (
        willGapjiBeApproved &&
        willEuljiBeApproved &&
        !["APPROVED", "COMPLETED"].includes(sample.status)
      ) {
        patch.status = "APPROVED";
        patch.formalBarcode = sample.formalBarcode ?? (await generateFormalBarcode(ctx, sample));
        notificationMessage = `[최종 결재 완료] ${sample.barcode} 접수 건이 모두 승인되어 정식 성적서 번호가 발급되었습니다.`;
      }
    } else {
      if (!args.rejectionReason?.trim()) {
        throw new Error("반려 사유를 입력해주세요.");
      }
      if (args.actionType === "GAPJI") {
        patch.gapjiApproved = false;
        patch.gapjiRejection = args.rejectionReason;
        notificationMessage = `[갑지 반려] ${sample.barcode} 접수 건의 갑지가 반려되었습니다. 사유를 확인해주세요.`;
      } else {
        patch.euljiApproved = false;
        patch.euljiRejection = args.rejectionReason;
        notificationMessage = `[을지 반려] ${sample.barcode} 접수 건의 을지가 반려되었습니다. 사유를 확인해주세요.`;
      }
      patch.status = "REVISING";

      await ctx.db.insert("consultations", {
        sampleId: args.id,
        authorName: "관리자 (Admin)",
        message: `${args.actionType === "GAPJI" ? "[갑지 반려]" : "[을지 반려]"} ${args.rejectionReason}`,
        history: [],
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(args.id, patch);
    const updated = await ctx.db.get(args.id);

    if (test?.testerId) {
      await ctx.db.insert("notifications", {
        userId: test.testerId,
        message: notificationMessage,
        read: false,
        createdAt: Date.now(),
      });
    }

    return {
      id: updated?._id ?? args.id,
      status: updated?.status ?? sample.status,
      barcode: updated?.barcode ?? sample.barcode,
    };
  },
});
