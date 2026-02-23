import { readdir } from "node:fs/promises";
import { join } from "node:path";

export interface VersionInfo {
  version: string;
  isDefault: boolean;
}

const DOCS_DIR = join(import.meta.dir, "../../docs");

export async function discoverVersions(): Promise<VersionInfo[]> {
  const entries = await readdir(DOCS_DIR, { withFileTypes: true });

  const versions = entries
    .filter((e) => e.isDirectory() && /^\d+\.\d+/.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => {
      const [aMaj, aMin] = a.split(".").map(Number);
      const [bMaj, bMin] = b.split(".").map(Number);
      return bMaj - aMaj || bMin - aMin;
    });

  if (versions.length === 0) {
    throw new Error(
      'No documentation found in docs/. Run "bun run setup" to download Python docs.'
    );
  }

  return versions.map((v, i) => ({
    version: v,
    isDefault: i === 0,
  }));
}

export function getDocsDir() {
  return DOCS_DIR;
}
