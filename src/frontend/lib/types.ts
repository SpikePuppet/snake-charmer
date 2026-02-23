export type Section = "tutorial" | "reference" | "library";

export interface SectionInfo {
  id: Section;
  label: string;
  defaultSlug: string;
}

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

export interface ChapterListItem {
  slug: string;
  number: number;
  title: string;
}

export interface SearchResult {
  slug: string;
  title: string;
  number: number;
  excerpt: string;
  score: number;
}

export interface VersionInfo {
  version: string;
  isDefault: boolean;
}
