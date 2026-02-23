import type { ChapterData } from "./extractor";

export interface SearchResult {
  slug: string;
  title: string;
  number: number;
  excerpt: string;
  score: number;
}

interface IndexEntry {
  slug: string;
  title: string;
  number: number;
  words: string[];
  plainText: string;
}

export class SearchIndex {
  // key: "version/section"
  private entries: Map<string, IndexEntry[]> = new Map();

  buildFromContent(allContent: Map<string, Map<string, Map<string, ChapterData>>>) {
    for (const [version, sections] of allContent) {
      for (const [section, chapters] of sections) {
        const key = `${version}/${section}`;
        const sectionEntries: IndexEntry[] = [];
        for (const [slug, chapter] of chapters) {
          const words = chapter.plainText
            .toLowerCase()
            .split(/\W+/)
            .filter((w) => w.length > 2);
          sectionEntries.push({
            slug,
            title: chapter.title,
            number: chapter.number,
            words,
            plainText: chapter.plainText,
          });
        }
        this.entries.set(key, sectionEntries);
      }
    }
  }

  search(version: string, section: string, query: string, limit = 10): SearchResult[] {
    const key = `${version}/${section}`;
    const entries = this.entries.get(key);
    if (!entries) return [];

    const queryWords = query
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 1);

    if (queryWords.length === 0) return [];

    const results: SearchResult[] = [];

    for (const entry of entries) {
      let score = 0;

      // Title match bonus
      const titleLower = entry.title.toLowerCase();
      for (const qw of queryWords) {
        if (titleLower.includes(qw)) score += 10;
      }

      // Word frequency match
      for (const qw of queryWords) {
        for (const word of entry.words) {
          if (word === qw) score += 2;
          else if (word.startsWith(qw)) score += 1;
        }
      }

      if (score > 0) {
        const excerpt = findExcerpt(entry.plainText, queryWords);
        results.push({
          slug: entry.slug,
          title: entry.title,
          number: entry.number,
          excerpt,
          score,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

function findExcerpt(text: string, queryWords: string[]): string {
  const lower = text.toLowerCase();
  let bestIdx = -1;

  for (const qw of queryWords) {
    const idx = lower.indexOf(qw);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx;
    }
  }

  if (bestIdx === -1) {
    return text.slice(0, 150) + "...";
  }

  const start = Math.max(0, bestIdx - 60);
  const end = Math.min(text.length, bestIdx + 120);
  let excerpt = text.slice(start, end).trim();
  if (start > 0) excerpt = "..." + excerpt;
  if (end < text.length) excerpt = excerpt + "...";
  return excerpt;
}
