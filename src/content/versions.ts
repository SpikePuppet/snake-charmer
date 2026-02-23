import { bucket } from "./s3";

export interface VersionInfo {
  version: string;
  isDefault: boolean;
}

export async function discoverVersions(): Promise<VersionInfo[]> {
  // Extract unique version prefixes from object keys.
  // We list without a delimiter because some S3-compatible providers
  // (and Bun's parser) don't reliably return commonPrefixes.
  const versionSet = new Set<string>();
  let continuationToken: string | undefined;

  do {
    const result = await bucket.list({
      ...(continuationToken ? { continuationToken } : {}),
    });

    if (result.contents) {
      for (const obj of result.contents) {
        const match = obj.key.match(/^(\d+\.\d+)\//);
        if (match) {
          versionSet.add(match[1]);
        }
      }
    }

    continuationToken = result.isTruncated
      ? result.nextContinuationToken
      : undefined;
  } while (continuationToken);

  const versions = [...versionSet];

  versions.sort((a, b) => {
    const [aMaj, aMin] = a.split(".").map(Number);
    const [bMaj, bMin] = b.split(".").map(Number);
    return bMaj - aMaj || bMin - aMin;
  });

  if (versions.length === 0) {
    throw new Error(
      'No documentation found in S3 bucket. Run "bun run setup" to upload Python docs.'
    );
  }

  return versions.map((v, i) => ({
    version: v,
    isDefault: i === 0,
  }));
}
