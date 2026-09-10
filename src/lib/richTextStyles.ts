/**
 * Wygląd wewnątrz treści "richtext" — współdzielone między powierzchnią
 * edycji (RichTextEditor.tsx, własny edytor bez zależności) a publicznym
 * renderowaniem (src/components/blog/BlogPost.tsx, dangerouslySetInnerHTML),
 * żeby to, co redaktor widzi w panelu, wyglądało tak samo jak na stronie.
 * Zwykłe klasy Tailwind (arbitrary variants) zamiast pluginu
 * @tailwindcss/typography, którego projekt nie ma zainstalowanego.
 */
export const RICH_TEXT_CONTENT_CLASS =
  "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-zinc-900 " +
  "[&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-zinc-900 " +
  "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-zinc-900 " +
  "[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-zinc-900 " +
  "[&_h5]:mt-3 [&_h5]:mb-2 [&_h5]:text-base [&_h5]:font-semibold [&_h5]:text-zinc-900 " +
  "[&_h6]:mt-3 [&_h6]:mb-2 [&_h6]:text-sm [&_h6]:font-semibold [&_h6]:uppercase [&_h6]:tracking-wide [&_h6]:text-zinc-700 " +
  "[&_p]:mb-4 [&_p]:leading-relaxed " +
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 " +
  "[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 " +
  "[&_li]:mb-1 " +
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-600 " +
  "[&_strong]:font-semibold " +
  "[&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em] " +
  "[&_a]:text-blue-600 [&_a]:underline";
