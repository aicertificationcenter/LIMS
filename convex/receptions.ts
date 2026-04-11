import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

import { mapSample } from "./lib/mappers";
import { requireRoles, requireUser } from "./lib/auth";
import { splitExtraPayload } from "./lib/sampleData";
import { sampleStatusValidator } from "./lib/validators";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

async function generateReceptionBarcode(ctx: MutationCtx) {
  const yy = String(new Date().getFullYear()).slice(2);
  const prefix = `KAIC-${yy}-`;
  const samples = await ctx.db.query("samples").collect();
  const count = samples.filter((sample: { barcode: string }) =>
    sample.barcode.startsWith(prefix),
  ).length;
  return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

async function ensureDefaultEquipment(ctx: MutationCtx) {
  const equipment = await ctx.db.query("equipment").first();
  if (equipment) {
    return equipment;
  }
  const id = await ctx.db.insert("equipment", {
    name: "기본 시험 장비",
    status: "AVAILABLE",
    lastCalibration: Date.now(),
    nextCalibration: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });
  const created = await ctx.db.get(id);
  if (!created) {
    throw new Error("기본 장비 생성에 실패했습니다.");
  }
  return created;
}

async function performUpdateDetails(
  ctx: MutationCtx,
  args: {
    id: Id<"samples">;
    testerId?: Id<"users">;
    status?: Doc<"samples">["status"];
    testStartDate?: string;
    testEndDate?: string;
    testLocation?: string;
    testType?: string;
    testAddress?: string;
    reportPdfUrl?: string;
    reportDropboxPath?: string;
    reportFileName?: string;
    consultation?: string;
    testProduct?: string;
    testPurpose?: string;
    testMethod?: string;
    extra?: string;
  },
) {
  const actor = await requireUser(ctx);
  const sample = await ctx.db.get(args.id);
  if (!sample) {
    throw new Error("접수 건을 찾을 수 없습니다.");
  }

  if (
    args.testerId &&
    !["ADMIN", "TECH_MGR", "QUAL_MGR"].includes(actor.role) &&
    actor._id !== args.testerId
  ) {
    throw new Error("Forbidden");
  }

  const extra = splitExtraPayload(args.extra);
  let testerBarcode = sample.testerBarcode;
  const assignedTester = args.testerId;

  if (assignedTester && !testerBarcode) {
    const tester = await ctx.db.get(assignedTester);
    if (tester) {
      testerBarcode = `${sample.barcode}_${tester.legacyUsername ?? tester._id}`;
    }
  }

  const patch: Record<string, unknown> = {
    testerBarcode,
    testStartDate: args.testStartDate,
    testEndDate: args.testEndDate,
    testLocation: args.testLocation,
    testType: args.testType,
    testAddress: args.testAddress,
    consultation: args.consultation,
    testProduct: args.testProduct,
    testPurpose: args.testPurpose,
    testMethod: args.testMethod,
    reportFileUrl: args.reportPdfUrl,
    reportDropboxPath: args.reportDropboxPath,
    reportFileName: args.reportFileName,
    reportStorageType: args.reportPdfUrl
      ? args.reportDropboxPath
        ? "DROPBOX"
        : args.reportPdfUrl.startsWith("data:")
          ? "INLINE"
          : "EXTERNAL"
      : sample.reportStorageType,
    clientAddress: extra.clientAddress ?? sample.clientAddress,
    notes: extra.notes ?? sample.notes,
    reportData:
      Object.keys(extra.reportData).length > 0 ? extra.reportData : sample.reportData,
  };

  if (args.status) {
    patch.status = args.status;
  } else if (assignedTester && sample.status === "RECEIVED") {
    patch.status = "ASSIGNED";
  }

  await ctx.db.patch(args.id, patch);

  if (assignedTester) {
    const existingTest = await ctx.db
      .query("tests")
      .withIndex("by_sample", (q) => q.eq("sampleId", args.id))
      .unique();
    if (existingTest) {
      await ctx.db.patch(existingTest._id, { testerId: assignedTester });
    } else {
      const equipment = await ensureDefaultEquipment(ctx);
      await ctx.db.insert("tests", {
        sampleId: args.id,
        testerId: assignedTester,
        equipmentId: equipment._id,
        isEnvValid: false,
        startTime: Date.now(),
        status: "IN_PROGRESS",
      });
    }

    const updatedSample = await ctx.db.get(args.id);
    await ctx.db.insert("notifications", {
      userId: assignedTester,
      message: `[시험 배정] ${updatedSample?.clientId ?? sample.clientId} 기업의 새로운 시험 업무가 배정되었습니다. (접수번호: ${updatedSample?.barcode ?? sample.barcode})`,
      read: false,
      createdAt: Date.now(),
    });
  }

  const updated = await ctx.db.get(args.id);
  if (!updated) {
    throw new Error("접수 업데이트에 실패했습니다.");
  }
  return {
    id: updated._id,
    barcode: updated.barcode,
    clientId: updated.clientId,
    status: updated.status,
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const samples = await ctx.db
      .query("samples")
      .withIndex("receivedAt", (q) => q)
      .order("desc")
      .collect();
    return await Promise.all(samples.map((sample) => mapSample(ctx, sample)));
  },
});

export const create = mutation({
  args: {
    client: v.string(),
    clientName: v.string(),
    phone: v.string(),
    email: v.string(),
    bizNo: v.optional(v.string()),
    target: v.string(),
    extra: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRoles(ctx, ["ADMIN"]);
    const extra = splitExtraPayload(args.extra);
    const id = await ctx.db.insert("samples", {
      barcode: await generateReceptionBarcode(ctx),
      clientId: args.client,
      clientName: args.clientName,
      phone: args.phone,
      email: args.email,
      bizNo: args.bizNo,
      target: args.target,
      clientAddress: extra.clientAddress,
      notes: extra.notes,
      reportData: Object.keys(extra.reportData).length > 0 ? extra.reportData : undefined,
      status: "RECEIVED",
      gapjiApproved: false,
      euljiApproved: false,
      receivedAt: Date.now(),
    });
    const sample = await ctx.db.get(id);
    if (!sample) {
      throw new Error("접수 등록에 실패했습니다.");
    }
    return {
      id: sample._id,
      barcode: sample.barcode,
      clientId: sample.clientId,
      status: sample.status,
    };
  },
});

export const updateDetails = mutation({
  args: {
    id: v.id("samples"),
    testerId: v.optional(v.id("users")),
    status: v.optional(sampleStatusValidator),
    testStartDate: v.optional(v.string()),
    testEndDate: v.optional(v.string()),
    testLocation: v.optional(v.string()),
    testType: v.optional(v.string()),
    testAddress: v.optional(v.string()),
    reportPdfUrl: v.optional(v.string()),
    reportDropboxPath: v.optional(v.string()),
    reportFileName: v.optional(v.string()),
    consultation: v.optional(v.string()),
    testProduct: v.optional(v.string()),
    testPurpose: v.optional(v.string()),
    testMethod: v.optional(v.string()),
    extra: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await performUpdateDetails(ctx, args);
  },
});

export const assignTester = mutation({
  args: {
    id: v.id("samples"),
    testerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await performUpdateDetails(ctx, args);
  },
});
