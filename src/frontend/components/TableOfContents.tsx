import React from "react";
import type { TocEntry } from "../lib/types";
import { useActiveHeading } from "../hooks/useActiveHeading";

interface TableOfContentsProps {
  toc: TocEntry[];
}

export default function TableOfContents({ toc }: TableOfContentsProps) {
  const ids = toc.map((e) => e.id);
  const activeId = useActiveHeading(ids);

  if (toc.length === 0) return null;

  const minLevel = Math.min(...toc.map((e) => e.level));

  return (
    <aside className="toc">
      <div className="toc-label">On this page</div>
      <nav>
        <ul>
          {toc.map((entry) => {
            const indent = (entry.level - minLevel) * 14;
            const isActive = entry.id === activeId;
            return (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  className={`toc-link ${isActive ? "toc-link--active" : ""}`}
                  style={{ paddingLeft: 12 + indent }}
                >
                  {entry.text}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
