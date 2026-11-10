"use client";

import { useState } from "react";

// Letters pinned slightly crooked, like notes on a cork board. Static, no animation loop; a click straightens them, another tilts them back.
// ponytail: fixed tilt pattern, repeats every 5 letters
const TILT = [-6, 4, -3, 7, -5];
const LIFT = [0, -1.5, 1, -1, 1.5];

export function PinnedTitle({ text, label }: { text: string; label: string }) {
  const [straight, setStraight] = useState(false);
  return (
    <h1 className="text-2xl font-semibold tracking-tight">
      <button
        onClick={() => setStraight((s) => !s)}
        aria-pressed={straight}
        aria-label={text}
        title={label}
        className="cursor-pointer rounded-md select-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-4 focus-visible:ring-offset-paper focus-visible:outline-none"
      >
        {[...text].map((ch, i) => (
          <span
            key={i}
            aria-hidden
            className="inline-block whitespace-pre transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ transform: straight ? "none" : `rotate(${TILT[i % TILT.length]}deg) translateY(${LIFT[i % LIFT.length]}px)` }}
          >
            {ch}
          </span>
        ))}
      </button>
    </h1>
  );
}
