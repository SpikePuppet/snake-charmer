import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import ContentArea from "./ContentArea";
import TableOfContents from "./TableOfContents";
import ChapterNav from "./ChapterNav";
import SearchDialog from "./SearchDialog";
import MobileHeader from "./MobileHeader";
import AboutPage from "./AboutPage";
import { useChapter } from "../hooks/useChapter";
import { usePreferences } from "../hooks/usePreferences";
import type { Section } from "../lib/types";

interface LayoutProps {
  version: string;
  section: Section;
  slug: string;
  about: boolean;
  onNavigate: (version: string, section: Section, slug: string) => void;
  onAbout: () => void;
}

export default function Layout({ version, section, slug, about, onNavigate, onAbout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { chapter, loading, error } = useChapter(version, section, slug);
  const { theme, toggleTheme, contentWidth, toggleContentWidth } = usePreferences();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [version, section, slug]);

  const handleNavigate = useCallback(
    (ver: string, sec: Section, sl: string) => {
      onNavigate(ver, sec, sl);
      setSidebarOpen(false);
    },
    [onNavigate]
  );

  return (
    <div className="app-shell">
      <MobileHeader
        section={section}
        onMenuToggle={() => setSidebarOpen((o) => !o)}
        onSearchOpen={() => setSearchOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <Sidebar
        version={version}
        section={section}
        activeSlug={slug}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleNavigate}
      />

      <main className="main-area">
        {about ? (
          <AboutPage />
        ) : (
          <>
            <ContentArea
              chapter={chapter}
              loading={loading}
              error={error}
              version={version}
              section={section}
              onNavigate={handleNavigate}
            />

            {chapter && (
              <ChapterNav
                prev={chapter.prev}
                next={chapter.next}
                version={version}
                section={section}
                onNavigate={handleNavigate}
              />
            )}
          </>
        )}

        <footer className="content-footer">
          <p>An unofficial viewer for the <a href="https://docs.python.org/" target="_blank" rel="noopener noreferrer">Python documentation</a></p>
          <p>Copyright &copy; 2001 <a href="https://www.python.org/psf-landing/" target="_blank" rel="noopener noreferrer">Python Software Foundation</a>; All Rights Reserved <span className="content-footer-sep">&middot;</span> <a href="https://docs.python.org/3/license.html" target="_blank" rel="noopener noreferrer">PSF License</a> <span className="content-footer-sep">&middot;</span> <a href="/about" onClick={(e) => { e.preventDefault(); onAbout(); }}>About</a></p>
        </footer>
      </main>

      {!about && chapter && <TableOfContents toc={chapter.toc} />}

      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        version={version}
        section={section}
        onNavigate={handleNavigate}
      />

      <div className="sidebar-footer">
        <kbd>&#8984;K</kbd>
        <span>Search</span>
        <div className="sidebar-controls">
          <button
            className={`sidebar-control-btn${about ? " sidebar-control-btn--active" : ""}`}
            onClick={onAbout}
            aria-label="About"
            title="About"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
          <button
            className={`sidebar-control-btn${contentWidth === "wide" ? " sidebar-control-btn--active" : ""}`}
            onClick={toggleContentWidth}
            aria-label="Toggle content width"
            title={contentWidth === "wide" ? "Narrow content" : "Wide content"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {contentWidth === "wide" ? (
                <>
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </>
              ) : (
                <>
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </>
              )}
            </svg>
          </button>
          <button
            className="sidebar-control-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
