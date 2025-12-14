"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

// LEFT IMAGES
const LEFT_IMAGES = [
  "/onboarding/drishyam_hindi.jpg",
  "/onboarding/bhool_bhulaiya.jpg",
  "/onboarding/john_wick.jpg",
  "/onboarding/sita.jpg",
  "/onboarding/leo_lcu.jpg",
  "/onboarding/phir_hera_pheri.jpg",
  "/onboarding/stree.jpg",
  "/onboarding/the_batman.jpg"
];

// QUOTES FOR RIGHT SIDE (Synced with Left Images)
const QUOTES = [
  { text: '"2nd October ko hum Panaji gaye the, satsang mein..."', author: "- Vijay Salgaonkar" },
  { text: '"Ami Je Tomar, Shudhu Je Tomar..."', author: "- Manjulika" },
  { text: '"Yeah, I\'m thinking I\'m back."', author: "- John Wick" },
  { text: '"I have no one to write a letter to..."', author: "- Ram" },
  { text: '"Bloody Sweet."', author: "- Parthiban" },
  { text: '"Zor Zor Se Bolke Schemey Bata De Sabko!"', author: "- Raju" },
  { text: '"O Stree Kal Aana"', author: "- Chanderi" },
  { text: '"I am Vengeance."', author: "- Batman" }
];

export default function AnimatedSideImages({ position = "left", className }) {
  const content = position === "left" ? LEFT_IMAGES : QUOTES;
  const [index, setIndex] = useState(0);
  const interval = 9000;
  const refTimer = useRef(null);

  useEffect(() => {
    // Sync both sides (no offset) so image matches quote
    const startOffset = 0;

    const init = setTimeout(() => {
      refTimer.current = setInterval(() => {
        setIndex((prev) => (prev + 1) % content.length);
      }, interval);
    }, startOffset);

    return () => {
      clearTimeout(init);
      if (refTimer.current) clearInterval(refTimer.current);
    };
  }, [position, content.length]);

  return (
    <div
      className={`
        hidden xl:flex
        items-center justify-center
        relative h-full w-full
        overflow-hidden
        ${position === "left" ? "mr-auto" : "ml-auto"}
        ${className}
      `}
    >
      {/* Container */}
      <div className="relative h-[80vh] aspect-2/3 flex items-center justify-center">

        {content.map((item, i) => {
          const active = i === index;

          return (
            <div
              key={i}
              className={`
                absolute inset-0 flex items-center justify-center
                transition-opacity duration-2000
                ${active ? "opacity-100" : "opacity-0"}
              `}
            >
              <div
                className={`
                  transition-transform duration-9000 ease-linear
                  ${active ? "scale-105" : "scale-100"}
                  flex flex-col items-center justify-center text-center p-8
                `}
              >
                {position === "left" ? (
                   <Image
                    src={item}
                    alt="poster"
                    width={650}
                    height={1000}
                    className="w-auto h-[80vh] object-contain mask-[radial-gradient(ellipse_at_center,black_85%,transparent_100%)]"
                  />
                ) : (
                  <div className="max-w-md">
                    <h3 className="text-3xl font-bold text-white mb-4 leading-relaxed tracking-wide font-serif italic">
                      {item.text}
                    </h3>
                    <p className="text-purple-400 text-xl font-medium">
                      {item.author}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
