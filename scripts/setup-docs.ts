import { $ } from "bun";
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { bucket } from "../src/content/s3";

const BASE_URL = "https://docs.python.org";
const DEFAULT_VERSIONS = ["3.14"];
const SECTIONS_TO_UPLOAD = ["tutorial", "reference", "library"];

function parseArgs(args: string[]) {
  const versions: string[] = [];
  let force = false;

  for (const arg of args) {
    if (arg === "--force") {
      force = true;
    } else if (/^\d+\.\d+$/.test(arg)) {
      versions.push(arg);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  return { versions: versions.length > 0 ? versions : DEFAULT_VERSIONS, force };
}

async function uploadVersion(version: string, force: boolean) {
  // Check if already uploaded
  if (!force && await bucket.exists(`${version}/bundle.json.gz`)) {
    console.log(`  ${version}: already exists in S3, skipping (use --force to re-upload)`);
    return;
  }

  const tmpDir = join(import.meta.dir, `../.tmp-docs-${version}`);
  const zipPath = join(tmpDir, `python-${version}-docs-html.zip`);
  const url = `${BASE_URL}/${version}/archives/python-${version}-docs-html.zip`;

  console.log(`  ${version}: downloading from ${url}`);
  await $`mkdir -p ${tmpDir}`.quiet();

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`  ${version}: download failed (HTTP ${response.status})`);
    await $`rm -rf ${tmpDir}`.quiet();
    process.exit(1);
  }

  const zipData = await response.arrayBuffer();
  await Bun.write(zipPath, zipData);
  console.log(`  ${version}: extracting...`);

  await $`unzip -qo ${zipPath} -d ${tmpDir}`.quiet();

  const extractedDir = join(tmpDir, `python-${version}-docs-html`);

  console.log(`  ${version}: building bundle...`);
  const bundle: Record<string, string> = {};
  let fileCount = 0;

  for (const section of SECTIONS_TO_UPLOAD) {
    const sectionDir = join(extractedDir, section);

    let files: string[];
    try {
      files = await readdir(sectionDir);
    } catch {
      console.warn(`  ${version}: section "${section}" not found, skipping`);
      continue;
    }

    const htmlFiles = files.filter((f) => f.endsWith(".html"));

    for (const file of htmlFiles) {
      const filePath = join(sectionDir, file);
      const content = await Bun.file(filePath).text();
      bundle[`${section}/${file}`] = content;
      fileCount++;
    }
  }

  const json = JSON.stringify(bundle);
  const compressed = Bun.gzipSync(Buffer.from(json));
  const s3Key = `${version}/bundle.json.gz`;

  console.log(`  ${version}: uploading bundle to S3...`);
  await bucket.write(s3Key, compressed, { type: "application/gzip" });

  // Clean up temp directory
  await $`rm -rf ${tmpDir}`.quiet();

  const rawSize = (json.length / 1024 / 1024).toFixed(1);
  const gzSize = (compressed.length / 1024 / 1024).toFixed(1);
  console.log(`  ${version}: uploaded bundle (${fileCount} files, ${rawSize} MB raw → ${gzSize} MB gzipped)`);
}

async function main() {
  const { versions, force } = parseArgs(Bun.argv.slice(2));

  console.log("Setting up Python documentation...\n");

  for (const version of versions) {
    await uploadVersion(version, force);
  }

  console.log("\nDocs uploaded to S3! Run `bun run dev` to start the server.");
}

main();
