interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/**
 * Rehype plugin: replaces mermaid code blocks with a placeholder element
 * that will be hydrated client-side by mermaid.js.
 *
 * Runs after sanitize (like Shiki). Finds `<pre><code class="language-mermaid">`
 * elements and replaces them with a `<div class="mermaid-placeholder">`
 * containing the raw mermaid code as a data attribute.
 */
export function rehypeMermaid() {
  return (tree: HastNode): void => {
    const mermaidBlocks: Array<{ node: HastNode; code: string; parent: HastNode | null; index: number }> = [];

    function findMermaidBlocks(node: HastNode, parent: HastNode | null = null, index: number = -1): void {
      if (
        node.type === 'element' &&
        node.tagName === 'pre' &&
        node.children?.length === 1 &&
        node.children[0].type === 'element' &&
        node.children[0].tagName === 'code' &&
        Array.isArray(node.children[0].properties?.className) &&
        node.children[0].properties.className.includes('language-mermaid')
      ) {
        const codeNode = node.children[0];
        if (codeNode.children?.length === 1 && codeNode.children[0].type === 'text') {
          const code = codeNode.children[0].value ?? '';
          if (code.trim()) {
            mermaidBlocks.push({ node, code, parent, index });
          }
        }
      }

      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          findMermaidBlocks(node.children[i], node, i);
        }
      }
    }

    findMermaidBlocks(tree);

    // Process each mermaid block - replace with placeholder
    for (const { code, parent, index } of mermaidBlocks) {
      // Create placeholder div that client-side mermaid will hydrate
      // Use a code element WITHOUT language-mermaid class to avoid Shiki processing it
      const placeholder: HastNode = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['mermaid-placeholder'],
          'data-mermaid-code': code.trim(),
        },
        children: [
          {
            type: 'element',
            tagName: 'pre',
            properties: {
              className: ['mermaid-placeholder-code'],
            },
            children: [
              {
                type: 'element',
                tagName: 'code',
                properties: {
                  className: ['mermaid-placeholder-code-inner'], // NOT language-mermaid
                },
                children: [
                  {
                    type: 'text',
                    value: code.trim(),
                  },
                ],
              },
            ],
          },
        ],
      };

      // Replace the <pre> node in parent's children with placeholder
      if (parent && index >= 0 && parent.children) {
        parent.children.splice(index, 1, placeholder);
      }
    }
  };
}