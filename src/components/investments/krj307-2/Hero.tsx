export default function Hero() {
  return (
    <div id="top" className="relative h-svh w-full">
      <video autoPlay loop muted className="absolute top-0 left-0 w-full h-full object-cover">
        <source src="/investments/krj307-2/hero-bg.mp4" type="video/mp4" />
      </video>
      <div className="absolute top-0 left-0 w-full h-full" />
    </div>
  );
}
