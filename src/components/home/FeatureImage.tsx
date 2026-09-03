import Link from "next/link";
import Container from "./Container";
import ImageCard from "./ImageCard";

export default function FeatureImage({ src, title, subtitle, link }: { src: string; title: string; subtitle: string; link?: string }) {
  return (
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-0 bg-[#C9AB8B] w-full md:w-1/2 rounded-tr-[180px] md:rounded-br-[180px] sm:rounded-tr-[360px]" />
      <Container>
        {link ? (
          <Link href={link}>
            <ImageCard src={src} title={title} subtitle={subtitle} />
          </Link>
        ) : (
          <ImageCard src={src} title={title} subtitle={subtitle} />
        )}
      </Container>
    </div>
  );
}
