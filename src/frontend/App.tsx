import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import Layout from "./components/Layout";
import type { Section } from "./lib/types";
import "./styles/globals.css";
import "./styles/layout.css";
import "./styles/content.css";
import "./styles/code.css";
import { PostHogProvider, usePostHog } from "@posthog/react";

function parseRoute(): {
  version: string;
  section: Section;
  slug: string;
  about: boolean;
} {
  const path = window.location.pathname;
  if (path === "/about") {
    return {
      version: "3.14",
      section: "tutorial",
      slug: "appetite",
      about: true,
    };
  }
  const match = path.match(
    /^\/(\d+\.\d+)\/(tutorial|reference|library)\/([a-z0-9_.]+)/,
  );
  if (match) {
    return {
      version: match[1],
      section: match[2] as Section,
      slug: match[3],
      about: false,
    };
  }
  return {
    version: "3.14",
    section: "tutorial",
    slug: "appetite",
    about: false,
  };
}

function App() {
  const [route, setRoute] = useState(parseRoute);
  const posthog = usePostHog();

  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const handleNavigate = useCallback(
    (version: string, section: Section, slug: string) => {
      const url = `/${version}/${section}/${slug}`;
      history.pushState(null, "", url);
      setRoute({ version, section, slug, about: false });
      posthog.capture("chapter_viewed", { version, section, slug });
    },
    [posthog],
  );

  const handleAbout = useCallback(() => {
    history.pushState(null, "", "/about");
    setRoute((prev) => ({ ...prev, about: true }));
  }, []);

  return (
    <Layout
      version={route.version}
      section={route.section}
      slug={route.slug}
      about={route.about}
      onNavigate={handleNavigate}
      onAbout={handleAbout}
    />
  );
}

// Posthog setup credentials
const posthogOptions = {
  api_host: import.meta.env.PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
  cookieless_mode: "always",
} as const;

const root = createRoot(document.getElementById("root")!);
root.render(
  <PostHogProvider
    apiKey={import.meta.env.PUBLIC_POSTHOG_KEY ?? ""}
    options={posthogOptions}
  >
    <App />
  </PostHogProvider>,
);
