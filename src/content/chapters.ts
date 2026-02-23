export type Section = "tutorial" | "reference" | "library";

export interface SectionMeta {
  id: Section;
  label: string;
  dir: string;
  defaultSlug: string;
}

export const SECTIONS: SectionMeta[] = [
  { id: "tutorial", label: "Tutorial", dir: "tutorial", defaultSlug: "appetite" },
  { id: "reference", label: "Language", dir: "reference", defaultSlug: "introduction" },
  { id: "library", label: "Library", dir: "library", defaultSlug: "functions" },
];

export function getSectionMeta(section: Section): SectionMeta {
  return SECTIONS.find((s) => s.id === section)!;
}

export interface ChapterMeta {
  slug: string;
  number: number;
  title: string;
  filename: string;
}

export const TUTORIAL_CHAPTERS: ChapterMeta[] = [
  { slug: "appetite", number: 1, title: "Whetting Your Appetite", filename: "appetite.html" },
  { slug: "interpreter", number: 2, title: "Using the Python Interpreter", filename: "interpreter.html" },
  { slug: "introduction", number: 3, title: "An Informal Introduction to Python", filename: "introduction.html" },
  { slug: "controlflow", number: 4, title: "More Control Flow Tools", filename: "controlflow.html" },
  { slug: "datastructures", number: 5, title: "Data Structures", filename: "datastructures.html" },
  { slug: "modules", number: 6, title: "Modules", filename: "modules.html" },
  { slug: "inputoutput", number: 7, title: "Input and Output", filename: "inputoutput.html" },
  { slug: "errors", number: 8, title: "Errors and Exceptions", filename: "errors.html" },
  { slug: "classes", number: 9, title: "Classes", filename: "classes.html" },
  { slug: "stdlib", number: 10, title: "Brief Tour of the Standard Library", filename: "stdlib.html" },
  { slug: "stdlib2", number: 11, title: "Brief Tour of the Standard Library — Part II", filename: "stdlib2.html" },
  { slug: "venv", number: 12, title: "Virtual Environments and Packages", filename: "venv.html" },
  { slug: "whatnow", number: 13, title: "What Now?", filename: "whatnow.html" },
  { slug: "interactive", number: 14, title: "Interactive Input Editing and History Substitution", filename: "interactive.html" },
  { slug: "floatingpoint", number: 15, title: "Floating-Point Arithmetic: Issues and Limitations", filename: "floatingpoint.html" },
  { slug: "appendix", number: 16, title: "Appendix", filename: "appendix.html" },
];

export const REFERENCE_CHAPTERS: ChapterMeta[] = [
  { slug: "introduction", number: 1, title: "Introduction", filename: "introduction.html" },
  { slug: "lexical_analysis", number: 2, title: "Lexical Analysis", filename: "lexical_analysis.html" },
  { slug: "datamodel", number: 3, title: "Data Model", filename: "datamodel.html" },
  { slug: "executionmodel", number: 4, title: "Execution Model", filename: "executionmodel.html" },
  { slug: "import", number: 5, title: "The Import System", filename: "import.html" },
  { slug: "expressions", number: 6, title: "Expressions", filename: "expressions.html" },
  { slug: "simple_stmts", number: 7, title: "Simple Statements", filename: "simple_stmts.html" },
  { slug: "compound_stmts", number: 8, title: "Compound Statements", filename: "compound_stmts.html" },
  { slug: "toplevel_components", number: 9, title: "Top-level Components", filename: "toplevel_components.html" },
  { slug: "grammar", number: 10, title: "Full Grammar Specification", filename: "grammar.html" },
];

// Keep backward compatibility
export const CHAPTERS = TUTORIAL_CHAPTERS;

export function getStaticChapters(section: Section): ChapterMeta[] | null {
  if (section === "tutorial") return TUTORIAL_CHAPTERS;
  if (section === "reference") return REFERENCE_CHAPTERS;
  return null; // library is auto-discovered
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title>(.*?)(?:\s*&#8212;|\s*—)\s*Python/);
  if (titleMatch) return decodeHtmlEntities(titleMatch[1].trim());
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (h1Match) return h1Match[1].replace(/<[^>]+>/g, "").trim();
  return "";
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#8212;/g, "\u2014")
    .replace(/&#8211;/g, "\u2013")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTocOrder(indexHtml: string): string[] {
  const order: string[] = [];
  const regex = /href="([a-z0-9_.]+)\.html"/gi;
  let match;
  const seen = new Set<string>();
  while ((match = regex.exec(indexHtml)) !== null) {
    const file = match[1];
    if (file !== "index" && !seen.has(file)) {
      seen.add(file);
      order.push(file);
    }
  }
  return order;
}

export function discoverLibraryChapters(files: Map<string, string>): ChapterMeta[] {
  // Find all library HTML files from the in-memory file map
  const htmlFiles: string[] = [];
  for (const key of files.keys()) {
    if (key.startsWith("library/") && key.endsWith(".html") && key !== "library/index.html" && !key.slice("library/".length).includes("/")) {
      htmlFiles.push(key.slice("library/".length));
    }
  }

  // Read index.html for TOC order
  let tocOrder: string[] = [];
  const indexHtml = files.get("library/index.html");
  if (indexHtml) {
    tocOrder = extractTocOrder(indexHtml);
  }

  // Build a map of slug → position from TOC order
  const orderMap = new Map<string, number>();
  tocOrder.forEach((slug, i) => orderMap.set(slug, i));

  const chapters: ChapterMeta[] = [];

  for (const file of htmlFiles) {
    const slug = file.replace(".html", "");
    const html = files.get(`library/${file}`);
    if (!html) continue;
    const title = extractTitle(html);
    if (!title) continue;
    const order = orderMap.get(slug) ?? 9999;
    chapters.push({ slug, number: order + 1, title, filename: file });
  }

  // Sort by TOC order (number field), then alphabetically for unlisted
  chapters.sort((a, b) => a.number - b.number || a.title.localeCompare(b.title));

  // Re-number sequentially
  chapters.forEach((ch, i) => { ch.number = i + 1; });

  return chapters;
}

export function getChapterBySlug(chapters: ChapterMeta[], slug: string): ChapterMeta | undefined {
  return chapters.find((c) => c.slug === slug);
}

export function getChapterIndex(chapters: ChapterMeta[], slug: string): number {
  return chapters.findIndex((c) => c.slug === slug);
}
