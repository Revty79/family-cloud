export const familyFileCategories = [
  "document",
  "photo",
  "record",
  "vault",
] as const;

export type FamilyFileCategory = (typeof familyFileCategories)[number];

export type FamilyFileItem = {
  id: string;
  title: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  category: FamilyFileCategory;
  createdAt: string;
};

export const maxFamilyFileSizeBytes = 15 * 1024 * 1024;

const allowedFamilyFileMimeTypes = new Set([
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

export function isFamilyFileCategory(value: string): value is FamilyFileCategory {
  return familyFileCategories.includes(value as FamilyFileCategory);
}

export function isAllowedFamilyFileMimeType(value: string) {
  return allowedFamilyFileMimeTypes.has(value);
}

export function getFamilyFileCategoryLabel(category: FamilyFileCategory) {
  const labels: Record<FamilyFileCategory, string> = {
    document: "Special docs",
    photo: "Photos",
    record: "Records",
    vault: "Vault prep",
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

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
