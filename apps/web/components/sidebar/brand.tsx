// The Helix wordmark — a small twin-strand mark beside a serif logotype.

import Link from "next/link";

export function HelixMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
      strokeLinecap="round"
    >
      {/* twin strands crossing at the centre */}
      <path
        d="M8 3 C 16 6, 16 9, 12 12 C 8 15, 8 18, 16 21"
        stroke="var(--color-accent)"
        strokeWidth="1.8"
      />
      <path
        d="M16 3 C 8 6, 8 9, 12 12 C 16 15, 16 18, 8 21"
        stroke="var(--color-ink-dim)"
        strokeWidth="1.8"
      />
      {/* rungs */}
      <path
        d="M9.4 5.2 H14.6 M10 18.8 H14"
        stroke="var(--color-ink-faint)"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function Brand() {
  return (
    <Link
      href="/"
      aria-label="Helix — back to home"
      className="group flex items-center gap-2.5 rounded-md outline-none transition-opacity hover:opacity-90"
    >
      <HelixMark className="h-6 w-6 transition-transform duration-200 group-hover:scale-105" />
      <span className="font-display text-[26px] leading-none tracking-tight text-ink">
        Helix
      </span>
    </Link>
  );
}
