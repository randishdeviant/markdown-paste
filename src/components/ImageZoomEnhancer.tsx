"use client";

import { useEffect } from "react";

export default function ImageZoomEnhancer() {
  useEffect(() => {
    function createOverlay(img: HTMLImageElement) {
      const overlay = document.createElement("div");
      overlay.className = "image-zoom-overlay";

      const clone = document.createElement("img");
      clone.src = img.src;
      clone.alt = img.alt;
      clone.className = "image-zoom-img";

      const closeBtn = document.createElement("button");
      closeBtn.className = "image-zoom-close";
      closeBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;

      const close = () => {
        overlay.classList.remove("active");
        setTimeout(() => overlay.remove(), 200);
        document.removeEventListener("keydown", onKeydown);
      };

      const onKeydown = (e: KeyboardEvent) => {
        if (e.key === "Escape") close();
      };

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });

      closeBtn.addEventListener("click", close);
      document.addEventListener("keydown", onKeydown);

      overlay.appendChild(clone);
      overlay.appendChild(closeBtn);
      document.body.appendChild(overlay);

      requestAnimationFrame(() => overlay.classList.add("active"));
    }

    document.querySelectorAll("article img").forEach((img) => {
      if ((img as HTMLElement).dataset.zoomAttached) return;
      (img as HTMLElement).dataset.zoomAttached = "true";

      (img as HTMLElement).style.cursor = "zoom-in";
      img.addEventListener("click", () => createOverlay(img as HTMLImageElement));
    });
  }, []);

  return null;
}
