import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { ConvexHttpClient } from "convex/browser";

const { Pool } = pg;

const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || "https://fine-yak-424.convex.cloud";
const migrationKey = process.env.MIGRATION_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!migrationKey) {
  throw new Error("MIGRATION_KEY is required");
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const convex = new ConvexHttpClient(convexUrl);
const pool = new Pool({ connectionString: databaseUrl });

const mapPath = path.join(process.cwd(), ".context", "convex-migration-map.json");

const toTimestamp = (value) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.getTime();
};

const safeJson = (value, fallback = {}) => {
  if (!value || typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const nullable = (value) => (value == null ? undefined : value);

const stripLargeDataUrls = (value) => {
  if (Array.isArray(value)) {
    return value.map(stripLargeDataUrls);
  }
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, child] of Object.entries(value)) {
      if (
        typeof child === "string" &&
        child.startsWith("data:") &&
        ["url", "metricFormulaImg", "envDiagramUrl"].includes(key)
      ) {
        next[key] = null;
      } else {
        next[key] = stripLargeDataUrls(child);
      }
    }
    return next;
  }
  return value;
};

const normalizeReportData = (extra) => {
  if (!extra || typeof extra !== "object") return extra;
  const serialized = JSON.stringify(extra);
  if (Buffer.byteLength(serialized, "utf8") <= 850_000) {
    return extra;
  }
  return stripLargeDataUrls(extra);
};

const sanitizeFileName = (name) =>
  String(name || "file")
    .replace(/[^\w.\-가-힣]+/g, "_")
    .slice(0, 120);

const dataUrlToBuffer = (dataUrl) => {
  const [, base64] = dataUrl.split(",");
  return Buffer.from(base64 || "", "base64");
};

async function createSharedDropboxLink(dropboxToken, filePath) {
  const createResponse = await fetch(
    "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dropboxToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: filePath,
        settings: { requested_visibility: "public" },
      }),
    },
  );

  if (createResponse.ok) {
    const payload = await createResponse.json();
    return payload.url;
  }

  const errorData = await createResponse.json().catch(() => ({}));
  if (errorData?.error?.[".tag"] !== "shared_link_already_exists") {
    throw new Error(`Dropbox link creation failed for ${filePath}`);
  }

  const listResponse = await fetch(
    "https://api.dropboxapi.com/2/sharing/list_shared_links",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dropboxToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: filePath }),
    },
  );
  const listPayload = await listResponse.json();
  return listPayload.links?.[0]?.url;
}

async function uploadLegacyEvidence(dropboxToken, sampleBarcode, evidence) {
  if (!dropboxToken || !evidence?.dataUrl?.startsWith("data:")) {
    return { fileUrl: undefined, dropboxPath: undefined, dataUrl: evidence?.dataUrl };
  }

  const filePath = `/LIMS_Evidence/${sampleBarcode}_${sanitizeFileName(evidence.fileName)}`;
  const uploadResponse = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dropboxToken}`,
      "Dropbox-API-Arg": JSON.stringify({
        path: filePath,
        mode: "overwrite",
        autorename: false,
        mute: true,
      }),
      "Content-Type": "application/octet-stream",
    },
    body: dataUrlToBuffer(evidence.dataUrl),
  });

  if (!uploadResponse.ok) {
    return { fileUrl: undefined, dropboxPath: undefined, dataUrl: evidence.dataUrl };
  }

  const sharedUrl = await createSharedDropboxLink(dropboxToken, filePath);
  return {
    fileUrl: sharedUrl,
    dropboxPath: filePath,
    dataUrl: undefined,
  };
}

async function queryRows(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function getLegacyRows() {
  const [users, equipment, samples, tests, testResults, consultations, notifications, evidences, invoices, invoiceItems] =
    await Promise.all([
      queryRows('select * from "User"'),
      queryRows('select * from "Equipment"'),
      queryRows('select * from "Sample"'),
      queryRows('select * from "Test"'),
      queryRows('select * from "TestResult"'),
      queryRows('select * from "Consultation"'),
      queryRows('select * from "Notification"'),
      queryRows('select * from "Evidence"'),
      queryRows('select * from "Invoice"'),
      queryRows('select * from "InvoiceItem"'),
    ]);

  return { users, equipment, samples, tests, testResults, consultations, notifications, evidences, invoices, invoiceItems };
}

async function getExistingMappings() {
  return await convex.query("migration:getLegacyMappings", { migrationKey });
}

async function migrateUsers(legacyUsers, mappings) {
  const userMap = new Map(mappings.users.map((row) => [row.legacyUsername || row.email, row.id]));

  for (const user of legacyUsers) {
    if (!user.email) continue;
    try {
      await convex.action("auth:signIn", {
        provider: "password",
        params: {
          flow: "signUp",
          email: user.email,
          password: user.passwordHash,
          name: user.name,
          phone: user.phone,
          legacyUsername: user.id,
          role: user.role,
          status: user.role === "PENDING" ? "PENDING" : user.role === "RESIGNED" ? "RESIGNED" : "ACTIVE",
          createdAt: toTimestamp(user.createdAt) || Date.now(),
        },
        calledBy: "migration-script",
      });
    } catch (_error) {
      // Existing auth account is acceptable during retry runs.
    }

    const importedUser = await convex.query("migration:getUserByEmail", {
      migrationKey,
      email: user.email,
    });
    if (!importedUser) continue;

    await convex.mutation("migration:updateImportedUser", {
      migrationKey,
      id: importedUser._id,
      legacyUsername: user.id,
      role: user.role,
      status: user.role === "PENDING" ? "PENDING" : user.role === "RESIGNED" ? "RESIGNED" : "ACTIVE",
      createdAt: toTimestamp(user.createdAt) || Date.now(),
      name: user.name || undefined,
      phone: user.phone || undefined,
    });
    userMap.set(user.id, importedUser._id);
  }

  return userMap;
}

async function migrateEquipment(rows) {
  const equipmentMap = new Map();
  for (const row of rows) {
    const imported = await convex.mutation("migration:upsertEquipment", {
      migrationKey,
      legacyId: row.id,
      name: row.name,
      status: row.status,
      lastCalibration: toTimestamp(row.lastCalibration) || Date.now(),
      nextCalibration: toTimestamp(row.nextCalibration) || Date.now(),
    });
    equipmentMap.set(row.id, imported._id);
  }
  return equipmentMap;
}

async function migrateSamples(rows) {
  const sampleMap = new Map();
  for (const row of rows) {
    const extra = safeJson(row.extra);
    const normalizedReportData = normalizeReportData(extra);
    const payload = {
      legacyId: row.id,
      barcode: row.barcode,
      clientId: row.clientId,
      clientName: nullable(row.clientName),
      phone: nullable(row.phone),
      email: nullable(row.email),
      content: nullable(row.content),
      consultation: nullable(row.consultation),
      status: row.status,
      location: nullable(row.location),
      testStartDate: nullable(row.testStartDate),
      testEndDate: nullable(row.testEndDate),
      testLocation: nullable(row.testLocation),
      testType: nullable(row.testType),
      testAddress: nullable(row.testAddress),
      bizNo: nullable(row.bizNo),
      target: nullable(row.target),
      testProduct: nullable(row.testProduct),
      testPurpose: nullable(row.testPurpose),
      testMethod: nullable(row.testMethod),
      clientAddress: nullable(extra.clientAddress),
      notes: nullable(extra.note || extra.notes),
      reportData: normalizedReportData,
      testerBarcode: nullable(row.testerBarcode),
      formalBarcode: nullable(row.formalBarcode),
      gapjiApproved: !!row.gapjiApproved,
      euljiApproved: !!row.euljiApproved,
      gapjiRejection: nullable(row.gapjiRejection),
      euljiRejection: nullable(row.euljiRejection),
      reportFileUrl: nullable(row.reportPdfUrl),
      reportStorageType: row.reportPdfUrl
        ? row.reportPdfUrl.startsWith("http")
          ? "DROPBOX"
          : row.reportPdfUrl.startsWith("data:")
            ? "INLINE"
            : "EXTERNAL"
        : undefined,
      reportDropboxPath: row.reportPdfUrl?.startsWith("http") ? `/legacy/${row.barcode}` : undefined,
      reportFileName: row.reportPdfUrl ? `${row.barcode}.pdf` : undefined,
      receivedAt: toTimestamp(row.receivedAt) || Date.now(),
    };
    const imported = await convex.mutation("migration:upsertSample", {
      migrationKey,
      sample: payload,
    });
    sampleMap.set(row.id, imported._id);
  }
  return sampleMap;
}

async function migrateTests(rows, sampleMap, userMap, equipmentMap) {
  const testMap = new Map();
  for (const row of rows) {
    const imported = await convex.mutation("migration:upsertTest", {
      migrationKey,
      test: {
        legacyId: row.id,
        sampleId: sampleMap.get(row.sampleId),
        testerId: userMap.get(row.testerId),
        equipmentId: nullable(equipmentMap.get(row.equipmentId)),
        envTemp: nullable(row.envTemp),
        envHumidity: nullable(row.envHumidity),
        isEnvValid: !!row.isEnvValid,
        startTime: toTimestamp(row.startTime) || Date.now(),
        endTime: toTimestamp(row.endTime),
        status: row.status,
      },
    });
    testMap.set(row.id, imported._id);
  }
  return testMap;
}

async function migrateTestResults(rows, testMap, userMap) {
  for (const row of rows) {
    await convex.mutation("migration:upsertTestResult", {
      migrationKey,
      testResult: {
        legacyId: row.id,
        testId: testMap.get(row.testId),
        rawData: row.rawData || "",
        calculatedValue: row.calculatedValue ?? 0,
        uncertainty: row.uncertainty ?? 0,
        isApproved: !!row.isApproved,
        approvedById: nullable(userMap.get(row.approvedById)),
        approvedAt: toTimestamp(row.approvedAt),
      },
    });
  }
}

async function migrateConsultations(rows, sampleMap, userMap) {
  for (const row of rows) {
    const authorId = userMap.get(row.authorId);
    await convex.mutation("migration:upsertConsultation", {
      migrationKey,
      consultation: {
        legacyId: row.id,
        sampleId: sampleMap.get(row.sampleId),
        authorId: nullable(authorId),
        authorName: row.authorId || "Unknown",
        message: row.message || "",
        history: Array.isArray(row.history) ? row.history : safeJson(row.history, []),
        createdAt: toTimestamp(row.createdAt) || Date.now(),
      },
    });
  }
}

async function migrateNotifications(rows, userMap) {
  for (const row of rows) {
    const userId = userMap.get(row.userId);
    if (!userId) continue;
    await convex.mutation("migration:upsertNotification", {
      migrationKey,
      notification: {
        legacyId: row.id,
        userId,
        message: row.message || "",
        read: !!row.read,
        createdAt: toTimestamp(row.createdAt) || Date.now(),
      },
    });
  }
}

async function migrateEvidences(rows, sampleMap, userMap, sampleRows) {
  const sampleById = new Map(sampleRows.map((row) => [row.id, row]));
  for (const row of rows) {
    const sampleId = sampleMap.get(row.sampleId);
    if (!sampleId) continue;
    const sample = sampleById.get(row.sampleId);
    const uploaded = await uploadLegacyEvidence(
      process.env.DROPBOX_ACCESS_TOKEN,
      sample?.barcode || row.sampleId,
      row,
    );
    await convex.mutation("migration:upsertEvidence", {
      migrationKey,
      evidence: {
        legacyId: row.id,
        sampleId,
        uploaderId: nullable(userMap.get(row.uploaderId)),
        uploaderName: nullable(row.uploaderId),
        fileName: row.fileName || "evidence",
        fileType: row.fileType || "application/octet-stream",
        storageType: uploaded.dropboxPath ? "DROPBOX" : uploaded.dataUrl ? "INLINE" : "EXTERNAL",
        fileUrl: nullable(uploaded.fileUrl),
        dropboxPath: nullable(uploaded.dropboxPath),
        dataUrl: nullable(uploaded.dataUrl),
        createdAt: toTimestamp(row.createdAt) || Date.now(),
      },
    });
  }
}

async function migrateInvoices(rows, invoiceItems, sampleMap) {
  const itemsByInvoiceId = invoiceItems.reduce((acc, item) => {
    acc.set(item.invoiceId, [...(acc.get(item.invoiceId) || []), item]);
    return acc;
  }, new Map());

  for (const row of rows) {
    const sampleId = sampleMap.get(row.sampleId);
    if (!sampleId) continue;
    await convex.mutation("migration:upsertInvoice", {
      migrationKey,
      invoice: {
        legacyId: row.id,
        invoiceNo: row.invoiceNo,
        sampleId,
        date: toTimestamp(row.date) || Date.now(),
        validUntil: toTimestamp(row.validUntil),
        subtotal: row.subtotal || 0,
        discountRate: row.discountRate || 0,
        discountAmt: row.discountAmt || 0,
        discountType: row.discountType || "PERCENT",
        vat: row.vat || 0,
        total: row.total || 0,
        status: row.status || "DRAFT",
        previousNos: nullable(row.previousNos),
        items: (itemsByInvoiceId.get(row.id) || []).map((item) => ({
          title: item.title || "item",
          unitCost: item.unitCost || 0,
          qty: item.qty || 1,
          price: item.price || 0,
        })),
      },
    });
  }
}

async function writeMapFile(mappings) {
  await fs.mkdir(path.dirname(mapPath), { recursive: true });
  await fs.writeFile(mapPath, JSON.stringify(mappings, null, 2));
}

async function main() {
  const legacy = await getLegacyRows();
  const existing = await getExistingMappings();

  const userMap = await migrateUsers(legacy.users, existing);
  const equipmentMap = await migrateEquipment(legacy.equipment);
  const sampleMap = await migrateSamples(legacy.samples);
  const testMap = await migrateTests(legacy.tests, sampleMap, userMap, equipmentMap);
  await migrateTestResults(legacy.testResults, testMap, userMap);
  await migrateConsultations(legacy.consultations, sampleMap, userMap);
  await migrateEvidences(legacy.evidences, sampleMap, userMap, legacy.samples);
  await migrateNotifications(legacy.notifications, userMap);
  await migrateInvoices(legacy.invoices, legacy.invoiceItems, sampleMap);

  await writeMapFile({
    users: Object.fromEntries(userMap),
    equipment: Object.fromEntries(equipmentMap),
    samples: Object.fromEntries(sampleMap),
    tests: Object.fromEntries(testMap),
  });
}

main()
  .then(async () => {
    await pool.end();
    console.log(`Migration completed. Mapping written to ${mapPath}`);
  })
  .catch(async (error) => {
    await pool.end();
    console.error(error);
    process.exit(1);
  });
