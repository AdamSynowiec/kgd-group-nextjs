import type { EditableValue } from "@/lib/editable";

/** Kształt treści wpisu bloga — patrz COLLECTIONS.blog.blankContent w src/lib/collections/registry.ts. Tylko dla szablonów publicznych (src/components/blog/). */
export type BlogPostContent = {
  slug: string;
  publishedAt: string | null;
  title: EditableValue<string>;
  excerpt: EditableValue<string>;
  coverImage: EditableValue<string>;
  author: EditableValue<string>;
  body: EditableValue<string>;
  tags: EditableValue<string[]>;
  seo?: { title?: EditableValue<string> | string; description?: EditableValue<string> | string };
};
