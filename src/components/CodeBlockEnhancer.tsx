"use client";

import { useEffect } from "react";

export default function CodeBlockEnhancer() {
  useEffect(() => {
    document.querySelectorAll("pre").forEach((preElement) => {
      if (preElement.parentElement?.classList.contains("code-block-wrapper")) {
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper relative group";
      preElement.parentNode?.insertBefore(wrapper, preElement);
      wrapper.appendChild(preElement);

      const codeElement = preElement.querySelector("code");

      const language = codeElement?.className.match(/language-(\w+)/)?.[1];
      if (language) {
        const langLabel = document.createElement("span");
        langLabel.className = "language-label";
        langLabel.innerText = language;
        wrapper.appendChild(langLabel);
      }

      const button = document.createElement("button");
      button.className = "copy-button opacity-0";
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `;

      button.addEventListener("click", () => {
        const code = codeElement?.innerText || "";
        navigator.clipboard.writeText(code).then(() => {
          button.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          `;
          setTimeout(() => {
            button.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            `;
          }, 2000);
        });
      });

      wrapper.appendChild(button);
    });
  }, []);

  return null;
}
