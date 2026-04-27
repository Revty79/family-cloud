import { mkdir, unlink, writeFile } from "node:fs/promises";
import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { privateCloudFile } from "@/db/schema";
import { getSession } from "@/lib/auth-session";
import {
  buildPrivateStorageSummaryWithLimit,
  formatFileSize,
  getPrivateCloudFileCategoryLabel,
  isAllowedPrivateCloudFileMimeType,
  isPrivateCloudFileCategory,
  maxPrivateCloudFileSizeBytes,
  normalizePrivateCloudUploadMimeType,
  type PrivateCloudFileItem,
  type PrivateCloudStorageSummary,
} from "@/lib/private-cloud";
import { ensureUserAccessProfile } from "@/lib/user-access";
import {
  doesPrivateCloudStorageContainAnyFilesOnDisk,
  doesPrivateCloudFileExistOnDisk,
  getPrivateCloudFileDownloadUrl,
  getPrivateCloudFileExtension,
  getPrivateCloudFilesUploadDirectory,
  resolvePrivateCloudFilePath,
  sanitizeOriginalFileName,
} from "@/lib/private-cloud-file-storage";
import {
  StorageConfigurationError,
  StorageDriftError,
  assertStorageWriteConfiguration,
} from "@/lib/storage-safety";

export const runtime = "nodejs";

function toPrivateCloudFileItem(
  row: typeof privateCloudFile.$inferSelect,
): PrivateCloudFileItem {
  return {
    id: row.id,
    title: row.title,
    originalName: row.originalName,
    fileUrl: row.fileUrl,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    category: row.category as PrivateCloudFileItem["category"],
    createdAt: row.createdAt.toISOString(),
  };
}

function parseNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function getUploadFailureMessage(error: unknown) {
  if (error instanceof StorageConfigurationError) {
    return error.message;
  }

  if (error instanceof StorageDriftError) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "EACCES" || error.code === "EPERM")
  ) {
    return "Upload storage is unavailable on the server right now.";
  }

  return "Could not upload this file right now. Please try again in a moment.";
}

function getUploadFailureStatus(error: unknown) {
  if (
    error instanceof StorageConfigurationError ||
    error instanceof StorageDriftError
  ) {
    return 503;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "EACCES" || error.code === "EPERM")
  ) {
    return 503;
  }

  return 500;
}

async function getPrivateCloudStorageSummaryForUser(
  userId: string,
  limitBytes: number,
): Promise<PrivateCloudStorageSummary> {
  const [usageRow] = await db
    .select({
      totalBytes: sql<number>`coalesce(sum(${privateCloudFile.sizeBytes}), 0)`,
    })
    .from(privateCloudFile)
    .where(eq(privateCloudFile.ownerUserId, userId));

  return buildPrivateStorageSummaryWithLimit(
    parseNumericValue(usageRow?.totalBytes),
    limitBytes,
  );
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await ensureUserAccessProfile(session.user.id);

  const rows = await db
    .select()
    .from(privateCloudFile)
    .where(eq(privateCloudFile.ownerUserId, session.user.id))
    .orderBy(desc(privateCloudFile.createdAt));

  const storage = await getPrivateCloudStorageSummaryForUser(
    session.user.id,
    profile.privateStorageLimitBytes,
  );

  const recentRows = rows.slice(0, 8);
  const storageWarning =
    recentRows.length > 0 &&
    !recentRows.some((row) => doesPrivateCloudFileExistOnDisk(row.storedName)) &&
    !doesPrivateCloudStorageContainAnyFilesOnDisk()
      ? "Storage safety warning: Private cloud file records exist in the database, but recent files are missing on disk."
      : null;

  return NextResponse.json({
    files: rows.map(toPrivateCloudFileItem),
    storage,
    storageWarning,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertStorageWriteConfiguration();

    const recentRows = await db
      .select({
        storedName: privateCloudFile.storedName,
      })
      .from(privateCloudFile)
      .where(eq(privateCloudFile.ownerUserId, session.user.id))
      .orderBy(desc(privateCloudFile.createdAt))
      .limit(8);

    if (
      recentRows.length > 0 &&
      !recentRows.some((row) => doesPrivateCloudFileExistOnDisk(row.storedName)) &&
      !doesPrivateCloudStorageContainAnyFilesOnDisk()
    ) {
      throw new StorageDriftError(
        "Storage safety check failed. Database has private cloud files but none of the recent files are on disk. Restore storage before uploading new files.",
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }

    const rawTitle = formData.get("title");
    const rawCategory = formData.get("category");
    const rawFile = formData.get("file");

    const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
    const category = typeof rawCategory === "string" ? rawCategory.trim() : "";

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    if (!isPrivateCloudFileCategory(category)) {
      return NextResponse.json(
        {
          error: `Category is invalid. Use one of: ${getPrivateCloudFileCategoryLabel("document")}, ${getPrivateCloudFileCategoryLabel("photo")}, ${getPrivateCloudFileCategoryLabel("record")}, ${getPrivateCloudFileCategoryLabel("vault")}.`,
        },
        { status: 400 },
      );
    }

    if (!(rawFile instanceof File)) {
      return NextResponse.json(
        { error: "A file upload is required." },
        { status: 400 },
      );
    }

    if (rawFile.size <= 0) {
      return NextResponse.json(
        { error: "The selected file is empty." },
        { status: 400 },
      );
    }

    if (rawFile.size > maxPrivateCloudFileSizeBytes) {
      return NextResponse.json(
        {
          error: `File is too large. Maximum size is ${Math.floor(
            maxPrivateCloudFileSizeBytes / (1024 * 1024),
          )} MB.`,
        },
        { status: 400 },
      );
    }

    const originalName = sanitizeOriginalFileName(rawFile.name);
    const normalizedMimeType = normalizePrivateCloudUploadMimeType(
      rawFile.type,
      originalName,
    );

    if (!isAllowedPrivateCloudFileMimeType(normalizedMimeType)) {
      return NextResponse.json(
        {
          error:
            "This file type is not supported yet. Use common image, PDF, text, Word, Excel, or PowerPoint formats.",
        },
        { status: 400 },
      );
    }

    const profile = await ensureUserAccessProfile(session.user.id);
    const currentStorage = await getPrivateCloudStorageSummaryForUser(
      session.user.id,
      profile.privateStorageLimitBytes,
    );

    if (
      currentStorage.usedBytes + rawFile.size >
      profile.privateStorageLimitBytes
    ) {
      return NextResponse.json(
        {
          error: `Private cloud storage limit reached. You have ${formatFileSize(
            currentStorage.remainingBytes,
          )} remaining out of ${formatFileSize(profile.privateStorageLimitBytes)}.`,
          storage: currentStorage,
        },
        { status: 400 },
      );
    }

    const extension = getPrivateCloudFileExtension(originalName) || ".bin";
    const fileId = crypto.randomUUID();
    const storedName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const fileUrl = getPrivateCloudFileDownloadUrl(fileId);
    const uploadDirectory = getPrivateCloudFilesUploadDirectory();
    const storedFilePath = resolvePrivateCloudFilePath(storedName);

    await mkdir(uploadDirectory, { recursive: true });
    const fileBuffer = Buffer.from(await rawFile.arrayBuffer());
    await writeFile(storedFilePath, fileBuffer);

    try {
      const [created] = await db
        .insert(privateCloudFile)
        .values({
          id: fileId,
          ownerUserId: session.user.id,
          title,
          originalName,
          storedName,
          fileUrl,
          mimeType: normalizedMimeType,
          sizeBytes: rawFile.size,
          category,
        })
        .returning();

      const storage = await getPrivateCloudStorageSummaryForUser(
        session.user.id,
        profile.privateStorageLimitBytes,
      );

      return NextResponse.json({
        file: toPrivateCloudFileItem(created),
        storage,
      });
    } catch {
      await unlink(storedFilePath).catch(() => null);
      return NextResponse.json(
        { error: "Could not save this file right now." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Private cloud upload failed.", error);
    return NextResponse.json(
      {
        error: getUploadFailureMessage(error),
      },
      { status: getUploadFailureStatus(error) },
    );
  }
}
