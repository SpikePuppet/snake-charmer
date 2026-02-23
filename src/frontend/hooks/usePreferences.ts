import { useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";
type ContentWidth = "normal" | "wide";

interface Preferences {
  theme: Theme;
  toggleTheme: () => void;
  contentWidth: ContentWidth;
  toggleContentWidth: () => void;
}

function getStored<T extends string>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function applyAttributes(theme: Theme, width: ContentWidth) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("data-width", width);
}

export function usePreferences(): Preferences {
  const [theme, setTheme] = useState<Theme>(() => getStored("theme", "dark"));
  const [contentWidth, setContentWidth] = useState<ContentWidth>(() =>
    getStored("content-width", "normal")
  );

  useEffect(() => {
    applyAttributes(theme, contentWidth);
  }, [theme, contentWidth]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  const toggleContentWidth = useCallback(() => {
    setContentWidth((prev) => {
      const next = prev === "normal" ? "wide" : "normal";
      localStorage.setItem("content-width", next);
      return next;
    });
  }, []);

  return { theme, toggleTheme, contentWidth, toggleContentWidth };
}
