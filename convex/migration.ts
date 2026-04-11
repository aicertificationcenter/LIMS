import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { accountStatusValidator, roleValidator } from "./lib/validators";

const ensureMigrationKey = (key: string) => {
  const expected = process.env.MIGRATION_KEY;
  if (!expected || key !== expected) {
    throw new Error("Invalid migration key");
  }
};

export const getUserByEmail = query({
  args: {
    migrationKey: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    ensureMigrationKey(args.migrationKey);
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const getSampleByIdForMigration = query({
  args: {
    id: v.id("samples"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getLegacyMappings = query({
  args: {
    migrationKey: v.string(),
  },
  handler: async (ctx, args) => {
    ensureMigrationKey(args.migrationKey);
    const [users, equipment, samples, tests, testResults, consultations, evidences, notifications, invoices] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("equipment").collect(),
        ctx.db.query("samples").collect(),
        ctx.db.query("tests").collect(),
        ctx.db.query("testResults").collect(),
        ctx.db.query("consultations").collect(),
        ctx.db.query("evidences").collect(),
        ctx.db.query("notifications").collect(),
        ctx.db.query("invoices").collect(),
      ]);
    return {
      users: users.map((row) => ({
        legacyUsername: row.legacyUsername,
        email: row.email,
        id: row._id,
      })),
      equipment: equipment.map((row) => ({ legacyId: row.legacyId, id: row._id })),
      samples: samples.map((row) => ({ legacyId: row.legacyId, id: row._id })),
      tests: tests.map((row) => ({ legacyId: row.legacyId, id: row._id })),
      testResults: testResults.map((row) => ({ legacyId: row.legacyId, id: row._id })),
      consultations: consultations.map((row) => ({ legacyId: row.legacyId, id: row._id })),
      evidences: evidences.map((row) => ({ legacyId: row.legacyId, id: row._id })),
      notifications: notifications.map((row) => ({ legacyId: row.legacyId, id: row._id })),
      invoices: invoices.map((row) => ({ legacyId: row.legacyId, id: row._id })),
    };
  },
});

export const updateImportedUser = mutation({
  args: {
    migrationKey: v.string(),
    id: v.id("users"),
    legacyUsername: v.optional(v.string()),
    role: roleValidator,
    status: accountStatusValidator,
    createdAt: v.number(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    ensureMigrationKey(args.migrationKey);
    await ctx.db.patch(args.id, {
      legacyUsername: args.legacyUsername,
      role: args.role,
      status: args.status,
      createdAt: args.createdAt,
      name: args.name,
      phone: args.phone,
    });
    return await ctx.db.get(args.id);
  },
});

export const upsertEquipment = mutation({
  args: {
    migrationKey: v.string(),
    legacyId: v.string(),
    name: v.string(),
    status: v.string(),
    lastCalibration: v.number(),
    nextCalibration: v.number(),
  },
  handler: async (ctx, args) => {
    ensureMigrationKey(args.migrationKey);
    const existing = await ctx.db
      .query("equipment")
      .withIndex("legacyId", (q) => q.eq("legacyId", args.legacyId))
      .unique();
    const payload = {
      legacyId: args.legacyId,
      name: args.name,
      status: args.status,
      lastCalibration: args.lastCalibration,
      nextCalibration: args.nextCalibration,
    };
    const id = existing?._id
      ? (await ctx.db.patch(existing._id, payload), existing._id)
      : await ctx.db.insert("equipment", payload);
    return await ctx.db.get(id);
  },
});

export const upsertSample = mutation({
  args: {
    migrationKey: v.string(),
    sample: v.any(),
  },
  handler: async (ctx, args) => {
    ensureMigrationKey(args.migrationKey);
    const existing = await ctx.db
      .query("samples")
      .withIndex("legacyId", (q) => q.eq("legacyId", args.sample.legacyId))
      .unique();
    const id = existing?._id
      ? (await ctx.db.patch(existing._id, args.sample), existing._id)
      : await ctx.db.insert("samples", args.sample);
    return await ctx.db.get(id);
  },
});

export const upsertTest = mutation({
  args: {
    migrationKey: v.string(),
    test: v.any(),
  },
  handler: async (ctx, args) => {
    ensureMigrationKey(args.migrationKey);
    const existing = await ctx.db
      .query("tests")
      .withIndex("legacyId", (q) => q.eq("legacyId", args.test.legacyId))
      .unique();
    const id = existing?._id
      ? (await ctx.db.patch(existing._id, args.test), existing._id)
      : await ctx.db.insert("tests", args.test);
    return await ctx.db.get(id);
  },
});

export const upsertTestResult = mutation({
  args: {
    migrationKey: v.string(),
    testResult: v.any(),
  },
  handler: async (ctx, args) => {
    ensureMigrationKey(args.migrationKey);
    const existing = await ctx.db
      .query("testResults")
      .withIndex("legacyId", (q) => q.eq("legacyId", args.testResult.legacyId))
      .unique();
    const id = existing?._id
      ? (await ctx.db.patch(existing._id, args.testResult), existing._id)
      : await ctx.db.insert("testResults", args.testResult);
    return await ctx.db.get(id);
  },
});

export const upsertConsultation = mutation({
  args: {
    migrationKey: v.string(),
    consultation: v.any(),
  },
  handler: async (ctx, args) => {
    ensureMigrationKey(args.migrationKey);
    const existing = await ctx.db
      .query("consultations")
      .withIndex("legacyId", (q) => q.eq("legacyId", args.consultation.legacyId))
      .unique();
    const id = existing?._id
      ? (await ctx.db.patch(existing._id, args.consultation), existing._id)
      : await ctx.db.insert("consultations", args.consultation);
    return await ctx.db.get(id);
  },
});

export const upsertEvidence = mutation({
  args: {
    migrationKey: v.string(),
    evidence: v.any(),
  },
  handler: async (ctx, args) => {
    ensureMigrationKey(args.migrationKey);
    const existing = await ctx.db
      .query("evidences")
      .withIndex("legacyId", (q) => q.eq("legacyId", args.evidence.legacyId))
      .unique();
    const id = existing?._id
      ? (await ctx.db.patch(existing._id, args.evidence), existing._id)
      : await ctx.db.insert("evidences", args.evidence);
    return await ctx.db.get(id);
  },
});

export const upsertNotification = mutation({
  args: {
    migrationKey: v.string(),
    notification: v.any(),
  },
  handler: async (ctx, args) => {
    ensureMigrationKey(args.migrationKey);
    const existing = await ctx.db
      .query("notifications")
      .withIndex("legacyId", (q) => q.eq("legacyId", args.notification.legacyId))
      .unique();
    const id = existing?._id
      ? (await ctx.db.patch(existing._id, args.notification), existing._id)
      : await ctx.db.insert("notifications", args.notification);
    return await ctx.db.get(id);
  },
});

export const upsertInvoice = mutation({
  args: {
    migrationKey: v.string(),
    invoice: v.any(),
  },
  handler: async (ctx, args) => {
    ensureMigrationKey(args.migrationKey);
    const existing = await ctx.db
      .query("invoices")
      .withIndex("legacyId", (q) => q.eq("legacyId", args.invoice.legacyId))
      .unique();
    const id = existing?._id
      ? (await ctx.db.patch(existing._id, args.invoice), existing._id)
      : await ctx.db.insert("invoices", args.invoice);
    return await ctx.db.get(id);
  },
});

export const cleanupQaData = mutation({
  args: {
    migrationKey: v.string(),
  },
  handler: async (ctx, args) => {
    ensureMigrationKey(args.migrationKey);

    const users = await ctx.db.query("users").collect();
    const qaUsers = users.filter(
      (user) =>
        user.email?.includes("qa-") || user.legacyUsername?.startsWith("qa_"),
    );
    const qaUserIds = new Set(qaUsers.map((user) => user._id));

    const samples = await ctx.db.query("samples").collect();
    const qaSamples = samples.filter((sample) =>
      ["QA Client Co", "QA Invoice Co"].includes(sample.clientId),
    );
    const qaSampleIds = new Set(qaSamples.map((sample) => sample._id));

    const tests = await ctx.db.query("tests").collect();
    const qaTests = tests.filter(
      (test) => qaSampleIds.has(test.sampleId) || qaUserIds.has(test.testerId),
    );
    const qaTestIds = new Set(qaTests.map((test) => test._id));

    const testResults = await ctx.db.query("testResults").collect();
    const qaTestResults = testResults.filter((result) => qaTestIds.has(result.testId));

    const consultations = await ctx.db.query("consultations").collect();
    const qaConsultations = consultations.filter((consultation) =>
      qaSampleIds.has(consultation.sampleId),
    );

    const evidences = await ctx.db.query("evidences").collect();
    const qaEvidences = evidences.filter((evidence) =>
      qaSampleIds.has(evidence.sampleId),
    );

    const invoices = await ctx.db.query("invoices").collect();
    const qaInvoices = invoices.filter((invoice) => qaSampleIds.has(invoice.sampleId));

    const notifications = await ctx.db.query("notifications").collect();
    const qaNotifications = notifications.filter((notification) =>
      qaUserIds.has(notification.userId),
    );

    const authAccounts = await ctx.db.query("authAccounts").collect();
    const qaAuthAccounts = authAccounts.filter((account) =>
      qaUserIds.has(account.userId),
    );
    const qaAuthAccountIds = new Set(qaAuthAccounts.map((account) => account._id));

    const authSessions = await ctx.db.query("authSessions").collect();
    const qaAuthSessions = authSessions.filter((session) =>
      qaUserIds.has(session.userId),
    );
    const qaSessionIds = new Set(qaAuthSessions.map((session) => session._id));

    const authRefreshTokens = await ctx.db.query("authRefreshTokens").collect();
    const qaRefreshTokens = authRefreshTokens.filter((token) =>
      qaSessionIds.has(token.sessionId),
    );

    const authVerificationCodes = await ctx.db.query("authVerificationCodes").collect();
    const qaVerificationCodes = authVerificationCodes.filter((code) =>
      qaAuthAccountIds.has(code.accountId),
    );

    const authRateLimits = await ctx.db.query("authRateLimits").collect();
    const qaRateLimits = authRateLimits.filter((limit) =>
      qaUsers.some(
        (user) =>
          limit.identifier.includes(user.email ?? "") ||
          limit.identifier.includes(user.legacyUsername ?? ""),
      ),
    );

    for (const row of qaTestResults) await ctx.db.delete(row._id);
    for (const row of qaNotifications) await ctx.db.delete(row._id);
    for (const row of qaConsultations) await ctx.db.delete(row._id);
    for (const row of qaEvidences) await ctx.db.delete(row._id);
    for (const row of qaInvoices) await ctx.db.delete(row._id);
    for (const row of qaTests) await ctx.db.delete(row._id);
    for (const row of qaSamples) await ctx.db.delete(row._id);
    for (const row of qaVerificationCodes) await ctx.db.delete(row._id);
    for (const row of qaRefreshTokens) await ctx.db.delete(row._id);
    for (const row of qaAuthSessions) await ctx.db.delete(row._id);
    for (const row of qaAuthAccounts) await ctx.db.delete(row._id);
    for (const row of qaRateLimits) await ctx.db.delete(row._id);
    for (const row of qaUsers) await ctx.db.delete(row._id);

    const equipment = await ctx.db.query("equipment").collect();
    const allTestsAfterDelete = await ctx.db.query("tests").collect();
    const referencedEquipmentIds = new Set(
      allTestsAfterDelete
        .map((test) => test.equipmentId)
        .filter((id): id is NonNullable<typeof id> => id !== undefined),
    );
    const orphanQaEquipment = equipment.filter(
      (item) =>
        item.name === "기본 시험 장비" && !referencedEquipmentIds.has(item._id),
    );
    for (const row of orphanQaEquipment) await ctx.db.delete(row._id);

    return {
      deleted: {
        users: qaUsers.length,
        samples: qaSamples.length,
        tests: qaTests.length,
        testResults: qaTestResults.length,
        consultations: qaConsultations.length,
        evidences: qaEvidences.length,
        invoices: qaInvoices.length,
        notifications: qaNotifications.length,
        authAccounts: qaAuthAccounts.length,
        authSessions: qaAuthSessions.length,
        authRefreshTokens: qaRefreshTokens.length,
        authVerificationCodes: qaVerificationCodes.length,
        authRateLimits: qaRateLimits.length,
        equipment: orphanQaEquipment.length,
      },
    };
  },
});
