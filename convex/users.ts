import { modifyAccountCredentials } from "@convex-dev/auth/server";
import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

import { mapUser } from "./lib/mappers";
import { requireRoles, requireUser } from "./lib/auth";
import { roleValidator } from "./lib/validators";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return mapUser(user);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const users = await ctx.db.query("users").collect();
    return users
      .map(mapUser)
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
  },
});

export const resolveLoginEmail = query({
  args: {
    identifier: v.string(),
  },
  handler: async (ctx, args) => {
    const normalized = args.identifier.trim().toLowerCase();
    const byEmail = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalized))
      .unique();
    if (byEmail?.email) {
      return { email: byEmail.email };
    }

    const byLegacyUsername = await ctx.db
      .query("users")
      .withIndex("legacyUsername", (q) => q.eq("legacyUsername", args.identifier.trim()))
      .unique();
    if (byLegacyUsername?.email) {
      return { email: byLegacyUsername.email };
    }

    return null;
  },
});

export const updateProfile = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRoles(ctx, ["ADMIN"]);
    await ctx.db.patch(args.id, {
      name: args.name,
      email: args.email,
      phone: args.phone,
    });
    const user = await ctx.db.get(args.id);
    if (!user) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }
    return mapUser(user);
  },
});

export const updateRole = mutation({
  args: {
    id: v.id("users"),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    await requireRoles(ctx, ["ADMIN"]);
    const status =
      args.role === "PENDING"
        ? "PENDING"
        : args.role === "RESIGNED"
          ? "RESIGNED"
          : "ACTIVE";
    await ctx.db.patch(args.id, {
      role: args.role,
      status,
    });
    const user = await ctx.db.get(args.id);
    if (!user) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }
    return mapUser(user);
  },
});

export const approvePending = mutation({
  args: {
    id: v.id("users"),
    role: v.optional(roleValidator),
  },
  handler: async (ctx, args) => {
    await requireRoles(ctx, ["ADMIN"]);
    await ctx.db.patch(args.id, {
      role: args.role ?? "TESTER",
      status: "ACTIVE",
    });
    const user = await ctx.db.get(args.id);
    if (!user) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }
    return mapUser(user);
  },
});

export const deleteUser = mutation({
  args: {
    id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRoles(ctx, ["ADMIN"]);
    if (currentUser._id === args.id) {
      throw new Error("현재 로그인한 계정은 삭제할 수 없습니다.");
    }

    const testCount = await ctx.db
      .query("tests")
      .withIndex("by_tester", (q) => q.eq("testerId", args.id))
      .collect();
    if (testCount.length > 0) {
      throw new Error("시험 수행 실적이 있는 사용자는 삭제할 수 없습니다.");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const adminResetPassword = action({
  args: {
    id: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRoles(ctx, ["ADMIN"]);
    const user = await ctx.runQuery(api.users.byIdInternal, { id: args.id });
    if (!user?.email) {
      throw new Error("이메일이 없는 계정은 비밀번호를 재설정할 수 없습니다.");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: {
        id: user.email,
        secret: args.newPassword,
      },
    });

    return { success: true };
  },
});

export const byIdInternal = query({
  args: {
    id: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
