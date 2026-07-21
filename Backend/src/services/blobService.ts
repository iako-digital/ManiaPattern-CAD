import { BlobServiceClient } from "@azure/storage-blob";

const containerName = process.env.AZURE_STORAGE_CONTAINER || "pattern-files";

let cachedClient: BlobServiceClient | null | undefined;

/** Returns null (and logs once) when Azure Storage isn't configured, instead of throwing. */
function getClient(): BlobServiceClient | null {
  if (cachedClient !== undefined) return cachedClient;
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    console.warn("[blobService] AZURE_STORAGE_CONNECTION_STRING is not set — file storage is disabled");
    cachedClient = null;
    return cachedClient;
  }
  cachedClient = BlobServiceClient.fromConnectionString(connectionString);
  return cachedClient;
}

export function isBlobStorageConfigured(): boolean {
  return getClient() !== null;
}

export async function uploadFile(
  blobName: string,
  content: Buffer,
  contentType: string,
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  const container = client.getContainerClient(containerName);
  await container.createIfNotExists();
  const blockBlobClient = container.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(content, { blobHTTPHeaders: { blobContentType: contentType } });
  return blockBlobClient.url;
}

/** Extracts the blob name from a full Azure Blob URL pointing at our container. */
export function blobNameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const prefix = `/${containerName}/`;
    if (!parsed.pathname.startsWith(prefix)) return null;
    return decodeURIComponent(parsed.pathname.slice(prefix.length));
  } catch {
    return null;
  }
}

export async function deleteFile(blobName: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  const container = client.getContainerClient(containerName);
  await container.getBlockBlobClient(blobName).deleteIfExists();
}

export async function deleteFileByUrl(url: string): Promise<void> {
  const blobName = blobNameFromUrl(url);
  if (!blobName) return;
  await deleteFile(blobName);
}
