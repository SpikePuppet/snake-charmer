import React from "react";
import type { Section } from "../lib/types";

interface NavTarget {
  slug: string;
  title: string;
  number: number;
}

interface ChapterNavProps {
  prev: NavTarget | null;
  next: NavTarget | null;
  version: string;
  section: Section;
  onNavigate: (version: string, section: Section, slug: string) => void;
}

export default function ChapterNav({ prev, next, version, section, onNavigate }: ChapterNavProps) {
  if (!prev && !next) return null;

  return (
    <div className="chapter-nav">
      <div className="chapter-nav-inner">
        <div className="chapter-nav-card">
          {prev && (
            <button
              onClick={() => onNavigate(version, section, prev.slug)}
              className="nav-card-btn"
            >
              <span className="nav-card-dir">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Previous
              </span>
              <span className="nav-card-title">
                {section !== "library" && <>{prev.number}. </>}{prev.title}
              </span>
            </button>
          )}
        </div>

        <div className="chapter-nav-card">
          {next && (
            <button
              onClick={() => onNavigate(version, section, next.slug)}
              className="nav-card-btn nav-card-btn--next"
            >
              <span className="nav-card-dir">
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </span>
              <span className="nav-card-title">
                {section !== "library" && <>{next.number}. </>}{next.title}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
