import React, { useRef, useEffect } from "react";
import type { ChapterData, Section } from "../lib/types";

const SECTION_LABELS: Record<Section, string> = {
  tutorial: "Chapter",
  reference: "Chapter",
  library: "Module",
};

interface ContentAreaProps {
  chapter: ChapterData | null;
  loading: boolean;
  error: string | null;
  version: string;
  section: Section;
  onNavigate: (version: string, section: Section, slug: string) => void;
}

export default function ContentArea({ chapter, loading, error, version, section, onNavigate }: ContentAreaProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href) return;

      const match = href.match(/^\/(\d+\.\d+)\/(tutorial|reference|library)\/([a-z0-9_.]+)(#.*)?$/);
      if (match) {
        e.preventDefault();
        const [, ver, sec, slug, hash] = match;
        onNavigate(ver, sec as Section, slug);
        if (hash) {
          setTimeout(() => {
            const target = document.getElementById(hash.slice(1));
            if (target) target.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
        return;
      }

      if (href.startsWith("#")) {
        e.preventDefault();
        const target = document.getElementById(href.slice(1));
        if (target) target.scrollIntoView({ behavior: "smooth" });
      }
    };

    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [version, section, onNavigate]);

  if (loading) {
    return (
      <div className="content-wrapper">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton skeleton-line" style={{ width: "100%" }} />
        <div className="skeleton skeleton-line" style={{ width: "88%" }} />
        <div className="skeleton skeleton-line" style={{ width: "95%" }} />
        <div className="skeleton skeleton-block" />
        <div className="skeleton skeleton-line" style={{ width: "82%" }} />
        <div className="skeleton skeleton-line" style={{ width: "100%" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!chapter) return null;

  return (
    <div className="content-wrapper">
      <div className="chapter-header">
        {section !== "library" ? (
          <span className="chapter-label">{SECTION_LABELS[section]} {chapter.number}</span>
        ) : (
          <span className="chapter-label">Standard Library</span>
        )}
        <h1 className="chapter-title">{chapter.title}</h1>
      </div>

      <div
        ref={contentRef}
        className="sphinx-content"
        dangerouslySetInnerHTML={{ __html: chapter.html }}
      />
    </div>
  );
}
