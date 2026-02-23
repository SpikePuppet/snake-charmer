import React, { useState, useEffect } from "react";
import { usePostHog } from "@posthog/react";
import type { ChapterListItem, VersionInfo, Section, SectionInfo } from "../lib/types";

const SECTIONS: SectionInfo[] = [
  { id: "tutorial", label: "Tutorial", defaultSlug: "appetite" },
  { id: "reference", label: "Language", defaultSlug: "introduction" },
  { id: "library", label: "Library", defaultSlug: "functions" },
];

const SECTION_TITLES: Record<Section, string> = {
  tutorial: "Python Tutorial",
  reference: "Language Reference",
  library: "Standard Library",
};

interface SidebarProps {
  version: string;
  section: Section;
  activeSlug: string;
  open: boolean;
  onClose: () => void;
  onNavigate: (version: string, section: Section, slug: string) => void;
}

export default function Sidebar({ version, section, activeSlug, open, onClose, onNavigate }: SidebarProps) {
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const posthog = usePostHog();

  useEffect(() => {
    fetch("/api/versions")
      .then((r) => r.json())
      .then(setVersions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setChapters([]);
    fetch(`/api/${version}/${section}/chapters`)
      .then((r) => r.json())
      .then(setChapters)
      .catch(() => {});
  }, [version, section]);

  const handleSectionChange = (newSection: Section) => {
    if (newSection === section) return;
    const meta = SECTIONS.find((s) => s.id === newSection)!;
    onNavigate(version, newSection, meta.defaultSlug);
    posthog.capture("section_changed", { version, section: newSection });
  };

  return (
    <>
      {open && (
        <div
          className={`sidebar-overlay ${open ? "sidebar-overlay--visible" : ""}`}
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="sidebar-head">
          <div className="sidebar-brand">
            <div className="sidebar-logo" />
            <span className="sidebar-brand-text">{SECTION_TITLES[section]}</span>
          </div>

          <div className="section-tabs">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`section-tab${s.id === section ? " section-tab--active" : ""}`}
                onClick={() => handleSectionChange(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {versions.length > 0 && (
            <select
              value={version}
              onChange={(e) => onNavigate(e.target.value, section, activeSlug)}
              className="version-select"
            >
              {versions.map((v) => (
                <option key={v.version} value={v.version}>
                  Python {v.version}{v.isDefault ? " (latest)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <nav className="sidebar-nav">
          <ul>
            {chapters.map((ch) => {
              const isActive = ch.slug === activeSlug;
              return (
                <li key={ch.slug}>
                  <button
                    onClick={() => {
                      onNavigate(version, section, ch.slug);
                      onClose();
                    }}
                    className={`chapter-btn ${isActive ? "chapter-btn--active" : ""}`}
                  >
                    {section !== "library" && (
                      <span className="chapter-num">{ch.number}.</span>
                    )}
                    {ch.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
