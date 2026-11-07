"use client";

import { useEffect } from "react";

/**
 * Client-side component that hydrates mermaid placeholders into SVG diagrams.
 * Loads mermaid.js from CDN and renders all .mermaid-placeholder elements.
 */
export default function MermaidHydrator() {
  useEffect(() => {
    let mounted = true;

    async function hydrateMermaid() {
      // Check if there are any mermaid placeholders
      const placeholders = document.querySelectorAll<HTMLDivElement>(
        ".mermaid-placeholder:not([data-mermaid-rendered])"
      );

      if (placeholders.length === 0) return;

      // Load mermaid from CDN
      const mermaidUrl = "https://cdn.jsdelivr.net/npm/mermaid@12/dist/mermaid.min.js";

      try {
        // Load script if not already loaded
        if (!(window as any).mermaid) {
          await loadScript(mermaidUrl);
        }

        // Initialize mermaid with dark theme matching kanagawa-wave
        const mermaid = (window as any).mermaid;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#2dd4bf",
            primaryTextColor: "#fafafa",
            primaryBorderColor: "#27272a",
            lineColor: "#2dd4bf",
            secondaryColor: "#1c1c1f",
            tertiaryColor: "#141416",
            background: "#0a0a0b",
            mainBkg: "#0a0a0b",
            secondBkg: "#141416",
            tertiaryBkg: "#1c1c1f",
            nodeBorder: "#2dd4bf",
            clusterBkg: "#141416",
            clusterBorder: "#27272a",
            defaultLinkColor: "#2dd4bf",
            titleColor: "#fafafa",
            edgeLabelBackground: "#0a0a0b",
            actorBorder: "#2dd4bf",
            actorBkg: "#141416",
            actorTextColor: "#fafafa",
            actorLineColor: "#2dd4bf",
            signalColor: "#2dd4bf",
            signalTextColor: "#fafafa",
            labelBoxBkgColor: "#141416",
            labelBoxBorderColor: "#27272a",
            labelTextColor: "#fafafa",
            loopTextColor: "#fafafa",
            noteBkgColor: "#1c1c1f",
            noteBorderColor: "#27272a",
            noteTextColor: "#fafafa",
            activationBorderColor: "#2dd4bf",
            activationBkgColor: "#141416",
            sequenceNumberColor: "#fafafa",
            sectionBkgColor: "#141416",
            sectionBkgColor2: "#1c1c1f",
            altSectionBkgColor: "#0a0a0b",
            gridColor: "#27272a",
          },
          securityLevel: "loose",
          maxEdges: 1000,
          logLevel: "fatal",
        });

        // Render each placeholder
        for (const placeholder of placeholders) {
          if (!mounted) return;

          const code = placeholder.dataset.mermaidCode;
          if (!code) continue;

          try {
            const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const { svg } = await mermaid.render(id, code);

            // Replace placeholder content with SVG
            placeholder.innerHTML = svg;
            placeholder.setAttribute("data-mermaid-rendered", "true");
          } catch (err) {
            console.error("[MermaidHydrator] Render error:", err);
            // Keep the code block as fallback
            placeholder.setAttribute("data-mermaid-error", "true");
          }
        }
      } catch (err) {
        console.error("[MermaidHydrator] Failed to load mermaid:", err);
        // Mark all placeholders as errored
        placeholders.forEach((p) => p.setAttribute("data-mermaid-error", "true"));
      }
    }

    hydrateMermaid();

    return () => {
      mounted = false;
    };
  }, []);

  return null; // This component doesn't render anything
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if ((existing as HTMLScriptElement).dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Script load failed")));
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.loaded = "false";

    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

    document.head.appendChild(script);
  });
}