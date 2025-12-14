"use client";
import Image from "next/image";
import { Marquee } from "@/components/ui/marquee";

const m = [  
  "/posters/p3.webp",
  "/posters/p5.webp",
  "/posters/p7.webp",
  "/posters/p9.webp",
  "/posters/p11.webp",
  "/posters/p13.webp",
  "/posters/p15.webp",
  "/posters/p17.webp",
  "/posters/p19.webp",
];

const posters = [
  "/posters/p2.webp",
  "/posters/p4.webp",
  "/posters/p6.webp",
  "/posters/p8.webp",
  "/posters/p10.webp",
  "/posters/p12.webp",
  "/posters/p14.webp",
  "/posters/p16.webp",
  "/posters/p18.webp",
  "/posters/p20.webp",
];

function Poster({ src }) {
  return (
    <div className="w-44 h-fit mx-1 overflow-hidden">
      <Image
        src={src}
        alt="Poster"
        width={100}
        height={100}
        quality={50}
        sizes="183px"
        className="w-44 h-auto my-2 object-cover rounded-xl"
      />
    </div>
  );
}

export default function PosterMarqueeVertical({ alternate = false }) {
  const activePosters = alternate ? m : posters;

  return (
    <div className="relative flex h-full w-full overflow-hidden gap-3">

      {/* Downwards */}
      <Marquee vertical className="[--duration:25s]">
        {activePosters.map((p, i) => (
          <Poster key={i} src={p} />
        ))}
      </Marquee>

      {/* Upwards */}
      <Marquee vertical reverse className="[--duration:25s]">
        {activePosters.map((p, i) => (
          <Poster key={i} src={p} />
        ))}
      </Marquee>

      {/* Fade effect */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black" />
    </div>
  );
}
