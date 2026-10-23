"use client";

import { useEffect } from "react";

export default function ImageZoomEnhancer() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    function createOverlay(img: HTMLImageElement) {
      const previouslyFocused = document.activeElement as HTMLElement | null;
      const previousOverflow = document.body.style.overflow;

      const overlay = document.createElement("div");
      overlay.className = "image-zoom-overlay";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Image preview");

      const clone = document.createElement("img");
      clone.src = img.src;
      clone.alt = img.alt;
      clone.className = "image-zoom-img";

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "image-zoom-close";
      closeBtn.setAttribute("aria-label", "Close image preview");
      closeBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;

      let closed = false;

      const close = () => {
        if (closed) return;
        closed = true;

        overlay.classList.remove("active");
        document.removeEventListener("keydown", onKeydown);
        document.body.style.overflow = previousOverflow;
        previouslyFocused?.focus?.();

        setTimeout(() => overlay.remove(), 200);
      };

      const onKeydown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
          return;
        }

        if (e.key !== "Tab") return;

        // The close button is the only focusable element in the dialog.
        e.preventDefault();
        closeBtn.focus();
      };

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });

      closeBtn.addEventListener("click", close);
      document.addEventListener("keydown", onKeydown);
      document.body.style.overflow = "hidden";

      overlay.appendChild(clone);
      overlay.appendChild(closeBtn);
      document.body.appendChild(overlay);

      closeBtn.focus();
      requestAnimationFrame(() => overlay.classList.add("active"));
    }

    document.querySelectorAll("article img").forEach((img) => {
      const element = img as HTMLImageElement;
      if (element.dataset.zoomAttached) return;
      element.dataset.zoomAttached = "true";

      element.style.cursor = "zoom-in";
      element.setAttribute("role", "button");
      element.setAttribute("tabindex", "0");
      element.setAttribute(
        "aria-label",
        element.alt ? `Zoom image: ${element.alt}` : "Zoom image"
      );

      const activate = () => createOverlay(element);
      const onKeydown = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      };

      element.addEventListener("click", activate);
      element.addEventListener("keydown", onKeydown);

      cleanups.push(() => {
        element.removeEventListener("click", activate);
        element.removeEventListener("keydown", onKeydown);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}
