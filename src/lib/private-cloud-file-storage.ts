import path from "node:path";

const privateStorageDirectoryParts = ["storage", "private-cloud-files"] as const;

export function getPrivateCloudFilesUploadDirectory() {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    ...privateStorageDirectoryParts,
  );
}

export function getPrivateCloudFileDownloadUrl(fileId: string) {
  return `/api/private-cloud/files/${fileId}/download`;
}

export function getPrivateCloudFileExtension(fileName: string) {
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

export function resolvePrivateCloudFilePath(storedName: string) {
  const baseDirectory = path.resolve(getPrivateCloudFilesUploadDirectory());
  const resolvedPath = path.resolve(path.join(baseDirectory, storedName));

  if (
    resolvedPath !== baseDirectory &&
    !resolvedPath.startsWith(`${baseDirectory}${path.sep}`)
  ) {
    throw new Error("Invalid file path.");
  }

  return resolvedPath;
}
