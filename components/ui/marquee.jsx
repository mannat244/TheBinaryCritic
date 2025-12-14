"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Marquee({
  children,
  vertical = false,
  reverse = false,
  pauseOnHover = true,
  className,
  ...props
}) {
  return (
    <div
      {...props}
      className={cn(
        "overflow-hidden relative flex",
        vertical ? "flex-col" : "flex-row",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 animate-marquee",
          vertical ? "flex-col" : "flex-row",
          reverse && "animate-marquee-reverse",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
        style={{
          animationDuration: "var(--duration, 20s)",
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
