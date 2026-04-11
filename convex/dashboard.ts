import { query } from "./_generated/server";

import { requireRoles } from "./lib/auth";

export const manager = query({
  args: {},
  handler: async (ctx) => {
    await requireRoles(ctx, ["ADMIN", "TECH_MGR", "QUAL_MGR"]);
    const samples = await ctx.db.query("samples").collect();
    const auditLogs = await ctx.db.query("auditLogs").collect();
    const activeSamples = samples.filter((sample) => sample.status !== "COMPLETED").length;
    const testsInProgress = samples.filter((sample) => sample.status === "IN_PROGRESS").length;
    return {
      activeSamples,
      testsInProgress,
      tatAverageDays: 0,
      recentAuditLogs: auditLogs
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5),
    };
  },
});
