import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

import { getCurrentUser, ensureSameUserOrManager } from "./lib/auth";

export const listUnread = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Authentication required");
    }
    ensureSameUserOrManager(user, args.userId);

    return await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) => q.eq("userId", args.userId).eq("read", false))
      .order("desc")
      .collect();
  },
});

export const markAllRead = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Authentication required");
    }
    ensureSameUserOrManager(user, args.userId);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) => q.eq("userId", args.userId).eq("read", false))
      .collect();
    await Promise.all(
      notifications.map((notification) =>
        ctx.db.patch(notification._id, {
          read: true,
        }),
      ),
    );
    return { success: true };
  },
});
