import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

import { requireUser } from "./lib/auth";

export const list = query({
  args: {
    sampleId: v.id("samples"),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("consultations")
      .withIndex("by_sample", (q) => q.eq("sampleId", args.sampleId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    sampleId: v.id("samples"),
    authorId: v.optional(v.id("users")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const id = await ctx.db.insert("consultations", {
      sampleId: args.sampleId,
      authorId: user._id,
      authorName: user.name ?? user.email ?? "사용자",
      message: args.message,
      history: [],
      createdAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const update = mutation({
  args: {
    id: v.id("consultations"),
    message: v.string(),
    authorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const consultation = await ctx.db.get(args.id);
    if (!consultation) {
      throw new Error("기록을 찾을 수 없습니다.");
    }
    const currentHistory = Array.isArray(consultation.history) ? consultation.history : [];
    await ctx.db.patch(args.id, {
      message: args.message,
      updatedAt: Date.now(),
      history: [
        ...currentHistory,
        {
          message: consultation.message,
          updatedAt: new Date().toISOString(),
          authorId: consultation.authorId,
          authorName: consultation.authorName,
        },
      ],
      authorId: user._id,
      authorName: user.name ?? user.email ?? "사용자",
    });
    return await ctx.db.get(args.id);
  },
});
