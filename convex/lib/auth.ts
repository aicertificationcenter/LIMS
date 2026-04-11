import { getAuthUserId } from "@convex-dev/auth/server";

import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { Doc } from "../_generated/dataModel";
import { api } from "../_generated/api";
import type { Role } from "./validators";

type AuthCtx = QueryCtx | MutationCtx | ActionCtx;

export async function getCurrentUser(ctx: AuthCtx): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  if ("db" in ctx) {
    return await ctx.db.get(userId);
  }
  return await ctx.runQuery(api.users.byIdInternal, { id: userId });
}

export async function requireUser(ctx: AuthCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

export async function requireRoles(ctx: AuthCtx, roles: Role[]) {
  const user = await requireUser(ctx);
  if (!roles.includes(user.role as Role)) {
    throw new Error("Forbidden");
  }
  if (user.status === "RESIGNED" || user.role === "RESIGNED") {
    throw new Error("Account is disabled");
  }
  return user;
}

export function ensureSameUserOrManager(
  user: { _id: Id<"users">; role: string },
  targetUserId: Id<"users">,
) {
  if (
    user._id !== targetUserId &&
    !["ADMIN", "TECH_MGR", "QUAL_MGR"].includes(user.role)
  ) {
    throw new Error("Forbidden");
  }
}
