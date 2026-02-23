import { $ } from "bun";
import { join } from "node:path";

const DOCS_DIR = join(import.meta.dir, "../docs");
const BASE_URL = "https://docs.python.org";
const DEFAULT_VERSIONS = ["3.14"];

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

async function downloadVersion(version: string, force: boolean) {
  const destDir = join(DOCS_DIR, version);

  if (!force && await Bun.file(join(destDir, "tutorial", "index.html")).exists()) {
    console.log(`  ${version}: already exists, skipping (use --force to re-download)`);
    return;
  }

  const url = `${BASE_URL}/${version}/archives/python-${version}-docs-html.zip`;
  const zipPath = join(DOCS_DIR, `python-${version}-docs-html.zip`);

  console.log(`  ${version}: downloading from ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`  ${version}: download failed (HTTP ${response.status})`);
    process.exit(1);
  }

  await Bun.write(zipPath, response);
  console.log(`  ${version}: extracting...`);

  // Extract the zip — the archive contains a top-level directory like python-3.14-docs-html/
  await $`unzip -qo ${zipPath} -d ${DOCS_DIR}`.quiet();

  // Rename the extracted directory to the version number
  const extractedDir = join(DOCS_DIR, `python-${version}-docs-html`);
  if (await Bun.file(join(extractedDir, "tutorial", "index.html")).exists()) {
    // Remove existing dest if force re-download
    if (force) {
      await $`rm -rf ${destDir}`.quiet();
    }
    await $`mv ${extractedDir} ${destDir}`.quiet();
  }

  // Clean up the zip file
  await $`rm ${zipPath}`.quiet();

  console.log(`  ${version}: done`);
}

async function main() {
  const { versions, force } = parseArgs(Bun.argv.slice(2));

  // Ensure docs directory exists
  await $`mkdir -p ${DOCS_DIR}`.quiet();

  console.log("Setting up Python documentation...\n");

  for (const version of versions) {
    await downloadVersion(version, force);
  }

  console.log("\nDocs ready! Run `bun run dev` to start the server.");
}

main();
