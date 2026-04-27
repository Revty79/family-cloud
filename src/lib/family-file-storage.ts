import { existsSync } from "node:fs";
import path from "node:path";

const defaultStorageDirectoryName = "storage";
const familyFilesDirectoryName = "family-files";

function toResolvedUniquePaths(values: string[]) {
  return [...new Set(values.map((value) => path.resolve(value)))];
}

function getConfiguredStorageRootDirectory() {
  const configuredRoot = process.env.FAMILY_CLOUD_STORAGE_DIR?.trim();
  if (!configuredRoot) {
    return null;
  }

  if (path.isAbsolute(configuredRoot)) {
    return path.resolve(configuredRoot);
  }

  return path.resolve(
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      configuredRoot,
    ),
  );
}

function getDefaultStorageRootCandidates() {
  const currentWorkingDirectory =
    /* turbopackIgnore: true */ process.cwd();

  return toResolvedUniquePaths([
    path.join(currentWorkingDirectory, defaultStorageDirectoryName),
    path.join(
      currentWorkingDirectory,
      ".next",
      "standalone",
      defaultStorageDirectoryName,
    ),
    path.join(currentWorkingDirectory, "..", defaultStorageDirectoryName),
    path.join(currentWorkingDirectory, "..", "..", defaultStorageDirectoryName),
  ]);
}

function getStorageRootCandidates() {
  const configuredStorageRoot = getConfiguredStorageRootDirectory();
  if (configuredStorageRoot) {
    return [configuredStorageRoot];
  }

  return getDefaultStorageRootCandidates();
}

function getPrimaryStorageRootForSubdirectory(subdirectoryName: string) {
  const candidates = getStorageRootCandidates();
  const existingCandidate = candidates.find((candidate) =>
    existsSync(path.join(candidate, subdirectoryName)),
  );

  return existingCandidate ?? candidates[0];
}

function resolvePathWithinDirectory(baseDirectory: string, storedName: string) {
  const resolvedBaseDirectory = path.resolve(baseDirectory);
  const resolvedPath = path.resolve(path.join(resolvedBaseDirectory, storedName));

  if (
    resolvedPath !== resolvedBaseDirectory &&
    !resolvedPath.startsWith(`${resolvedBaseDirectory}${path.sep}`)
  ) {
    throw new Error("Invalid file path.");
  }

  return resolvedPath;
}

function getFamilyFilesUploadDirectoryCandidates() {
  return getStorageRootCandidates().map((rootDirectory) =>
    path.join(rootDirectory, familyFilesDirectoryName),
  );
}

export function getFamilyFilesUploadDirectory() {
  return path.join(
    getPrimaryStorageRootForSubdirectory(familyFilesDirectoryName),
    familyFilesDirectoryName,
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
  return resolvePathWithinDirectory(getFamilyFilesUploadDirectory(), storedName);
}

export function resolveFamilyFilePathCandidates(storedName: string) {
  const candidatePaths = getFamilyFilesUploadDirectoryCandidates().map(
    (candidateDirectory) =>
      resolvePathWithinDirectory(candidateDirectory, storedName),
  );

  return toResolvedUniquePaths(candidatePaths);
}

export function resolveExistingFamilyFilePath(storedName: string) {
  const [primaryPath, ...fallbackPaths] = resolveFamilyFilePathCandidates(storedName);
  if (!primaryPath) {
    throw new Error("No storage path candidates available.");
  }

  const existingPath = [primaryPath, ...fallbackPaths].find((candidatePath) =>
    existsSync(candidatePath),
  );

  return existingPath ?? primaryPath;
}
