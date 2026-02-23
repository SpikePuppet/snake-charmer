import {
  SECTIONS,
  getStaticChapters,
  discoverLibraryChapters,
  type ChapterMeta,
  type Section,
} from "./chapters";
import { discoverVersions } from "./versions";
import { bucket } from "./s3";

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export interface ChapterData {
  slug: string;
  number: number;
  title: string;
  html: string;
  toc: TocEntry[];
  plainText: string;
  prev: { slug: string; title: string; number: number } | null;
  next: { slug: string; title: string; number: number } | null;
}

function extractBody(rawHtml: string): string {
  const bodyStart = rawHtml.indexOf('<div class="body" role="main">');
  if (bodyStart === -1) return "";

  const contentStart = bodyStart + '<div class="body" role="main">'.length;
  const cleanerIdx = rawHtml.indexOf('<div class="clearer">', contentStart);
  if (cleanerIdx === -1) return "";

  let html = rawHtml.slice(contentStart, cleanerIdx).trim();

  // Remove headerlink anchors
  html = html.replace(/<a class="headerlink"[^>]*>.*?<\/a>/g, "");

  return html;
}

function rewriteLinks(html: string, version: string, section: Section, chapters: ChapterMeta[]): string {
  // Rewrite internal links within this section: href="controlflow.html#foo" -> href="/<version>/<section>/controlflow#foo"
  html = html.replace(
    /href="([a-z0-9_.]+)\.html(#[^"]*)?"/gi,
    (match, file, hash) => {
      const chapter = chapters.find((c) => c.filename === `${file}.html`);
      if (chapter) {
        return `href="/${version}/${section}/${chapter.slug}${hash || ""}"`;
      }
      // Section index
      if (file === "index") {
        const defaultSlug = chapters[0]?.slug || file;
        return `href="/${version}/${section}/${defaultSlug}"`;
      }
      // External doc link — link to docs.python.org
      return `href="https://docs.python.org/${version}/${section}/${file}.html${hash || ""}"`;
    }
  );

  // Rewrite relative links going up (e.g., ../library/foo.html)
  html = html.replace(
    /href="\.\.\/(.*?)"/g,
    (_match, path) => {
      // Check if it's a link to another section we support
      for (const s of SECTIONS) {
        const sectionMatch = path.match(new RegExp(`^${s.dir}/([a-z0-9_.]+)\\.html(#.*)?$`));
        if (sectionMatch) {
          return `href="/${version}/${s.id}/${sectionMatch[1]}${sectionMatch[2] || ""}"`;
        }
      }
      return `href="https://docs.python.org/${version}/${path}"`;
    }
  );

  return html;
}

function extractToc(html: string): TocEntry[] {
  const toc: TocEntry[] = [];

  const sectionRegex = /<section\s+id="([^"]+)"[^>]*>/g;
  let sectionMatch;

  while ((sectionMatch = sectionRegex.exec(html)) !== null) {
    const id = sectionMatch[1];
    const afterSection = html.slice(sectionMatch.index + sectionMatch[0].length, sectionMatch.index + sectionMatch[0].length + 500);

    const headingMatch = afterSection.match(/^(?:\s*<span[^>]*><\/span>)*\s*<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/);
    if (headingMatch) {
      const level = parseInt(headingMatch[1], 10);
      const text = headingMatch[2].replace(/<[^>]+>/g, "").trim();
      if (text) {
        toc.push({ id, text, level });
      }
    }
  }

  return toc;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Returns: Map<version, Map<section, Map<slug, ChapterData>>>
export async function extractAllContent(): Promise<Map<string, Map<string, Map<string, ChapterData>>>> {
  const versions = await discoverVersions();
  const allContent = new Map<string, Map<string, Map<string, ChapterData>>>();

  for (const { version } of versions) {
    const versionMap = new Map<string, Map<string, ChapterData>>();

    for (const sectionMeta of SECTIONS) {
      const sectionMap = new Map<string, ChapterData>();

      // Get chapter list for this section
      let chapters: ChapterMeta[];
      const staticChapters = getStaticChapters(sectionMeta.id);
      if (staticChapters) {
        chapters = staticChapters;
      } else {
        try {
          chapters = await discoverLibraryChapters(version);
        } catch {
          console.warn(`  Warning: Could not discover chapters for ${version}/${sectionMeta.dir}`);
          chapters = [];
        }
      }

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const s3Key = `${version}/${sectionMeta.dir}/${chapter.filename}`;

        try {
          const rawHtml = await bucket.file(s3Key).text();
          let bodyHtml = extractBody(rawHtml);
          bodyHtml = rewriteLinks(bodyHtml, version, sectionMeta.id, chapters);
          const toc = extractToc(bodyHtml);
          const plainText = stripHtml(bodyHtml);

          const prev = i > 0
            ? { slug: chapters[i - 1].slug, title: chapters[i - 1].title, number: chapters[i - 1].number }
            : null;
          const next = i < chapters.length - 1
            ? { slug: chapters[i + 1].slug, title: chapters[i + 1].title, number: chapters[i + 1].number }
            : null;

          sectionMap.set(chapter.slug, {
            slug: chapter.slug,
            number: chapter.number,
            title: chapter.title,
            html: bodyHtml,
            toc,
            plainText,
            prev,
            next,
          });
        } catch (err) {
          // Silently skip files that can't be read
        }
      }

      versionMap.set(sectionMeta.id, sectionMap);
      console.log(`  Loaded ${sectionMap.size} pages for Python ${version} / ${sectionMeta.label}`);
    }

    allContent.set(version, versionMap);
  }

  return allContent;
}
