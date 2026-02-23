import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import Layout from "./components/Layout";
import type { Section } from "./lib/types";
import "./styles/globals.css";
import "./styles/layout.css";
import "./styles/content.css";
import "./styles/code.css";

function parseRoute(): { version: string; section: Section; slug: string } {
  const path = window.location.pathname;
  const match = path.match(/^\/(\d+\.\d+)\/(tutorial|reference|library)\/([a-z0-9_.]+)/);
  if (match) {
    return { version: match[1], section: match[2] as Section, slug: match[3] };
  }
  return { version: "3.14", section: "tutorial", slug: "appetite" };
}

function App() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const handleNavigate = useCallback((version: string, section: Section, slug: string) => {
    const url = `/${version}/${section}/${slug}`;
    history.pushState(null, "", url);
    setRoute({ version, section, slug });
  }, []);

  return (
    <Layout
      version={route.version}
      section={route.section}
      slug={route.slug}
      onNavigate={handleNavigate}
    />
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
