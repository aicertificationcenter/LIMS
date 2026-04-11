type UnknownRecord = Record<string, unknown>;

export function safeParseExtra(extra: unknown): UnknownRecord {
  if (typeof extra !== "string" || !extra.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(extra);
    return parsed && typeof parsed === "object" ? (parsed as UnknownRecord) : {};
  } catch {
    return { note: extra };
  }
}

export function splitExtraPayload(extra: unknown) {
  const parsed = safeParseExtra(extra);
  const { clientAddress, note, notes, ...reportData } = parsed;

  return {
    clientAddress:
      typeof clientAddress === "string" && clientAddress.trim() ? clientAddress : undefined,
    notes: typeof note === "string" ? note : typeof notes === "string" ? notes : undefined,
    reportData,
  };
}

export function serializeExtra(sample: {
  clientAddress?: string | null;
  notes?: string | null;
  reportData?: UnknownRecord | null;
}) {
  const payload: UnknownRecord = {
    ...(sample.reportData ?? {}),
  };

  if (sample.clientAddress) {
    payload.clientAddress = sample.clientAddress;
  }

  if (sample.notes) {
    payload.note = sample.notes;
  }

  return Object.keys(payload).length > 0 ? JSON.stringify(payload) : null;
}
