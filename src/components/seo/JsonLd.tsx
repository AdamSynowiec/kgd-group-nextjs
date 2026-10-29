export default function JsonLd({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) return null;

  return (
    <>
      {/* "<" jako < — tekst z treści (np. tytuł z "</script>") nie zamknie znacznika; dla parsera JSON to ten sam znak. */}
      {data.map((item, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }} />
      ))}
    </>
  );
}
