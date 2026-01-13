/**
 * Preprocesses code blocks using Bun's HTMLRewriter.
 * Replaces JSDOM for better performance.
 */
export async function preprocessCodeBlocks(
  htmlString: string,
): Promise<string> {
  let currentLang = "";

  const rewriter = new HTMLRewriter()
    // 1. Capture the language from the filename span
    .on(".codehilite .filename", {
      text(chunk) {
        currentLang += chunk.text;
      },
      element(el) {
        // We've started the element, but we'll remove it after
        // the text handler finishes (handled automatically by el.remove)
        el.remove();
      },
    })
    // 2. Apply the language class to the <code> tag
    .on(".codehilite pre code", {
      element(el) {
        if (currentLang) {
          const lang = currentLang.trim().toLowerCase();
          el.setAttribute("class", `language-${lang}`);
          // Reset for the next code block
          currentLang = "";
        }
      },
    })
    // 3. Remove the specific span inside <pre>
    .on(".codehilite pre > span", {
      element(el) {
        el.remove();
      },
    });

  const response = new Response(htmlString);
  return await rewriter.transform(response).text();
}

/**
 * Converts <details> blocks to <blockquote> blocks using Bun's HTMLRewriter.
 * This is much safer for "anything can go here" content.
 */
export async function convertDetailsToBlockquote(
  html: string,
): Promise<string> {
  const rewriter = new HTMLRewriter()
    .on("details", {
      element(el) {
        // Change <details> to <blockquote>
        el.tagName = "blockquote";
      },
    })
    .on("summary", {
      element(el) {
        // Change <summary> to <strong>
        el.tagName = "strong";
        // Add a line break after the summary
        el.after("<br>", { html: true });
      },
    });

  // HTMLRewriter works on Responses/Streams
  const response = new Response(html);
  return await rewriter.transform(response).text();
}

// Usage with your sample:
const rawHtml = `your_html_string_here`;
const result = await convertDetailsToBlockquote(rawHtml);
console.log(result);
