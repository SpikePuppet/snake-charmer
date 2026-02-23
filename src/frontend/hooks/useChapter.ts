import { useState, useEffect, useRef } from "react";
import type { ChapterData, Section } from "../lib/types";

const cache = new Map<string, ChapterData>();

export function useChapter(version: string, section: Section, slug: string) {
  const key = `${version}/${section}/${slug}`;
  const [chapter, setChapter] = useState<ChapterData | null>(() => {
    return cache.get(key) || null;
  });
  const [loading, setLoading] = useState(!cache.has(key));
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const key = `${version}/${section}/${slug}`;
    if (cache.has(key)) {
      setChapter(cache.get(key)!);
      setLoading(false);
      setError(null);
      // Prefetch next
      const data = cache.get(key)!;
      if (data.next) prefetch(version, section, data.next.slug);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    fetch(`/api/${version}/${section}/chapters/${slug}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Chapter not found");
        return res.json();
      })
      .then((data: ChapterData) => {
        cache.set(key, data);
        setChapter(data);
        setLoading(false);
        // Prefetch next chapter
        if (data.next) prefetch(version, section, data.next.slug);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [version, section, slug]);

  return { chapter, loading, error };
}

function prefetch(version: string, section: Section, slug: string) {
  const key = `${version}/${section}/${slug}`;
  if (cache.has(key)) return;
  fetch(`/api/${version}/${section}/chapters/${slug}`)
    .then((res) => res.json())
    .then((data: ChapterData) => cache.set(key, data))
    .catch(() => {});
}
