import StarterKit from "@tiptap/starter-kit";

/**
 * StarterKit configured for plain-text-only editing.
 * Disables all rich-text features (bold, italic, heading, lists, etc.)
 * Keeps: document, paragraph, text, history.
 */
export const PlainTextOnly = StarterKit.configure({
  bold: false,
  italic: false,
  strike: false,
  code: false,
  codeBlock: false,
  heading: false,
  blockquote: false,
  bulletList: false,
  orderedList: false,
  listItem: false,
  horizontalRule: false,
  hardBreak: false,
  dropcursor: false,
  gapcursor: false,
});
