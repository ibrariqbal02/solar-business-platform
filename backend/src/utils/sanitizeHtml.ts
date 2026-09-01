/**
 * sanitizeHtml.ts
 *
 * Thin wrapper around the `sanitize-html` package for stripping dangerous
 * markup from rich-text fields before persisting to the database.
 *
 * Allowed elements cover common rich-text output (headings, paragraphs,
 * lists, bold/italic, links, line-breaks, blockquotes, code).
 * All other tags — and every event-handler attribute — are stripped.
 */
import sanitize from "sanitize-html";

const RICH_TEXT_OPTIONS: sanitize.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    code: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  // Force safe rel on links to prevent tab-napping
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: "noopener noreferrer",
      },
    }),
  },
};

/**
 * Sanitize a rich-text string.
 * Returns an empty string when the input is nullish.
 */
export const sanitizeRichText = (value: string | undefined | null): string => {
  if (value == null) return "";
  return sanitize(value, RICH_TEXT_OPTIONS);
};

/**
 * Sanitize an array of rich-text strings (e.g. troubleshootingSteps).
 */
export const sanitizeRichTextArray = (values: string[]): string[] =>
  values.map(sanitizeRichText);
