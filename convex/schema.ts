import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  accountStatusValidator,
  invoiceStatusValidator,
  reportStorageValidator,
  roleValidator,
  sampleStatusValidator,
  testStatusValidator,
} from "./lib/validators";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: roleValidator,
    status: accountStatusValidator,
    legacyUsername: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("legacyUsername", ["legacyUsername"]),

  equipment: defineTable({
    legacyId: v.optional(v.string()),
    name: v.string(),
    status: v.string(),
    lastCalibration: v.number(),
    nextCalibration: v.number(),
  }).index("legacyId", ["legacyId"]),

  samples: defineTable({
    legacyId: v.optional(v.string()),
    barcode: v.string(),
    clientId: v.string(),
    clientName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    content: v.optional(v.string()),
    consultation: v.optional(v.string()),
    status: sampleStatusValidator,
    location: v.optional(v.string()),
    testStartDate: v.optional(v.string()),
    testEndDate: v.optional(v.string()),
    testLocation: v.optional(v.string()),
    testType: v.optional(v.string()),
    testAddress: v.optional(v.string()),
    bizNo: v.optional(v.string()),
    target: v.optional(v.string()),
    testProduct: v.optional(v.string()),
    testPurpose: v.optional(v.string()),
    testMethod: v.optional(v.string()),
    clientAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
    reportData: v.optional(v.any()),
    testerBarcode: v.optional(v.string()),
    formalBarcode: v.optional(v.string()),
    gapjiApproved: v.boolean(),
    euljiApproved: v.boolean(),
    gapjiRejection: v.optional(v.string()),
    euljiRejection: v.optional(v.string()),
    reportStorageType: v.optional(reportStorageValidator),
    reportFileUrl: v.optional(v.string()),
    reportDropboxPath: v.optional(v.string()),
    reportFileName: v.optional(v.string()),
    receivedAt: v.number(),
  })
    .index("legacyId", ["legacyId"])
    .index("barcode", ["barcode"])
    .index("receivedAt", ["receivedAt"])
    .index("formalBarcode", ["formalBarcode"]),

  tests: defineTable({
    legacyId: v.optional(v.string()),
    sampleId: v.id("samples"),
    testerId: v.id("users"),
    equipmentId: v.optional(v.id("equipment")),
    envTemp: v.optional(v.number()),
    envHumidity: v.optional(v.number()),
    isEnvValid: v.boolean(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: testStatusValidator,
  })
    .index("legacyId", ["legacyId"])
    .index("by_sample", ["sampleId"])
    .index("by_tester", ["testerId"]),

  testResults: defineTable({
    legacyId: v.optional(v.string()),
    testId: v.id("tests"),
    rawData: v.string(),
    calculatedValue: v.number(),
    uncertainty: v.number(),
    isApproved: v.boolean(),
    approvedById: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
  })
    .index("legacyId", ["legacyId"])
    .index("by_test", ["testId"]),

  auditLogs: defineTable({
    legacyId: v.optional(v.string()),
    tableName: v.string(),
    recordId: v.string(),
    action: v.string(),
    oldValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
    changedById: v.optional(v.id("users")),
    changedByName: v.optional(v.string()),
    reason: v.string(),
    timestamp: v.number(),
  })
    .index("legacyId", ["legacyId"])
    .index("by_record", ["tableName", "recordId"]),

  notifications: defineTable({
    legacyId: v.optional(v.string()),
    userId: v.id("users"),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("legacyId", ["legacyId"])
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "read"]),

  consultations: defineTable({
    legacyId: v.optional(v.string()),
    sampleId: v.id("samples"),
    authorId: v.optional(v.id("users")),
    authorName: v.string(),
    message: v.string(),
    history: v.optional(
      v.array(
        v.object({
          message: v.string(),
          updatedAt: v.string(),
          authorId: v.optional(v.string()),
          authorName: v.optional(v.string()),
        }),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("legacyId", ["legacyId"])
    .index("by_sample", ["sampleId"]),

  evidences: defineTable({
    legacyId: v.optional(v.string()),
    sampleId: v.id("samples"),
    uploaderId: v.optional(v.id("users")),
    uploaderName: v.optional(v.string()),
    fileName: v.string(),
    fileType: v.string(),
    storageType: v.optional(reportStorageValidator),
    fileUrl: v.optional(v.string()),
    dropboxPath: v.optional(v.string()),
    dataUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("legacyId", ["legacyId"])
    .index("by_sample", ["sampleId"]),

  invoices: defineTable({
    legacyId: v.optional(v.string()),
    invoiceNo: v.string(),
    sampleId: v.id("samples"),
    date: v.number(),
    validUntil: v.optional(v.number()),
    subtotal: v.number(),
    discountRate: v.number(),
    discountAmt: v.number(),
    discountType: v.string(),
    vat: v.number(),
    total: v.number(),
    status: invoiceStatusValidator,
    previousNos: v.optional(v.string()),
    items: v.array(
      v.object({
        title: v.string(),
        unitCost: v.number(),
        qty: v.number(),
        price: v.number(),
      }),
    ),
  })
    .index("legacyId", ["legacyId"])
    .index("by_sample", ["sampleId"])
    .index("invoiceNo", ["invoiceNo"]),
});
