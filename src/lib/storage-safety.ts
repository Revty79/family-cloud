import path from "node:path";

export class StorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigurationError";
  }
}

export class StorageDriftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageDriftError";
  }
}

function parseBoolean(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }

  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }

  return null;
}

export function isStorageStrictModeEnabled() {
  const configured = parseBoolean(process.env.FAMILY_CLOUD_STORAGE_STRICT);
  if (configured !== null) {
    return configured;
  }

  return process.env.NODE_ENV === "production";
}

export function assertStorageWriteConfiguration() {
  if (!isStorageStrictModeEnabled()) {
    return;
  }

  const configuredRoot = process.env.FAMILY_CLOUD_STORAGE_DIR?.trim();
  if (!configuredRoot) {
    throw new StorageConfigurationError(
      "Storage safety check failed. Set FAMILY_CLOUD_STORAGE_DIR to an absolute persistent path.",
    );
  }

  if (!path.isAbsolute(configuredRoot)) {
    throw new StorageConfigurationError(
      "Storage safety check failed. FAMILY_CLOUD_STORAGE_DIR must be an absolute path.",
    );
  }
}

