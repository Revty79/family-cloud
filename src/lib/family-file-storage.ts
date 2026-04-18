import path from "node:path";

const privateStorageDirectoryParts = ["storage", "family-files"] as const;

export function getFamilyFilesUploadDirectory() {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ...privateStorageDirectoryParts,
  );
}

export function getFamilyFileDownloadUrl(fileId: string) {
  return `/api/family-files/${fileId}/download`;
}

export function getFamilyFileExtension(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

export function sanitizeOriginalFileName(value: string) {
  const withoutPath = path.basename(value);
  const sanitized = withoutPath.replace(/[^\w.\-() ]+/g, "_").trim();

  if (!sanitized) {
    return "file";
  }

  return sanitized.slice(0, 160);
}

export function resolveFamilyFilePath(storedName: string) {
  const baseDirectory = path.resolve(getFamilyFilesUploadDirectory());
  const resolvedPath = path.resolve(path.join(baseDirectory, storedName));

  if (
    resolvedPath !== baseDirectory &&
    !resolvedPath.startsWith(`${baseDirectory}${path.sep}`)
  ) {
    throw new Error("Invalid file path.");
  }

  return resolvedPath;
}
