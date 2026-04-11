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
      .query("evidences")
      .withIndex("by_sample", (q) => q.eq("sampleId", args.sampleId))
      .order("desc")
      .collect();
  },
});

export const createMetadata = mutation({
  args: {
    sampleId: v.id("samples"),
    fileName: v.string(),
    fileType: v.string(),
    fileUrl: v.optional(v.string()),
    dropboxPath: v.optional(v.string()),
    dataUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const id = await ctx.db.insert("evidences", {
      sampleId: args.sampleId,
      uploaderId: user._id,
      uploaderName: user.name ?? user.email ?? "사용자",
      fileName: args.fileName,
      fileType: args.fileType,
      fileUrl: args.fileUrl,
      dropboxPath: args.dropboxPath,
      dataUrl: args.dataUrl,
      storageType: args.dropboxPath ? "DROPBOX" : args.dataUrl ? "INLINE" : "EXTERNAL",
      createdAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const deleteEvidence = mutation({
  args: {
    id: v.id("evidences"),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
