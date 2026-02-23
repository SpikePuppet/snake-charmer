import React, { useState, useEffect, useRef, useCallback } from "react";
import type { SearchResult, Section } from "../lib/types";

const SECTION_LABELS: Record<Section, string> = {
  tutorial: "tutorial",
  reference: "reference",
  library: "library",
};

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  version: string;
  section: Section;
  onNavigate: (version: string, section: Section, slug: string) => void;
}

export default function SearchDialog({ open, onClose, version, section, onNavigate }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!q.trim()) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/${version}/${section}/search?q=${encodeURIComponent(q)}`);
          const data: SearchResult[] = await res.json();
          setResults(data);
          setSelectedIdx(0);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 200);
    },
    [version, section]
  );

  const handleSelect = (result: SearchResult) => {
    onNavigate(version, section, result.slug);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      handleSelect(results[selectedIdx]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="search-backdrop" onClick={onClose}>
      <div className="search-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="search-input-row">
          <svg className="search-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
            placeholder={`Search ${SECTION_LABELS[section]}...`}
            className="search-input"
          />
          <kbd className="search-esc">ESC</kbd>
        </div>

        {results.length > 0 && (
          <ul className="search-results">
            {results.map((result, idx) => (
              <li key={result.slug}>
                <button
                  onClick={() => handleSelect(result)}
                  className={`search-result-btn ${idx === selectedIdx ? "search-result-btn--selected" : ""}`}
                >
                  <div className="search-result-title">
                    {section !== "library" && (
                      <span className="search-result-num">{result.number}.</span>
                    )}{" "}
                    {result.title}
                  </div>
                  <div className="search-result-excerpt">{result.excerpt}</div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query && !loading && results.length === 0 && (
          <div className="search-empty">No results found for &ldquo;{query}&rdquo;</div>
        )}

        {loading && (
          <div className="search-empty">Searching...</div>
        )}
      </div>
    </div>
  );
}
