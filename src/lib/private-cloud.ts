export const privateCloudFileCategories = [
  "document",
  "photo",
  "record",
  "vault",
] as const;

export type PrivateCloudFileCategory = (typeof privateCloudFileCategories)[number];

export type PrivateCloudFileItem = {
  id: string;
  title: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  category: PrivateCloudFileCategory;
  createdAt: string;
};

export type PrivateCloudStorageSummary = {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
};

export type PrivateCloudChatMessageItem = {
  id: string;
  message: string;
  sentByName: string;
  sentByUserId: string;
  createdAt: string;
};

export const maxPrivateCloudFileSizeBytes = 15 * 1024 * 1024;
export const defaultPrivateCloudStorageLimitBytes = 5 * 1024 * 1024 * 1024;
export const maxPrivateChatMessageLength = 500;

const allowedPrivateCloudFileMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export function isPrivateCloudFileCategory(
  value: string,
): value is PrivateCloudFileCategory {
  return privateCloudFileCategories.includes(value as PrivateCloudFileCategory);
}

export function isAllowedPrivateCloudFileMimeType(value: string) {
  return allowedPrivateCloudFileMimeTypes.has(value);
}

export function getPrivateCloudFileCategoryLabel(category: PrivateCloudFileCategory) {
  const labels: Record<PrivateCloudFileCategory, string> = {
    document: "Documents",
    photo: "Photos",
    record: "Records",
    vault: "Vault",
  };

  return labels[category];
}

export function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  if (sizeBytes < 1024 * 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function normalizeSingleLineText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidPrivateChatMessage(value: string) {
  return value.length >= 1 && value.length <= maxPrivateChatMessageLength;
}

export function buildPrivateStorageSummary(usedBytes: number): PrivateCloudStorageSummary {
  const normalizedUsedBytes = Math.max(0, usedBytes);
  const remainingBytes = Math.max(
    0,
    defaultPrivateCloudStorageLimitBytes - normalizedUsedBytes,
  );

  return {
    usedBytes: normalizedUsedBytes,
    limitBytes: defaultPrivateCloudStorageLimitBytes,
    remainingBytes,
  };
}
