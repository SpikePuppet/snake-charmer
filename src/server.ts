import { extractAllContent } from "./content/extractor";
import { discoverVersions } from "./content/versions";
import { SearchIndex } from "./content/search-index";
import { SECTIONS } from "./content/chapters";
import index from "./frontend/index.html";

console.log("Extracting content...");

const allContent = await extractAllContent();
const versions = await discoverVersions();
const defaultVersion = versions.find((v) => v.isDefault)!.version;

const searchIndex = new SearchIndex();
searchIndex.buildFromContent(allContent);

// Build chapter lists per version/section for the chapters API
const chapterLists = new Map<string, { slug: string; number: number; title: string }[]>();
for (const [version, sections] of allContent) {
  for (const [section, chapters] of sections) {
    const key = `${version}/${section}`;
    const list: { slug: string; number: number; title: string }[] = [];
    for (const [slug, ch] of chapters) {
      list.push({ slug: ch.slug, number: ch.number, title: ch.title });
    }
    list.sort((a, b) => a.number - b.number);
    chapterLists.set(key, list);
  }
}

console.log(`Ready. Default version: ${defaultVersion}`);

Bun.serve({
  port: 3000,
  routes: {
    "/": Response.redirect(`/${defaultVersion}/tutorial/appetite`, 302),

    "/api/versions": () => {
      return Response.json(versions);
    },

    "/api/sections": () => {
      return Response.json(SECTIONS.map((s) => ({ id: s.id, label: s.label, defaultSlug: s.defaultSlug })));
    },

    "/api/:version/:section/chapters": (req) => {
      const { version, section } = req.params;
      const key = `${version}/${section}`;
      const list = chapterLists.get(key);
      if (!list) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      return Response.json(list);
    },

    "/api/:version/:section/chapters/:slug": (req) => {
      const { version, section, slug } = req.params;
      const sectionContent = allContent.get(version)?.get(section);
      if (!sectionContent) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      const chapter = sectionContent.get(slug);
      if (!chapter) {
        return Response.json({ error: "Chapter not found" }, { status: 404 });
      }
      return Response.json(chapter);
    },

    "/api/:version/:section/search": (req) => {
      const { version, section } = req.params;
      const url = new URL(req.url);
      const q = url.searchParams.get("q") || "";
      if (!q.trim()) {
        return Response.json([]);
      }
      const results = searchIndex.search(version, section, q);
      return Response.json(results);
    },

    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});
