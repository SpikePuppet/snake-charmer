import React from "react";

export default function AboutPage() {
  return (
    <div className="content-wrapper">
      <header className="chapter-header">
        <h1 className="chapter-title">About</h1>
      </header>

      <div className="about-body">
        <p>
          Snake Charmer is an unofficial viewer for the{" "}
          <a href="https://docs.python.org/" target="_blank" rel="noopener noreferrer">
            official Python documentation
          </a>
          , built with a focus on clean, readable presentation.
        </p>

        <p>
          This is a fun project &mdash; I&rsquo;ll endeavour to keep it up to date as new
          Python versions are released.
        </p>

        <h2>Built by</h2>
        <p>
          <strong>Rhys Johns</strong>
          <br />
          <a href="https://spikepuppet.io" target="_blank" rel="noopener noreferrer">
            spikepuppet.io
          </a>
          <br />
          <a href="mailto:rhysjohnsdev@gmail.com">rhysjohnsdev@gmail.com</a>
        </p>

        <h2>License</h2>
        <p>
          The Python documentation is copyright the{" "}
          <a
            href="https://www.python.org/psf-landing/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Python Software Foundation
          </a>{" "}
          and used under the{" "}
          <a
            href="https://docs.python.org/3/license.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            PSF License
          </a>
          .
        </p>
      </div>
    </div>
  );
}
