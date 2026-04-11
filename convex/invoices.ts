import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

import { requireRoles, requireUser } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const invoices = await ctx.db.query("invoices").collect();
    return await Promise.all(
      invoices.map(async (invoice) => ({
        ...invoice,
        sample: await ctx.db.get(invoice.sampleId),
      })),
    );
  },
});

export const upsert = mutation({
  args: {
    sampleId: v.id("samples"),
    invoiceNo: v.optional(v.string()),
    items: v.array(
      v.object({
        title: v.string(),
        unitCost: v.number(),
        qty: v.number(),
        price: v.number(),
      }),
    ),
    subtotal: v.number(),
    discountRate: v.number(),
    discountAmt: v.number(),
    discountType: v.string(),
    vat: v.number(),
    total: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRoles(ctx, ["ADMIN"]);
    const sample = await ctx.db.get(args.sampleId);
    if (!sample) {
      throw new Error("Sample not found");
    }
    const invoiceNo = `${sample.barcode}_견적`;
    const existing = await ctx.db
      .query("invoices")
      .withIndex("by_sample", (q) => q.eq("sampleId", args.sampleId))
      .unique();

    const previousNos = existing?.invoiceNo
      ? existing.previousNos
        ? `${existing.previousNos}, ${existing.invoiceNo}`
        : existing.invoiceNo
      : existing?.previousNos;

    const payload = {
      invoiceNo,
      sampleId: args.sampleId,
      date: Date.now(),
      subtotal: args.subtotal,
      discountRate: args.discountRate,
      discountAmt: args.discountAmt,
      discountType: args.discountType || "PERCENT",
      vat: args.vat,
      total: args.total,
      previousNos,
      status: "DRAFT" as const,
      items: args.items,
    };

    const invoiceId = existing?._id
      ? (await ctx.db.patch(existing._id, payload), existing._id)
      : await ctx.db.insert("invoices", payload);

    await ctx.db.patch(args.sampleId, { status: "QUOTED" });

    return await ctx.db.get(invoiceId);
  },
});
