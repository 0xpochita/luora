"use client";

import { useEffect, useState } from "react";

/**
 * A moving preview of the app (D1 onorca.dev/docs: the main window looping under the pitch, a
 * caption bar at its foot). A real screen recording of Luora, muted and looped; it plays only on
 * screen, and under reduced motion it waits on its poster with controls instead.
 */
export function DocsVideo({ src, caption }: { src: string; caption: string }) {
  const [still, setStill] = useState(false);
  useEffect(
    () => setStill(matchMedia("(prefers-reduced-motion: reduce)").matches),
    [],
  );
  return (
    <figure className="overflow-hidden rounded-card border border-border bg-[#0b0b0d] shadow-float">
      <video
        src={src}
        poster={src.replace(/\.mp4$/, ".jpg")}
        aria-label={caption}
        muted
        loop
        playsInline
        autoPlay={!still}
        controls={still}
        preload="metadata"
        className="block aspect-[16/9] w-full"
      />
      <figcaption className="border-border border-t px-4 py-2.5 text-[13px] text-dim leading-normal">
        {caption}
      </figcaption>
    </figure>
  );
}
