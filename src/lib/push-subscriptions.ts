export type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type PushSubscriptionDeletePayload = {
  endpoint: string;
};

export function parsePushSubscriptionPayload(
  value: unknown,
): PushSubscriptionPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const keys = row.keys;

  if (
    typeof row.endpoint !== "string" ||
    !keys ||
    typeof keys !== "object" ||
    typeof (keys as Record<string, unknown>).p256dh !== "string" ||
    typeof (keys as Record<string, unknown>).auth !== "string"
  ) {
    return null;
  }

  const expirationTimeValue = row.expirationTime;
  const expirationTime =
    typeof expirationTimeValue === "number" || expirationTimeValue === null
      ? expirationTimeValue
      : null;

  try {
    const endpointUrl = new URL(row.endpoint);
    if (endpointUrl.protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }

  return {
    endpoint: row.endpoint,
    expirationTime,
    keys: {
      p256dh: (keys as Record<string, unknown>).p256dh as string,
      auth: (keys as Record<string, unknown>).auth as string,
    },
  };
}

export function parsePushSubscriptionDeletePayload(
  value: unknown,
): PushSubscriptionDeletePayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (typeof row.endpoint !== "string") {
    return null;
  }

  try {
    const endpointUrl = new URL(row.endpoint);
    if (endpointUrl.protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }

  return {
    endpoint: row.endpoint,
  };
}
