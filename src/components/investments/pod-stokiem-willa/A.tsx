export default function A({ link, label, target }: { link: string; label: string; target?: string }) {
  return (
    <a className="font-lato font-light text-white text-[24px] hover:underline" href={link} target={target}>
      {label}
    </a>
  );
}
