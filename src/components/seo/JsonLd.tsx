export default function JsonLd({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) return null;

  return (
    <>
      {data.map((item, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}
    </>
  );
}
